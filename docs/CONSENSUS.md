# Consensus design

Prove It uses GenLayer consensus twice, for different questions.

## 1. Rubric formalization

`draft_challenge` uses GenLayer's native `prompt_non_comparative` principle to convert natural-language rules into 2–6 weighted criteria totaling 100. Validators inspect that concrete proposal against the original rules and accept only when it covers all material obligations, flags unverifiable claims, invents nothing, and preserves relative importance. Deterministic invariants reject malformed output after consensus. This avoids requiring two generative rubrics to be textually or structurally identical.

The contract stores `NEEDS_REVISION` when any requirement cannot be checked from public evidence. Otherwise it stores `DRAFT`. Funding remains closed until the creator calls `confirm_challenge`; this makes the reviewed checklist immutable.

## 2. Proof adjudication

Every submission contains the original source URL for provenance, a content-pinned HTTPS snapshot, and its SHA-256 digest. The contract only accepts GitHub raw URLs pinned to a 40-character commit, IPFS CIDs, or Arweave transaction IDs.

The assessment uses a second native `prompt_non_comparative` principle whose input function retrieves every pinned snapshot. The leader classifies every rubric item as `MET`, `NOT_MET`, or `UNVERIFIABLE`; validators check the proposal against the same input and explicit criteria. Scores remain deterministic sums of weights, and the contract revalidates the complete structure and anchor after consensus.

An empty synthetic anchor must always score zero. It catches a leader that marks unsupported criteria as met.

## Settlement and appeals

Settlement is deterministic after consensus: first passing proof, best score at deadline, or score-proportional split. There is no application-level dispute court. Users appeal the verdict transaction through GenLayer’s native appeal mechanism.

Payouts and refunds are external EVM messages. They execute only when the verdict transaction is finalized, so an accepted result can still be appealed without an irreversible transfer.
