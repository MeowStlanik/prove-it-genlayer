# Prove It

**Crowdfunded competitive challenges with trustless semantic adjudication.**

Anyone can put money behind an outcome described in plain English. Anyone can attempt it. GenLayer decides who actually proved it.

Prove It combines four primitives in one enforceable lifecycle:

1. **Crowdfunding** — creators and supporters fund an onchain prize pool.
2. **Competing submissions** — builders submit public evidence before a deadline.
3. **Semantic verification** — GenLayer validators judge immutable snapshots against a creator-confirmed weighted rubric.
4. **Safe settlement** — deterministic ranking produces finality-gated payouts only from a complete assessment, while terminal failures/expiry open contributor refunds.

The frontend no longer contains demo challenge/submission/verdict records. Marketplace cards, detail pages, profiles and verdict views are hydrated from `ChallengePool` view methods, including the onchain challenge/submission indexes added in v2.

## Product flow

```text
Describe outcome → consensus proposes rubric → creator confirms → funding opens
→ competitors submit immutable proof → consensus scores each rubric item
→ complete verdict OR retryable evidence failure → native appeal/finality
→ payout, definitive refund, or bounded expiry refund
```

## Settlement safety

- Every generated rubric must contain at least one `REQUIRED` criterion.
- A submission is payout-eligible only when **all REQUIRED criteria are `MET`** and its weighted score reaches `min_score`.
- If any real submission contains an `UNVERIFIABLE` item, adjudication enters `RETRYABLE`; the contract sends no payout and opens no refund.
- A failed `FIRST_PASS` attempt before the deadline does not close the challenge or unlock refunds; later competitors can still submit.
- Empty expired challenges become refundable after the deadline. Challenges with submissions have a seven-day adjudication grace period before permissionless expiry can open refunds.
- `claim_refund` defensively rejects any state containing a payout.
- Payout external messages execute only when the verdict transaction finalizes, preserving GenLayer's native appeal path.

## Contract

`contracts/challenge_pool.py` exposes:

| Method | Purpose |
| --- | --- |
| `draft_challenge` | Run nondeterministic rubric consensus; store `DRAFT` or `NEEDS_REVISION` |
| `confirm_challenge` | Creator accepts the checklist and seeds the payable pool |
| `fund` | Crowdfund an open/retryable challenge before its deadline |
| `submit_proof` | Commit source provenance, content-pinned snapshot, and digest |
| `judge` | Run exact per-item semantic consensus and deterministic safe settlement |
| `expire_challenge` | Open refunds only after the contract's deadline/grace rules permit it |
| `claim_refund` | Return a contributor's funds from a safe refundable state |
| `get_challenge_ids` | Enumerate challenges for contract-derived UI hydration |
| `get_submission_ids` | Enumerate a challenge's submissions for contract-derived UI hydration |
| `get_challenge` / `get_submission` | Read canonical challenge, verdict and proof state |

Settlement modes are `FIRST_PASS`, `BEST_AT_DEADLINE`, and `SPLIT`. There is no application-level dispute admin. Appeals use the protocol transaction that produced the verdict.

Read [consensus design](docs/CONSENSUS.md), [security model](docs/SECURITY.md), and [test coverage](docs/TESTING.md).

## Run locally

Requirements: Node 22+, Python 3.12, a browser wallet, and Bradbury test GEN.

```bash
npm ci
pip install -r requirements-dev.txt
cp .env.example .env.local
```

### Bradbury deployment

The bundled `deployment/bradbury.json` points to the current ChallengePool v2 deployment on Bradbury.

The frontend uses that bundled v2 address automatically. To override it manually, set:

```bash
NEXT_PUBLIC_CHALLENGE_POOL_ADDRESS=0xYOUR_V2_ADDRESS
```

Then run:

```bash
npm run dev
```

ChallengePool v2 includes contract-derived challenge/submission indexes, REQUIRED criteria enforcement, RETRYABLE adjudication state, and safe expiry/refund handling.

## Verify

```bash
npm run typecheck
npm run lint
npm test
pytest -q
genvm-lint check contracts/challenge_pool.py
```

## Network

- GenLayer Bradbury (`testnet_bradbury`)
- Consensus RPC: `https://rpc-bradbury.genlayer.com`
- EVM chain RPC: `https://rpc.testnet-chain.genlayer.com`
- Chain ID: `4221`

## Honest limits

The system only judges public evidence and cannot guarantee that evidence represents the whole real-world truth. A compromised content publisher can publish misleading evidence. Content-addressing prevents post-submission mutation, not deception at creation time. Temporary evidence unavailability now blocks settlement and enables retry instead of being treated as proof failure. After the bounded grace period, expiry favors contributor fund recovery over indefinite escrow.

MIT licensed.
