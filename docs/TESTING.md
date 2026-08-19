# Verification

The direct-mode suite covers the lifecycle and nondeterministic validators: rubric invariants, semantic equivalence, malformed output, creator confirmation, pool accounting, deadline gates, immutable snapshots, deterministic resolution, refunds, payouts and reputation.

v2 additionally tests:

- enumerable challenge/submission indexes used by the frontend;
- `REQUIRED` criteria as hard eligibility gates even when a score is above threshold;
- `UNVERIFIABLE` evidence entering `RETRYABLE` with zero payouts/refunds;
- failed early `FIRST_PASS` adjudication staying open until deadline;
- immediate expiry for empty challenges after deadline;
- the seven-day expiry grace period when submissions exist;
- `expiry_at` exposure for client-side lifecycle controls.

Run:

```bash
pytest -q
genvm-lint check contracts/challenge_pool.py
npm run typecheck
npm run lint
npm test
```

GitHub Actions runs the web and contract verification matrix on pushes and pull requests when the pinned development dependencies are available.
