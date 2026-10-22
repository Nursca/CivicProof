# CivicProof

A public board where anyone can report a community problem (a broken streetlight, a damaged road, an overflowing waste bin, a water supply issue) and track whether it has been **acknowledged** or **resolved**.

Every report, confirmation and status change is written to the Stacks blockchain, so the record is public and cannot be quietly edited or deleted.

> **What the blockchain does and doesn't prove.** CivicProof gives a public, tamper-resistant record of *who* said *what* and *when*. It does **not** verify that a report is true, and a "resolved" status is a claim by the reporter or a steward. It is not proof that a government agency acted.

Built with [Scaffold Stacks](https://scaffoldstacks.mintlify.app/) (`stacksdapp`), Clarity 6 and Next.js.

---

## Live deployment (testnet)

| | |
|---|---|
| Contract | `ST36HDR695W2N2253W1APXC6QZK4RH0A4FFWJ70QJ.civic-proof` |
| Deploy tx | [`0x6cc23d62…b68abf5`](https://explorer.hiro.so/txid/6cc23d623730bc5c9c39a8faaa2ab507706020479728410e6b5ce316bb68abf5?chain=testnet) |
| Network | Stacks testnet |

---

## How it works

1. **Report:** anyone with a Stacks wallet posts a problem with a title, location, optional details and a category (streetlight, road, waste, water, other).
2. **Confirm:** neighbours tap **"I see this too"**. Each address can confirm a report once, and you can't confirm your own.
3. **Acknowledge:** a **steward** (e.g. a ward rep, community organiser or utility liaison) marks the report as seen, with a public note.
4. **Resolve / reopen:** the reporter or a steward marks it fixed, or reopens it if the problem returns.

Every status change is added to the report's history along with the address that made it, the block height and a note.

### Statuses

| Status | Meaning | Who can set it |
|--------|---------|----------------|
| Open | Reported, awaiting acknowledgement | Anyone (by reporting); reporter or steward (by reopening) |
| Acknowledged | A steward has seen it | Stewards only, from Open |
| Resolved | Marked fixed on the record | Reporter or steward, from Open or Acknowledged |

The contract deployer is the **owner**, is a steward from the start, and can grant or revoke steward rights.

---

## Project structure

```
CivicProof/
├── contracts/
│   ├── contracts/civic-proof.clar     # the smart contract
│   ├── tests/civic-proof.test.ts      # Vitest + Clarinet simnet tests
│   ├── Clarinet.toml
│   └── settings/                      # deployer settings (never commit real mnemonics)
├── frontend/
│   └── src/
│       ├── app/                       # Next.js pages (/ board, /debug raw contract UI)
│       ├── components/civic/          # custom board UI built on generated hooks
│       ├── lib/civic.ts               # constants, parsers, helpers
│       └── generated/                 # AUTO-GENERATED bindings & hooks; don't edit
├── stacksdapp.toml
└── feedback.md                        # notes on the stacksdapp workflow
```

---

## Contract API

**Public functions**

| Function | Args | Notes |
|----------|------|-------|
| `report-issue` | `title (string-utf8 80)`, `description (string-utf8 500)`, `location (string-utf8 120)`, `category uint` (1–5) | Returns the new issue id |
| `confirm-issue` | `issue-id` | One per address; not the reporter |
| `acknowledge-issue` | `issue-id`, `note (string-utf8 200)` | Stewards only; Open → Acknowledged |
| `resolve-issue` | `issue-id`, `note` | Reporter or steward; → Resolved |
| `reopen-issue` | `issue-id`, `note` | Reporter or steward; Resolved → Open |
| `set-steward` | `who principal`, `enabled bool` | Owner only |

**Read-only functions:** `get-issue-count`, `get-issue`, `get-issues-page (start-id)` (20 per page), `get-issue-history (issue-id)`, `get-update`, `has-confirmed`, `is-steward`, `get-owner`, `get-block-height`.

**Error codes**

| Code | Meaning |
|------|---------|
| `u400` | Invalid category |
| `u401` | Unauthorized |
| `u402` | Empty title |
| `u403` | Empty location |
| `u404` | Issue not found |
| `u409` | Invalid status transition |
| `u410` | Already confirmed |
| `u411` | Can't confirm your own report |
| `u412` | History full (20 updates per issue) |

---

## Getting started

### Prerequisites

- [`stacksdapp`](https://scaffoldstacks.mintlify.app/) CLI, Node.js, Clarinet. Run `stacksdapp doctor` to verify.
- A Stacks wallet ([Leather](https://leather.io/) or [Xverse](https://www.xverse.app/)) set to **testnet**, with some testnet STX from the [faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet).

### Run the frontend against the deployed contract

```bash
git clone https://github.com/Nursca/CivicProof.git
cd CivicProof
cd contracts && npm install && cd ../frontend && npm install && cd ..
stacksdapp dev --network testnet
```

Open http://localhost:3000 and connect your wallet.

### Develop the contract

```bash
stacksdapp check      # type-check Clarity
stacksdapp test       # contract + frontend tests
stacksdapp generate   # regenerate TypeScript bindings & hooks
```

### Deploy your own copy

1. Put a testnet deployer mnemonic in `contracts/settings/Testnet.toml`. **Never commit it**; the repo's pre-commit hook blocks likely seed phrases.
2. Preview, then deploy:

   ```bash
   stacksdapp deploy --network testnet --dry-run
   stacksdapp deploy --network testnet --yes
   ```

   This updates `frontend/src/generated/deployments.json` and the bindings automatically.
3. Restore the placeholder mnemonic, then run `stacksdapp dev --network testnet`.

The deploying address becomes the board's owner and first steward.

---

## Limitations

- **No verification:** the board records claims. It can't confirm a report is accurate or that a fix happened.
- **History cap:** each report can hold up to 20 status entries.
- **Spam:** anyone with a wallet can post; transaction fees are the only deterrent.
- **Privacy:** everything written is public and permanent. Don't include personal information.
- **Not audited:** this is a testnet deployment. Get an audit before any mainnet use.

## License

[MIT](LICENSE)
