# Feedback: building CivicProof with `stacksdapp`

**Project:** CivicProof, a public board where people report community problems (broken streetlights, damaged roads, overflowing bins, water supply issues) and follow whether each one is acknowledged or resolved.
**Tooling:** `stacksdapp` 0.2.3 (Scaffold Stacks), Clarinet, Clarity 6 / epoch 4.0, Next.js 15 frontend
**Network:** Stacks testnet
**Contract:** `ST36HDR695W2N2253W1APXC6QZK4RH0A4FFWJ70QJ.civic-proof`
**Deploy tx:** [`0x6cc23d62…b68abf5`](https://explorer.hiro.so/txid/6cc23d623730bc5c9c39a8faaa2ab507706020479728410e6b5ce316bb68abf5?chain=testnet), confirmed at block 806235

---

## Summary

I went from an empty scaffold to a deployed contract with a custom frontend in a single session, building the app with an AI coding agent. The scaffold handled the parts that usually take the longest on a Stacks project: deploy scripts, TypeScript bindings, wallet wiring and transaction-status polling. That left the session for the contract logic and the product UI.

The bundled agent skill (`.cursor/skills/scaffold-stacks/`) made a big difference. The agent read it first and followed the workflow it describes (`check → generate → test → deploy → dev`) without me having to explain the toolchain.

---

## The path from zero to deployed

| Step | Command | What it did for me |
|------|---------|--------------------|
| 1. Scaffold | `stacksdapp init` (pre-done) | Monorepo with `contracts/` + `frontend/`, git hooks, agent skill, `AGENTS.md` |
| 2. Swap the sample contract | `stacksdapp remove counter`, `stacksdapp add civic-proof` | Created the `.clar` file and test file, updated `Clarinet.toml` with the right Clarity version/epoch, regenerated bindings |
| 3. Type-check | `stacksdapp check` | Clarinet type-check + `check_checker`; caught a non-ASCII character in a comment on the first run |
| 4. Test | `stacksdapp test` | Ran Vitest + simnet for contracts *and* the frontend tests in one command (11 contract tests, no Docker) |
| 5. Preview deploy | `stacksdapp deploy --network testnet --dry-run` | Fee estimate (≈0.164 STX) and a conflict check before anything was broadcast |
| 6. Deploy | `stacksdapp deploy --network testnet --yes` | Broadcast in ~18s, wrote `deployments.json`, regenerated `contracts.ts` / `hooks.ts`, printed the explorer link |
| 7. Run the app | `stacksdapp dev --network testnet` | Started Next.js against testnet with `.env.local` set to match |

---

## What helped most

### 1. Generated hooks I could build a real UI on
Each contract function got a typed React hook (`useCivicProof_ReportIssue`, `useCivicProof_GetIssueHistory`, …). Two things made them good enough to use in production code, not just the debug panel:

- **Public-call hooks track the transaction for you.** `txid`, `txStatus`, `txStatusError` and `explorerUrl` are built in, so I didn't write any code to poll a pending transaction. I added a small `useOnTxSuccess` helper so the board refreshes when a transaction confirms.
- **Read-only hooks return the decoded value from `call()`.** Responses arrive as `{ ok, value }`, with uints already converted to `bigint` and tuples, lists and optionals unwrapped. Because `call()` returns its result, one hook instance could fetch several pages in parallel.

### 2. Deploy is one command, and the bindings stay in sync
Deploying updated `deployments.json` and the bindings automatically, so the frontend pointed at the new contract without any manual copy-pasting of contract IDs. Having `--dry-run` before a real broadcast gave me confidence.

### 3. Testnet-first without Docker
The default workflow sends you to testnet rather than a local devnet, which meant no Docker setup and no PoX/epoch boot problems. Simnet tests covered contract logic locally; testnet covered the real network.

### 4. Clarity 6 defaults are handled
`stacksdapp add` set `clarity_version = 6` and `epoch = "4.0"` together, which avoids the version/epoch mismatch the docs warn about.

### 5. The agent skill is the documentation
The skill files were specific enough to stop common mistakes before they happened, for example:
- "Never `BigInt(hook.data)`; unwrap `{ ok, value }` first"
- "After a testnet deploy, run `dev --network testnet`, not bare `dev`"
- "Guard read-only calls on deploy + network + valid principal"

The frontend follows each of these, and I never hit the `Failed to fetch` or `BigInt([object Object])` errors they describe.

### 6. The debug UI stays useful
`DebugContracts` stayed on its own `/debug` route as a raw interface to every function, which helped while I built the custom UI.

---

## Friction points / suggestions

These are small, and worth sharing with the maintainers:

1. **`stacksdapp remove` has no `--yes` flag.** `stacksdapp remove counter --yes` failed with a usage error; I had to pipe `y` in. A `--yes` flag that matches `deploy` would help scripts and agents.
2. **`stacksdapp check` asks for confirmation.** It printed a deployment-plan diff with `Overwrite? [Y/n]` the first time. For a type-check command, a non-interactive default (or respecting `--yes`) would be smoother in CI and agent sessions.
3. **The non-ASCII error is easy to hit.** An em dash in a *comment* failed the check (`illegal non-ASCII character`). A hint in the CLI output, or a line in `clarity-language.md`, would save a round trip.
4. **Spinner output floods non-TTY logs.** In captured output, spinners print hundreds of redraw frames. Detecting a non-TTY and printing plain lines (or using `--quiet` progress) would make logs readable.
5. **The test template calls a function the contract template may not keep.** The `add` test calls `get-info`; once you replace the contract body, that test fails until it's rewritten. Fine for a template, but a comment saying so would help.
6. **Mnemonic handling for testnet.** `settings/Testnet.toml` is tracked by git, so I had to put the placeholder back by hand after deploying. Reading the mnemonic from an environment variable (or a git-ignored `Testnet.local.toml`) would make accidental commits much less likely.
7. **Unchecked-data warnings.** `check_checker` flags every free-text argument (notes, titles) as "potentially unchecked data." That's correct, but noisy for apps where free text is the point. Documenting how to silence it per line would help.

---

## Result

- **Contract:** reports, one-per-address community confirmations, steward-gated acknowledgement, resolve/reopen by the reporter or a steward, and a status history that can't be edited, all covered by 11 passing tests.
- **Frontend:** a custom board with stats, filters, search, a report form, a detail view with the on-chain timeline, role-aware actions and an owner-only steward panel, all built on the generated hooks.
- **On chain:** deployed and confirmed on Stacks testnet. Going to mainnet uses the same workflow with `--network mainnet`, after an audit and a real (non-disposable) key.

**Verdict:** `stacksdapp` took me from an empty scaffold to a working, deployed dApp in one session. I spent the time on the product instead of the plumbing.
