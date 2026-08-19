# Consensus design

Prove It uses GenLayer consensus twice, for different questions.

## 1. Rubric formalization

`draft_challenge` uses GenLayer's native `prompt_non_comparative` principle to convert natural-language rules into 2–6 weighted criteria totaling 100. Validators inspect that concrete proposal against the original rules and accept only when it covers all material obligations, flags unverifiable claims, invents nothing, and preserves relative importance. Deterministic invariants reject malformed output after consensus and require at least one `REQUIRED` item.

The contract stores `NEEDS_REVISION` when any requirement cannot be checked from public evidence. Otherwise it stores `DRAFT`. Funding remains closed until the creator calls `confirm_challenge`; this makes the reviewed checklist immutable.

## 2. Proof adjudication

Every submission contains the original source URL for provenance, a content-pinned HTTPS snapshot, and its SHA-256 digest. The contract only accepts GitHub raw URLs pinned to a 40-character commit, IPFS CIDs, or Arweave transaction IDs.

The assessment uses a second native `prompt_non_comparative` principle whose input function retrieves every pinned snapshot. The leader classifies every rubric item as `MET`, `NOT_MET`, or `UNVERIFIABLE`; validators check the proposal against the same input and explicit criteria. Scores remain deterministic sums of weights, and the contract revalidates the complete structure and anchor after consensus.

An empty synthetic anchor must always score zero. It catches a leader that marks unsupported criteria as met.

## Eligibility is stricter than score

`_resolve` applies two deterministic gates to every submission:

1. weighted `score >= min_score`, and
2. every rubric item whose kind is `REQUIRED` must be `MET`.

A high quality score therefore cannot compensate for a missing mandatory requirement.

## Safe incomplete adjudication

A temporary fetch/render failure can make a rubric item `UNVERIFIABLE`. Treating that as `NOT_MET` could incorrectly refund contributors; ignoring it could incorrectly pay a winner or rank competitors. v2 takes the conservative path: if any real submission has an `UNVERIFIABLE` item, the verdict is stored with reason `UNVERIFIABLE_EVIDENCE`, status becomes `RETRYABLE`, and no external transfer is scheduled.

Anyone can retry the same immutable submission set. For `FIRST_PASS`, if this happens before deadline the challenge can still receive new submissions; a new proof clears the stale retryable verdict and reopens normal adjudication.

## Failure, expiry, settlement and appeals

- A complete `FIRST_PASS` adjudication that finds no eligible proof **before deadline** stays `OPEN`; it does not prematurely unlock refunds.
- A complete terminal adjudication with no eligible proof becomes `REFUNDABLE`.
- An expired challenge with zero submissions can become `REFUNDABLE` immediately after deadline.
- An expired challenge with submissions can become `REFUNDABLE` after a seven-day adjudication grace period if no safe settlement completed.
- A verdict with payouts becomes `RESOLVED`; payout external messages execute only when the transaction finalizes.

There is no application-level dispute court. Users appeal the verdict transaction through GenLayer's native appeal mechanism.
