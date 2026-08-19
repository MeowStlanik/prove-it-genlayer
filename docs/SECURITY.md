# Security model

- **Mutable evidence:** rejected onchain. Snapshot locators must pin a Git commit, IPFS CID, or Arweave transaction.
- **Prompt injection:** rules and proof documents are explicitly treated as untrusted data. Prompts instruct validators to ignore embedded instructions.
- **Hallucinated evidence:** assessment structure, item ids, statuses, scores and the empty calibration anchor are revalidated deterministically after consensus.
- **Rubric drift:** the creator confirms the generated checklist before funding opens; no later edit method exists.
- **Required-rule bypass:** impossible by score alone. A submission must have every `REQUIRED` criterion marked `MET` in addition to reaching `min_score`.
- **Incomplete evidence settlement:** blocked. Any `UNVERIFIABLE` item on a real submission produces `RETRYABLE`; neither payout nor refund is emitted from that adjudication.
- **Premature FIRST_PASS refund:** blocked. A failed early attempt leaves the challenge `OPEN` until another proof passes or the deadline/terminal path is reached.
- **Stuck escrow:** bounded. Empty challenges can expire immediately after deadline; challenges with submissions can expire to refunds after a seven-day adjudication grace period.
- **Refund after payout:** defended twice. Only `REFUNDABLE` states can claim and `claim_refund` rejects a verdict containing any payout.
- **Premature settlement:** non-first-pass modes cannot be judged before deadline. Funding and proof submission cannot occur after deadline.
- **Irreversible accepted verdict:** payout messages execute at finality, not merely acceptance.
- **Judge censorship / manifest drift:** anyone can call `judge`; v2 derives the complete submission set from its own persistent index instead of trusting a caller-supplied manifest.
- **Static UI state:** removed. Challenge, submission and verdict records rendered by the app come from contract views; local storage is used only for the current browser's signed transaction links.
- **Spam:** each challenge is capped at eight submissions and IDs are unique.

## Known limits

- Public evidence can be misleading even when immutable. Diverse validators reduce but do not eliminate this risk.
- The submitted SHA-256 is an audit aid; immutability is enforced by the content-pinned locator. The contract does not hash a renderer's transformed text because it may differ from raw bytes.
- A Git host or gateway can be unavailable. This becomes `UNVERIFIABLE` and holds settlement for retry; a maliciously unavailable proof can therefore delay settlement until the bounded expiry path.
- The v2 frontend requires a v2 contract deployment because v1 did not persist enumerable challenge/submission indexes.
