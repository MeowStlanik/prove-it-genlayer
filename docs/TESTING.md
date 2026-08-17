# Verification

The direct-mode suite covers the full state machine and both nondeterministic validators: rubric invariants, semantic equivalence, malformed output, failed calibration, creator confirmation, pool accounting, deadline gates, immutable snapshots, exact verdict agreement, evidence consistency, settlement, refunds, payouts, and reputation.

Run:

```bash
pytest -q
genvm-lint check contracts/challenge_pool.py
npm run typecheck
npm run lint
npm test
```

GitHub Actions runs the web and contract verification matrix on pushes and pull requests.
