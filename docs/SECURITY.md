# Security model

- **Mutable evidence:** rejected onchain. Snapshot locators must pin a Git commit, IPFS CID, or Arweave transaction.
- **Prompt injection:** rules and proof documents are explicitly treated as untrusted data. Prompts instruct validators to ignore embedded instructions.
- **Hallucinated evidence:** exact item-status agreement is followed by a separate semantic evidence consistency check.
- **Rubric drift:** the creator confirms the generated checklist before funding opens; no later edit method exists.
- **Premature settlement:** non-first-pass modes cannot be judged before deadline. Funding and confirmation cannot occur after deadline.
- **Irreversible accepted verdict:** payout messages execute at finality, not merely acceptance.
- **Judge censorship:** anyone can call `judge`; the caller supplies all submission IDs and the contract verifies the count and uniqueness.
- **Spam:** each challenge is capped at eight submissions and IDs are unique.

## Known limits

- Public evidence can be misleading even when immutable. Diverse validators reduce but do not eliminate this risk.
- The submitted SHA-256 is an audit aid; immutability is enforced by the content-pinned locator. The contract does not hash a renderer’s transformed text because it may differ from raw bytes.
- The MVP keeper uses an explicit submission manifest because GenVM storage maps are not iterated. A production indexer should build this manifest from transaction events/indexed calls.
- A Git host or gateway can be unavailable. This becomes `UNVERIFIABLE`, never automatically `NOT_MET`.
