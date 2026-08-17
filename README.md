# Prove It

**Crowdfunded competitive challenges with trustless semantic adjudication.**

Anyone can put money behind an outcome described in plain English. Anyone can attempt it. GenLayer decides who actually proved it.

Prove It combines four primitives in one enforceable lifecycle:

1. **Crowdfunding** — creators and supporters fund an onchain prize pool.
2. **Competing submissions** — builders submit public evidence before a deadline.
3. **Semantic verification** — GenLayer validators judge immutable snapshots against a creator-confirmed weighted rubric.
4. **Automatic settlement** — deterministic ranking produces finality-gated payouts or contributor refunds.

This is not a generic “AI judges a bounty” wrapper. The contract formalizes ambiguous rules before funding, freezes the judging policy, enforces content-pinned evidence, uses two purpose-built consensus validators plus a calibration anchor, and relies on GenLayer’s native appeal mechanism.

## Product flow

```text
Describe outcome → consensus proposes rubric → creator confirms → funding opens
→ competitors submit immutable proof → consensus scores each rubric item
→ native appeal window → finality → payout or refunds
```

The frontend includes a marketplace, a two-transaction challenge wizard, wallet funding, immutable snapshot validation and hashing, proof submission, permissionless judging, refund claims, a rubric-grounded verdict board, and native appeal controls.

## Contract

`contracts/challenge_pool.py` exposes:

| Method | Purpose |
| --- | --- |
| `draft_challenge` | Run nondeterministic rubric consensus; store DRAFT or NEEDS_REVISION |
| `confirm_challenge` | Creator accepts the checklist and seeds the payable pool |
| `fund` | Crowdfund an open challenge |
| `submit_proof` | Commit source provenance, content-pinned snapshot, and digest |
| `judge` | Run exact per-item semantic consensus and deterministic settlement |
| `claim_refund` | Return a contributor’s funds when no proof passes |

Settlement modes are `FIRST_PASS`, `BEST_AT_DEADLINE`, and `SPLIT`. The contract never implements its own dispute admin. Appeals use the protocol transaction that produced the verdict.

Read [consensus design](docs/CONSENSUS.md), [security model](docs/SECURITY.md), and [test coverage](docs/TESTING.md).

## Run locally

Requirements: Node 22+, Python 3.12, a browser wallet, and Bradbury test GEN.

```bash
npm ci
pip install -r requirements-dev.txt
cp .env.example .env.local
npm run dev
```

`NEXT_PUBLIC_CHALLENGE_POOL_ADDRESS` is optional. If it is unset, the app uses the address recorded in `deployment/bradbury.json`. Users sign transactions through their own wallet.

## Verify

```bash
npm run typecheck
npm run lint
npm test
pytest -q
genvm-lint check contracts/challenge_pool.py
```

## Bradbury deployment

The public deployment record is stored in `deployment/bradbury.json`. The frontend uses the contract address from that file by default.

## Network

- GenLayer Bradbury (`testnet_bradbury`)
- Consensus RPC: `https://rpc-bradbury.genlayer.com`
- EVM chain RPC: `https://rpc.testnet-chain.genlayer.com`
- Chain ID: `4221`
- Current ChallengePool address and deployment transaction: `deployment/bradbury.json`

## Honest limits

The system only judges public evidence and cannot guarantee that evidence represents the whole real-world truth. A compromised content publisher can publish misleading evidence. Content-addressing prevents post-submission mutation, not deception at creation time. Unavailable evidence is marked `UNVERIFIABLE`, and users should appeal materially wrong accepted verdicts during the protocol finality window.

MIT licensed.
