"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Challenge, formatPool, readChallenge } from "@/lib/challenge-state";
import { explorerBase, readClient } from "@/lib/genlayer-client";
import { useWallet } from "./wallet-provider";

export function VerdictView({ challengeId }: { challengeId: string }) {
  const { client, connect } = useWallet();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdictTx, setVerdictTx] = useState<`0x${string}` | null>(null);
  const [appealState, setAppealState] = useState<{ canAppeal: boolean; bond?: bigint; reason?: string }>({ canAppeal: false });

  const load = useCallback(async () => {
    try {
      setChallenge(await readChallenge(challengeId));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read verdict state.");
    }
  }, [challengeId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      const stored = localStorage.getItem(`prove-it-verdict-tx:${challengeId}`);
      if (stored?.startsWith("0x")) setVerdictTx(stored as `0x${string}`);
    }, 0);
    return () => window.clearTimeout(initial);
  }, [challengeId]);

  useEffect(() => {
    if (!verdictTx) return;
    void Promise.all([readClient.canAppeal({ txId: verdictTx }), readClient.getMinAppealBond({ txId: verdictTx })])
      .then(([eligibility, bond]) => setAppealState({ canAppeal: Boolean(eligibility), bond: BigInt(bond as bigint) }))
      .catch((reason: unknown) => setAppealState({ canAppeal: false, reason: reason instanceof Error ? reason.message : "Appeal state unavailable" }));
  }, [verdictTx]);

  const ranked = useMemo(() => {
    if (!challenge?.verdict) return [];
    const bySubmission = new Map(challenge.submissions.map((submission) => [submission.id, submission]));
    return challenge.verdict.ranking.map((row) => ({ ...row, submission: bySubmission.get(row.submission_id) })).filter((row) => row.submission);
  }, [challenge]);

  async function appeal() {
    if (!verdictTx) throw new Error("This browser does not have the adjudication transaction id.");
    const active = client ?? await connect();
    await active.appealTransaction({ txId: verdictTx, value: appealState.bond ?? 0n });
  }

  if (error) return <main className="inner-page verdict-page"><div className="empty-state error-state"><b>Verdict unavailable.</b><span>{error}</span></div></main>;
  if (!challenge) return <main className="inner-page verdict-page"><div className="empty-state"><b>Reading verdict…</b><span>Loading adjudication from ChallengePool.</span></div></main>;
  if (!challenge.verdict) return <main className="inner-page verdict-page"><div className="empty-state"><b>No verdict yet.</b><span>This challenge has not completed an adjudication transaction.</span><Link className="text-link" href={`/challenge/${challenge.id}`}>Back to challenge →</Link></div></main>;

  const retryable = challenge.status === "RETRYABLE" || challenge.verdict.retryable;
  const refundable = challenge.status === "REFUNDABLE";
  const continuing = challenge.status === "OPEN" && challenge.verdict.reason === "NO_ELIGIBLE_YET";
  const payout = challenge.verdict.payouts[0];
  const paidIds = new Set(challenge.verdict.payouts.map((item) => item.submission_id));

  return <main className="inner-page verdict-page">
    <div className="breadcrumb"><Link href={`/challenge/${challenge.id}`}>Challenge</Link><span>→</span><span>Verdict</span></div>
    <section className="verdict-hero">
      <div><span className="kicker"><i /> CONTRACT-DERIVED ADJUDICATION</span><h1>{retryable ? <>The jury needs a retry.<br /><em>No funds moved.</em></> : continuing ? <>No proof passed yet.<br /><em>The challenge remains open.</em></> : refundable ? <>No proof qualified.<br /><em>Refunds are open.</em></> : <>The jury reached a result.<br /><em>Settlement is finality-gated.</em></>}</h1><p>{retryable ? "At least one rubric item was UNVERIFIABLE. The contract conservatively withheld both payouts and refunds so adjudication can be retried against the immutable evidence." : continuing ? "This FIRST_PASS attempt failed before the deadline. The contract did not unlock refunds, so later competitors can still submit a qualifying proof." : "Every displayed score, required-gate result and payout comes from the ChallengePool verdict stored onchain."}</p></div>
      <div className="finality-clock"><span>{retryable ? "SETTLEMENT" : appealState.canAppeal ? "APPEAL WINDOW" : "VERDICT STATE"}</span><b>{retryable ? "HELD" : refundable ? "0" : payout ? formatPool(payout.amount) : "—"}</b><small>{retryable ? "escrow preserved" : refundable ? "payouts" : payout ? "GEN scheduled" : "onchain"}</small></div>
    </section>

    <section className="verdict-board panel">
      <div className="panel-heading"><div><span className="eyebrow">Ranked by rubric consensus</span><h2>{challenge.title}</h2></div><span className={`status-pill status-${challenge.status.toLowerCase()}`}>{challenge.status}</span></div>
      <div className="rank-list">{ranked.map((row, index) => {
        const submission = row.submission!;
        return <div className={`rank-row ${paidIds.has(row.submission_id) ? "winner" : ""}`} key={submission.id}><span className="rank">{index + 1}</span><div><strong>{submission.submitter}</strong><a href={submission.snapshotUri} target="_blank" rel="noreferrer">Inspect snapshot ↗</a><small>{row.required_met ? "Required criteria met" : "Required criterion failed"}</small></div><div className="meter"><span style={{ width: `${row.score}%` }} /></div><b>{row.score}<small>/100</small></b>{paidIds.has(row.submission_id) ? <i>PAID</i> : row.eligible ? <i>{retryable ? "HELD" : "ELIGIBLE"}</i> : null}</div>;
      })}</div>
      {ranked.length === 0 ? <div className="empty-state"><b>No scored submissions.</b><span>{challenge.verdict.reason ?? "The challenge expired without settlement."}</span></div> : null}
    </section>

    <div className="verdict-lower">
      <section className="panel appeal-panel"><span className="eyebrow">Protocol-native safety</span><h2>{retryable ? "Retry before settlement" : "Disagree with the jury?"}</h2><p>{retryable ? "Return to the challenge and run consensus again. The immutable submissions remain unchanged while external evidence availability can recover." : "No custom admin court. When this browser knows the verdict transaction id, GenLayer can expose the native appeal path and minimum bond."}</p>{!retryable && verdictTx && appealState.canAppeal ? <button className="button button-primary" onClick={() => void appeal().catch(() => undefined)}>Appeal verdict</button> : null}{retryable ? <Link className="button button-primary" href={`/challenge/${challenge.id}`}>Retry adjudication ↗</Link> : null}<small>{verdictTx ? appealState.reason ?? "Appeal eligibility queried live from Bradbury." : "Verdict transaction id is stored locally when adjudication is submitted from this browser."}</small></section>
      <section className="panel payout-panel"><span className="eyebrow">Settlement queue</span><div className="payout-line"><span>Escrowed pool</span><b>{formatPool(challenge.poolWei)} GEN</b></div><div className="payout-line"><span>Recipient</span><b>{payout?.recipient ?? "None"}</b></div><div className="payout-state"><i /> {retryable ? "BLOCKED — RETRY REQUIRED" : continuing ? "NO PAYOUT — CHALLENGE OPEN" : refundable ? "NO PAYOUT — REFUNDS OPEN" : "EXTERNAL TRANSFER AT FINALITY"}</div>{verdictTx ? <a href={`${explorerBase}/tx/${verdictTx}`} target="_blank" rel="noreferrer">Inspect adjudication transaction ↗</a> : null}</section>
    </div>
  </main>;
}
