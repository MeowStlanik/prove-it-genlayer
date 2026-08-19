"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Challenge,
  canExpireChallenge,
  canJudgeChallenge,
  challengeAccent,
  challengeEyebrow,
  formatPool,
  formatTimestamp,
  modeLabel,
  readChallenge,
  statusLabel,
  timeLeft,
} from "@/lib/challenge-state";
import { genToWei, requireContractAddress, waitForAccepted } from "@/lib/genlayer-client";
import { useWallet } from "./wallet-provider";

type SnapshotResult = { ok: boolean; sha256?: string; bytes?: number; contentType?: string; error?: string };

export function ChallengeDetail({ challengeId }: { challengeId: string }) {
  const { send } = useWallet();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("0.01");
  const [showProof, setShowProof] = useState(false);
  const [checking, setChecking] = useState(false);
  const [snapshot, setSnapshot] = useState<SnapshotResult | null>(null);
  const [proof, setProof] = useState({ sourceUrl: "", snapshotUri: "", note: "" });
  const [nowMs, setNowMs] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await readChallenge(challengeId);
      setChallenge(next);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read this challenge from the contract.");
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 20_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const initial = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  const canJudge = useMemo(() => challenge ? canJudgeChallenge(challenge, nowMs ?? 0) : false, [challenge, nowMs]);
  const canExpire = useMemo(() => challenge ? canExpireChallenge(challenge, nowMs ?? 0) : false, [challenge, nowMs]);

  async function sendAndRefresh(label: string, action: Parameters<typeof send>[1]) {
    const hash = await send(label, action);
    await waitForAccepted(hash);
    await load();
    return hash;
  }

  async function fund() {
    if (!challenge) return;
    await sendAndRefresh("Fund challenge", async (client) => client.writeContract({
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
    if (!challenge || !snapshot?.ok || !snapshot.sha256) return;
    const snapshotSha256 = snapshot.sha256;
    const id = `proof-${Date.now().toString(36)}`;
    await sendAndRefresh("Submit immutable proof", async (client) => client.writeContract({
      address: requireContractAddress(), functionName: "submit_proof",
      args: [challenge.id, id, proof.sourceUrl, proof.snapshotUri, snapshotSha256, proof.note],
      value: 0n,
    }) as Promise<`0x${string}`>);
    setProof({ sourceUrl: "", snapshotUri: "", note: "" });
    setSnapshot(null);
    setShowProof(false);
  }

  async function judge() {
    if (!challenge) return;
    const hash = await send("Run semantic adjudication", async (client) => client.writeContract({
      address: requireContractAddress(), functionName: "judge", args: [challenge.id],
      value: 0n,
    }) as Promise<`0x${string}`>);
    localStorage.setItem(`prove-it-verdict-tx:${challenge.id}`, hash);
    await waitForAccepted(hash);
    await load();
  }

  async function expire() {
    if (!challenge) return;
    await sendAndRefresh("Expire challenge safely", async (client) => client.writeContract({
      address: requireContractAddress(), functionName: "expire_challenge", args: [challenge.id], value: 0n,
    }) as Promise<`0x${string}`>);
  }

  async function refund() {
    if (!challenge) return;
    await sendAndRefresh("Claim contribution refund", async (client) => client.writeContract({
      address: requireContractAddress(), functionName: "claim_refund", args: [challenge.id], value: 0n,
    }) as Promise<`0x${string}`>);
  }

  if (loading) return <main className="inner-page detail-page"><div className="empty-state"><b>Reading challenge…</b><span>Loading contract-derived rubric, submissions and verdict.</span></div></main>;
  if (error || !challenge) return <main className="inner-page detail-page"><div className="empty-state error-state"><b>Challenge unavailable.</b><span>{error ?? "The contract did not return this challenge."}</span><Link className="text-link" href="/">Back to challenges →</Link></div></main>;

  const accent = challengeAccent(challenge.id);
  const deadlinePassed = nowMs !== null && nowMs > challenge.deadline * 1000;
  const acceptingProof = (challenge.status === "OPEN" || challenge.status === "RETRYABLE") && !deadlinePassed;
  const requiredCount = challenge.checklist.filter((item) => item.kind === "REQUIRED").length;

  return (
    <main className="inner-page detail-page">
      <div className="breadcrumb"><Link href="/">Challenges</Link><span>→</span><span>{challenge.id}</span></div>
      <section className={`detail-hero accent-${accent}`}>
        <div>
          <div className="card-topline"><span className="eyebrow">{challengeEyebrow(challenge)}</span><span className={`status-pill status-${challenge.status.toLowerCase()}`}>{statusLabel[challenge.status]}</span></div>
          <h1>{challenge.title}</h1><p className="lead">{challenge.rulesText}</p>
          <div className="detail-meta"><span>Created by <b>{challenge.creator}</b></span><span>{modeLabel[challenge.mode]}</span><span>Pass at {challenge.minScore}/100 + all required</span></div>
        </div>
        <aside className="pool-panel">
          <span className="metric-label">Escrowed prize</span><strong>{formatPool(challenge.poolWei)} <small>GEN</small></strong>
          <small>{timeLeft(challenge.deadline, nowMs ?? 0)} · deadline {formatTimestamp(challenge.deadline)}</small>
          {acceptingProof ? <div className="fund-row"><input aria-label="GEN to fund" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} /><button onClick={() => void fund().catch(() => undefined)}>Fund</button></div> : null}
        </aside>
      </section>

      {challenge.status === "RETRYABLE" ? <section className="safety-banner panel"><span className="eyebrow">Safe adjudication failure</span><h3>Evidence was unavailable, so no money moved.</h3><p>The accepted assessment contained UNVERIFIABLE items. The contract keeps the full pool escrowed and allows adjudication to be retried. If no complete verdict succeeds by {formatTimestamp(challenge.expiryAt)}, the challenge can expire to refunds.</p></section> : null}

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Immutable judging policy</span><h2>Consensus checklist</h2></div><b className="score-chip">{challenge.minScore}+ · {requiredCount} REQUIRED</b></div>
          <div className="rubric-list compact">{challenge.checklist.map((item) => <div className="rubric-row" key={item.id}><span className="rubric-kind">{item.kind}</span><p>{item.criterion}</p><strong>{item.weight}<small>%</small></strong></div>)}</div>
        </section>
        <aside className="panel integrity-panel">
          <span className="eyebrow">Settlement safety</span><h3>Required means required.</h3><p>A submission is ineligible unless every REQUIRED criterion is MET and its weighted score reaches the threshold. Any UNVERIFIABLE item blocks both payout and refund until retry or expiry.</p>
          <ul><li>GitHub commit SHA</li><li>IPFS content ID</li><li>Arweave transaction</li></ul>
        </aside>
      </div>

      <section className="submission-section">
        <div className="section-heading"><div><span className="eyebrow">Onchain attempts</span><h2>{challenge.submissions.length} submissions</h2></div><div className="button-row">
          {challenge.status === "REFUNDABLE" ? <button className="button button-ghost" onClick={() => void refund().catch(() => undefined)}>Claim refund</button> : null}
          {canExpire ? <button className="button button-ghost" onClick={() => void expire().catch(() => undefined)}>Expire → refunds</button> : null}
          {canJudge ? <button className="button button-ghost" onClick={() => void judge().catch(() => undefined)}>{challenge.status === "RETRYABLE" ? "Retry consensus" : "Run consensus"}</button> : null}
          {acceptingProof ? <button className="button button-primary" onClick={() => setShowProof((value) => !value)}>Submit proof ↗</button> : null}
          {challenge.judgedAt > 0 ? <Link className="button button-primary" href={`/verdict/${challenge.id}`}>View adjudication</Link> : null}
        </div></div>
        {deadlinePassed && challenge.status === "OPEN" && challenge.submissions.length > 0 && !canJudge ? <p className="form-note">Adjudication becomes available after the deadline for this settlement mode.</p> : null}
        {showProof ? <form className="proof-form panel" onSubmit={submit}>
          <label>Original source URL<input required type="url" value={proof.sourceUrl} onChange={(e) => setProof({ ...proof, sourceUrl: e.target.value })} placeholder="https://your-project.example/result" /></label>
          <label>Immutable snapshot URI<input required type="url" value={proof.snapshotUri} onChange={(e) => { setProof({ ...proof, snapshotUri: e.target.value }); setSnapshot(null); }} placeholder="https://raw.githubusercontent.com/user/repo/40-char-commit/proof.md" /></label>
          <label>Submission note<textarea rows={3} maxLength={500} value={proof.note} onChange={(e) => setProof({ ...proof, note: e.target.value })} /></label>
          <div className="snapshot-check"><button type="button" className="button button-ghost" onClick={() => void verifySnapshot()} disabled={checking}>{checking ? "Fetching…" : "Verify & hash snapshot"}</button>{snapshot ? <span className={snapshot.ok ? "valid" : "invalid"}>{snapshot.ok ? `✓ ${snapshot.bytes} bytes · ${snapshot.sha256?.slice(0, 12)}…` : `✕ ${snapshot.error}`}</span> : null}</div>
          <button className="button button-primary" disabled={!snapshot?.ok}>Commit proof onchain</button>
        </form> : null}
        <div className="submission-table">
          {challenge.submissions.map((item, index) => <article key={item.id}><span className="submission-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{item.submitter}</strong><small>{formatTimestamp(item.submittedAt)}</small></div><div className="snapshot-uri"><span>IMMUTABLE SNAPSHOT</span><a href={item.snapshotUri} target="_blank" rel="noreferrer">{item.snapshotUri} ↗</a></div>{item.score !== undefined ? <b className="submission-score">{item.score}</b> : <span className="pending-score">PENDING</span>}</article>)}
          {challenge.submissions.length === 0 ? <div className="empty-state"><b>Be the first to prove it.</b><span>No immutable evidence has been committed yet.</span></div> : null}
        </div>
      </section>
    </main>
  );
}
