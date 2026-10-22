;; civic-proof.clar
;; A public board for community problem reports (broken streetlights, damaged
;; roads, overflowing bins, water supply issues, ...).
;;
;; The chain gives a public, tamper-resistant record of WHO said WHAT and WHEN:
;; the original report, community confirmations, and every status change.
;; It does NOT prove a report is true, nor that any agency acted on it.

;; ---------------------------------------------------------------------------
;; Constants
;; ---------------------------------------------------------------------------

(define-constant CONTRACT_OWNER tx-sender)

(define-constant STATUS_OPEN u0)
(define-constant STATUS_ACKNOWLEDGED u1)
(define-constant STATUS_RESOLVED u2)

;; Categories: 1 streetlight, 2 road, 3 waste, 4 water, 5 other
(define-constant CATEGORY_MIN u1)
(define-constant CATEGORY_MAX u5)

(define-constant ERR_UNAUTHORIZED (err u401))
(define-constant ERR_NOT_FOUND (err u404))
(define-constant ERR_INVALID_CATEGORY (err u400))
(define-constant ERR_EMPTY_TITLE (err u402))
(define-constant ERR_EMPTY_LOCATION (err u403))
(define-constant ERR_INVALID_TRANSITION (err u409))
(define-constant ERR_ALREADY_CONFIRMED (err u410))
(define-constant ERR_OWN_REPORT (err u411))
(define-constant ERR_HISTORY_FULL (err u412))

;; Status updates per issue are capped so history can be read in one call.
(define-constant MAX_UPDATES u20)
(define-constant PAGE_OFFSETS (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19))

;; ---------------------------------------------------------------------------
;; Storage
;; ---------------------------------------------------------------------------

(define-data-var issue-count uint u0)

(define-map issues
  uint
  {
    reporter: principal,
    title: (string-utf8 80),
    description: (string-utf8 500),
    location: (string-utf8 120),
    category: uint,
    status: uint,
    confirmations: uint,
    created-at: uint,
    updated-at: uint,
    update-count: uint,
  }
)

;; Append-only status history. Index 0 is the original report.
(define-map issue-updates
  { issue-id: uint, index: uint }
  {
    status: uint,
    actor: principal,
    note: (string-utf8 200),
    block: uint,
  }
)

;; "I see this too" - one per principal per issue.
(define-map confirmations { issue-id: uint, who: principal } bool)

;; Stewards can acknowledge reports (e.g. community organisers, ward reps).
(define-map stewards principal bool)
(map-set stewards CONTRACT_OWNER true)

;; ---------------------------------------------------------------------------
;; Private helpers
;; ---------------------------------------------------------------------------

(define-private (is-steward-p (who principal))
  (default-to false (map-get? stewards who)))

(define-private (push-update (issue-id uint) (issue {
    reporter: principal,
    title: (string-utf8 80),
    description: (string-utf8 500),
    location: (string-utf8 120),
    category: uint,
    status: uint,
    confirmations: uint,
    created-at: uint,
    updated-at: uint,
    update-count: uint,
  }) (new-status uint) (note (string-utf8 200)))
  (let ((idx (get update-count issue)))
    (asserts! (< idx MAX_UPDATES) ERR_HISTORY_FULL)
    (map-set issue-updates { issue-id: issue-id, index: idx }
      { status: new-status, actor: tx-sender, note: note, block: stacks-block-height })
    (map-set issues issue-id
      (merge issue {
        status: new-status,
        updated-at: stacks-block-height,
        update-count: (+ idx u1),
      }))
    (print { event: "status-changed", issue-id: issue-id, status: new-status, actor: tx-sender })
    (ok new-status)))

;; ---------------------------------------------------------------------------
;; Public functions
;; ---------------------------------------------------------------------------

(define-public (report-issue
    (title (string-utf8 80))
    (description (string-utf8 500))
    (location (string-utf8 120))
    (category uint))
  (let ((id (+ (var-get issue-count) u1)))
    (asserts! (> (len title) u0) ERR_EMPTY_TITLE)
    (asserts! (> (len location) u0) ERR_EMPTY_LOCATION)
    (asserts! (and (>= category CATEGORY_MIN) (<= category CATEGORY_MAX)) ERR_INVALID_CATEGORY)
    (map-set issues id {
      reporter: tx-sender,
      title: title,
      description: description,
      location: location,
      category: category,
      status: STATUS_OPEN,
      confirmations: u0,
      created-at: stacks-block-height,
      updated-at: stacks-block-height,
      update-count: u1,
    })
    (map-set issue-updates { issue-id: id, index: u0 }
      { status: STATUS_OPEN, actor: tx-sender, note: u"Reported", block: stacks-block-height })
    (var-set issue-count id)
    (print { event: "issue-reported", issue-id: id, reporter: tx-sender, category: category })
    (ok id)))

