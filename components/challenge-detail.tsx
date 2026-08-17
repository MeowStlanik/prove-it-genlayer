"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Challenge, modeLabel, statusLabel } from "@/lib/demo-data";
import { genToWei, requireContractAddress } from "@/lib/genlayer-client";
import { useWallet } from "./wallet-provider";

type SnapshotResult = { ok: boolean; sha256?: string; bytes?: number; contentType?: string; error?: string };

export function ChallengeDetail({ challenge }: { challenge: Challenge }) {
  const { send } = useWallet();
  const [fundAmount, setFundAmount] = useState("0.01");
  const [showProof, setShowProof] = useState(false);
  const [checking, setChecking] = useState(false);
  const [snapshot, setSnapshot] = useState<SnapshotResult | null>(null);
  const [proof, setProof] = useState({ sourceUrl: "", snapshotUri: "", note: "" });

  async function fund() {
    await send("Fund challenge", async (client) => client.writeContract({
      address: requireContractAddress(), functionName: "fund", args: [challenge.id], value: genToWei(fundAmount),
    }) as Promise<`0x${string}`>);
  }

  async function verifySnapshot() {
    setChecking(true); setSnapshot(null);
    try {
      const response = await fetch("/api/snapshot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ snapshotUri: proof.snapshotUri }) });
      setSnapshot((await response.json()) as SnapshotResult);
    } finally { setChecking(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!snapshot?.ok || !snapshot.sha256) return;
    const snapshotSha256 = snapshot.sha256;
    const id = `proof-${Date.now().toString(36)}`;
    await send("Submit immutable proof", async (client) => client.writeContract({
      address: requireContractAddress(), functionName: "submit_proof",
      args: [challenge.id, id, proof.sourceUrl, proof.snapshotUri, snapshotSha256, proof.note],
      value: 0n,
    }) as Promise<`0x${string}`>);
  }

  async function judge() {
    await send("Run semantic adjudication", async (client) => client.writeContract({
      address: requireContractAddress(), functionName: "judge", args: [challenge.id, JSON.stringify(challenge.submissions.map((item) => item.id))],
      value: 0n,
    }) as Promise<`0x${string}`>);
  }

  async function refund() {
    await send("Claim contribution refund", async (client) => client.writeContract({
      address: requireContractAddress(), functionName: "claim_refund", args: [challenge.id],
      value: 0n,
    }) as Promise<`0x${string}`>);
  }

  return (
    <main className="inner-page detail-page">
      <div className="breadcrumb"><Link href="/">Challenges</Link><span>→</span><span>{challenge.id}</span></div>
      <section className={`detail-hero accent-${challenge.accent}`}>
        <div>
          <div className="card-topline"><span className="eyebrow">{challenge.eyebrow}</span><span className={`status-pill status-${challenge.status.toLowerCase()}`}>{statusLabel[challenge.status]}</span></div>
          <h1>{challenge.title}</h1><p className="lead">{challenge.description}</p>
          <div className="detail-meta"><span>Created by <b>{challenge.creator}</b></span><span>{modeLabel[challenge.mode]}</span><span>Pass at {challenge.minScore}/100</span></div>
        </div>
        <aside className="pool-panel">
          <span className="metric-label">Crowdfunded prize</span><strong>{challenge.pool.toFixed(1)} <small>GEN</small></strong>
          <div className="progress-track"><span style={{ width: `${challenge.fundedPercent}%` }} /></div>
          <small>{challenge.fundedPercent}% funded · {challenge.timeLeft}</small>
          {challenge.status === "OPEN" && challenge.isLive ? <div className="fund-row"><input aria-label="GEN to fund" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} /><button onClick={() => void fund()}>Fund</button></div> : null}
        </aside>
      </section>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Immutable judging policy</span><h2>Consensus checklist</h2></div><b className="score-chip">{challenge.minScore}+ PASS</b></div>
          <div className="rubric-list compact">{challenge.checklist.map((item) => <div className="rubric-row" key={item.id}><span className="rubric-kind">{item.kind}</span><p>{item.criterion}</p><strong>{item.weight}<small>%</small></strong></div>)}</div>
        </section>
        <aside className="panel integrity-panel">
          <span className="eyebrow">Proof integrity</span><h3>A URL is not a snapshot.</h3><p>Prove It stores the original source for provenance, plus an immutable content address and its SHA-256 digest.</p>
          <ul><li>GitHub commit SHA</li><li>IPFS content ID</li><li>Arweave transaction</li></ul>
        </aside>
      </div>

      <section className="submission-section">
        <div className="section-heading"><div><span className="eyebrow">Public attempts</span><h2>{challenge.submissions.length} submissions</h2></div><div className="button-row">
          {challenge.isLive && challenge.status === "REFUNDABLE" ? <button className="button button-ghost" onClick={() => void refund()}>Claim refund</button> : null}
          {challenge.isLive && challenge.status === "OPEN" && challenge.submissions.length > 0 ? <button className="button button-ghost" onClick={() => void judge()}>Run consensus</button> : null}
          {challenge.isLive && challenge.status === "OPEN" ? <button className="button button-primary" onClick={() => setShowProof((value) => !value)}>Submit proof ↗</button> : null}
          {challenge.status === "FINALITY" ? <Link className="button button-primary" href={`/verdict/${challenge.id}`}>View verdict</Link> : null}
        </div></div>
        {showProof ? <form className="proof-form panel" onSubmit={submit}>
          <label>Original source URL<input required type="url" value={proof.sourceUrl} onChange={(e) => setProof({ ...proof, sourceUrl: e.target.value })} placeholder="https://your-project.example/result" /></label>
          <label>Immutable snapshot URI<input required type="url" value={proof.snapshotUri} onChange={(e) => { setProof({ ...proof, snapshotUri: e.target.value }); setSnapshot(null); }} placeholder="https://raw.githubusercontent.com/user/repo/40-char-commit/proof.md" /></label>
          <label>Submission note<textarea rows={3} maxLength={500} value={proof.note} onChange={(e) => setProof({ ...proof, note: e.target.value })} /></label>
          <div className="snapshot-check"><button type="button" className="button button-ghost" onClick={() => void verifySnapshot()} disabled={checking}>{checking ? "Fetching…" : "Verify & hash snapshot"}</button>{snapshot ? <span className={snapshot.ok ? "valid" : "invalid"}>{snapshot.ok ? `✓ ${snapshot.bytes} bytes · ${snapshot.sha256?.slice(0, 12)}…` : `✕ ${snapshot.error}`}</span> : null}</div>
          <button className="button button-primary" disabled={!snapshot?.ok}>Commit proof onchain</button>
        </form> : null}
        <div className="submission-table">
          {challenge.submissions.map((item, index) => <article key={item.id}><span className="submission-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{item.submitter}</strong><small>{item.submittedAt}</small></div><div className="snapshot-uri"><span>IMMUTABLE SNAPSHOT</span><a href={item.snapshotUri} target="_blank" rel="noreferrer">{item.snapshotUri} ↗</a></div>{item.score !== undefined ? <b className="submission-score">{item.score}</b> : <span className="pending-score">PENDING</span>}</article>)}
          {challenge.submissions.length === 0 ? <div className="empty-state"><b>Be the first to prove it.</b><span>No immutable evidence has been committed yet.</span></div> : null}
        </div>
      </section>
    </main>
  );
}
