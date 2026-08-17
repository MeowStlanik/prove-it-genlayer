"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Challenge } from "@/lib/demo-data";
import { explorerBase, readClient } from "@/lib/genlayer-client";
import { useWallet } from "./wallet-provider";

const verdictTx = process.env.NEXT_PUBLIC_DEMO_VERDICT_TX as `0x${string}` | undefined;

export function VerdictView({ challenge }: { challenge: Challenge }) {
  const { client, connect } = useWallet();
  const [appealState, setAppealState] = useState<{ canAppeal: boolean; bond?: bigint; reason?: string }>({ canAppeal: true });
  const ranked = [...challenge.submissions].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  useEffect(() => {
    if (!verdictTx) return;
    void Promise.all([readClient.canAppeal({ txId: verdictTx }), readClient.getMinAppealBond({ txId: verdictTx })])
      .then(([eligibility, bond]) => setAppealState({ canAppeal: Boolean(eligibility), bond: BigInt(bond as bigint) }))
      .catch((error: unknown) => setAppealState({ canAppeal: false, reason: error instanceof Error ? error.message : "Appeal state unavailable" }));
  }, []);

  async function appeal() {
    if (!verdictTx) throw new Error("No verdict transaction is configured for this demo challenge.");
    const active = client ?? await connect();
    await active.appealTransaction({ txId: verdictTx, value: appealState.bond ?? 0n });
  }

  return <main className="inner-page verdict-page">
    <div className="breadcrumb"><Link href={`/challenge/${challenge.id}`}>Challenge</Link><span>→</span><span>Verdict</span></div>
    <section className="verdict-hero">
      <div><span className="kicker"><i /> OPTIMISTIC DEMOCRACY VERDICT</span><h1>The jury reached a result.<br /><em>The protocol has not paid yet.</em></h1><p>Accepted results remain appealable. Irreversible transfers are external messages and execute only when this transaction becomes final.</p></div>
      <div className="finality-clock"><span>FINALITY WINDOW</span><b>14:32</b><small>remaining</small></div>
    </section>

    <section className="verdict-board panel">
      <div className="panel-heading"><div><span className="eyebrow">Ranked by rubric consensus</span><h2>{challenge.title}</h2></div><span className="status-pill status-finality">Awaiting finality</span></div>
      <div className="rank-list">{ranked.map((submission, index) => <div className={`rank-row ${index === 0 ? "winner" : ""}`} key={submission.id}><span className="rank">{index + 1}</span><div><strong>{submission.submitter}</strong><a href={submission.snapshotUri} target="_blank" rel="noreferrer">Inspect snapshot ↗</a></div><div className="meter"><span style={{ width: `${submission.score}%` }} /></div><b>{submission.score}<small>/100</small></b>{index === 0 ? <i>WINNER</i> : null}</div>)}</div>
    </section>

    <div className="verdict-lower">
      <section className="panel appeal-panel"><span className="eyebrow">Protocol-native safety</span><h2>Disagree with the jury?</h2><p>No custom admin court. GenLayer can escalate the same transaction to a larger validator set against an economic bond.</p>{verdictTx && appealState.canAppeal ? <button className="button button-primary" onClick={() => void appeal()}>Appeal verdict</button> : null}<small>{verdictTx ? appealState.reason ?? "Minimum bond queried live from Bradbury." : "Appeal opens here when an adjudication transaction enters its finality window."}</small></section>
      <section className="panel payout-panel"><span className="eyebrow">Settlement queue</span><div className="payout-line"><span>Prize pool</span><b>{challenge.pool.toFixed(1)} GEN</b></div><div className="payout-line"><span>Recipient</span><b>{ranked[0]?.submitter}</b></div><div className="payout-state"><i /> WAITING FOR FINALIZED</div>{verdictTx ? <a href={`${explorerBase}/tx/${verdictTx}`} target="_blank" rel="noreferrer">Inspect transaction ↗</a> : null}</section>
    </div>
  </main>;
}