;; Another community member vouches that they see the same problem.
(define-public (confirm-issue (issue-id uint))
  (let ((issue (unwrap! (map-get? issues issue-id) ERR_NOT_FOUND)))
    (asserts! (not (is-eq tx-sender (get reporter issue))) ERR_OWN_REPORT)
    (asserts! (is-none (map-get? confirmations { issue-id: issue-id, who: tx-sender })) ERR_ALREADY_CONFIRMED)
    (map-set confirmations { issue-id: issue-id, who: tx-sender } true)
    (map-set issues issue-id (merge issue { confirmations: (+ (get confirmations issue) u1) }))
    (ok (+ (get confirmations issue) u1))))

;; Steward only: open -> acknowledged.
(define-public (acknowledge-issue (issue-id uint) (note (string-utf8 200)))
  (let ((issue (unwrap! (map-get? issues issue-id) ERR_NOT_FOUND)))
    (asserts! (is-steward-p tx-sender) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status issue) STATUS_OPEN) ERR_INVALID_TRANSITION)
    (push-update issue-id issue STATUS_ACKNOWLEDGED note)))

;; Steward or original reporter: open/acknowledged -> resolved.
(define-public (resolve-issue (issue-id uint) (note (string-utf8 200)))
  (let ((issue (unwrap! (map-get? issues issue-id) ERR_NOT_FOUND)))
    (asserts! (or (is-steward-p tx-sender) (is-eq tx-sender (get reporter issue))) ERR_UNAUTHORIZED)
    (asserts! (not (is-eq (get status issue) STATUS_RESOLVED)) ERR_INVALID_TRANSITION)
    (push-update issue-id issue STATUS_RESOLVED note)))

;; Steward or original reporter: resolved -> open (the problem came back).
(define-public (reopen-issue (issue-id uint) (note (string-utf8 200)))
  (let ((issue (unwrap! (map-get? issues issue-id) ERR_NOT_FOUND)))
    (asserts! (or (is-steward-p tx-sender) (is-eq tx-sender (get reporter issue))) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status issue) STATUS_RESOLVED) ERR_INVALID_TRANSITION)
    (push-update issue-id issue STATUS_OPEN note)))

(define-public (set-steward (who principal) (enabled bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (map-set stewards who enabled)
    (print { event: "steward-set", who: who, enabled: enabled })
    (ok enabled)))

;; ---------------------------------------------------------------------------
;; Read-only functions
;; ---------------------------------------------------------------------------

(define-read-only (get-issue-count)
  (ok (var-get issue-count)))

(define-read-only (get-issue (issue-id uint))
  (ok (map-get? issues issue-id)))

(define-read-only (get-update (issue-id uint) (index uint))
  (ok (map-get? issue-updates { issue-id: issue-id, index: index })))

(define-read-only (is-steward (who principal))
  (ok (is-steward-p who)))

(define-read-only (has-confirmed (issue-id uint) (who principal))
  (ok (is-some (map-get? confirmations { issue-id: issue-id, who: who }))))

(define-read-only (get-owner)
  (ok CONTRACT_OWNER))

(define-read-only (get-block-height)
  (ok stacks-block-height))

;; Up to 20 issues starting at `start-id` (inclusive). Missing ids are skipped.
(define-private (issue-at (offset uint) (acc { start: uint, out: (list 20 { id: uint, issue: {
    reporter: principal,
    title: (string-utf8 80),
    description: (string-utf8 500),
    location: (string-utf8 120),
    category: uint,
    status: uint,
    confirmations: uint,
    created-at: uint,
    updated-at: uint,
    update-count: uint,
  } }) }))
  (let ((id (+ (get start acc) offset)))
    (match (map-get? issues id)
      issue (merge acc { out: (unwrap-panic (as-max-len? (append (get out acc) { id: id, issue: issue }) u20)) })
      acc)))

(define-read-only (get-issues-page (start-id uint))
  (ok (get out (fold issue-at PAGE_OFFSETS { start: start-id, out: (list) }))))

;; Full status history for one issue (max 20 entries).
(define-private (update-at (offset uint) (acc { issue-id: uint, out: (list 20 {
    status: uint,
    actor: principal,
    note: (string-utf8 200),
    block: uint,
  }) }))
  (match (map-get? issue-updates { issue-id: (get issue-id acc), index: offset })
    entry (merge acc { out: (unwrap-panic (as-max-len? (append (get out acc) entry) u20)) })
    acc))

(define-read-only (get-issue-history (issue-id uint))
  (ok (get out (fold update-at PAGE_OFFSETS { issue-id: issue-id, out: (list) }))))
