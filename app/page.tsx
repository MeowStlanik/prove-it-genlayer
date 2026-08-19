"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChallengeCard } from "@/components/challenge-card";
import { Challenge, readAllChallenges } from "@/lib/challenge-state";

const filters = ["Hot", "Newest", "Verdicts", "Refunds"] as const;
const marketplaceStatuses = new Set(["OPEN", "RETRYABLE", "RESOLVED", "REFUNDABLE"]);

export default function Home() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Hot");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const refresh = async () => {
      try {
        const next = await readAllChallenges();
        if (!live) return;
        setChallenges(next.filter((item) => marketplaceStatuses.has(item.status)));
        setError(null);
      } catch (reason) {
        if (!live) return;
        setError(reason instanceof Error ? reason.message : "Could not read contract state.");
      } finally {
        if (live) setLoading(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => { live = false; window.clearInterval(timer); };
  }, []);

  const visible = useMemo(() => {
    if (filter === "Verdicts") return challenges.filter((item) => item.status === "RESOLVED" || item.status === "RETRYABLE");
    if (filter === "Refunds") return challenges.filter((item) => item.status === "REFUNDABLE");
    if (filter === "Newest") return [...challenges].sort((a, b) => b.createdAt - a.createdAt);
    return [...challenges].sort((a, b) => {
      if (a.status === "OPEN" && b.status !== "OPEN") return -1;
      if (b.status === "OPEN" && a.status !== "OPEN") return 1;
      if (a.poolWei === b.poolWei) return b.createdAt - a.createdAt;
      return a.poolWei > b.poolWei ? -1 : 1;
    });
  }, [challenges, filter]);

  return (
    <main>
      <section className="hero shell-grid">
        <div className="hero-copy">
          <span className="kicker"><i /> CROWDFUNDED OUTCOMES, SETTLED BY CONSENSUS</span>
          <h1>Put money behind<br /><em>something provable.</em></h1>
          <p>Anyone can fund an outcome described in plain English. Anyone can attempt it. GenLayer decides who actually proved it.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/create">Create a challenge <span>↗</span></Link>
            <a className="text-link" href="#challenges">Explore live pools ↓</a>
          </div>
        </div>
        <div className="hero-orbit" aria-label="Four-stage Prove It flow">
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="orbit-core"><b>LIVE</b><span>CONTRACT STATE<br />ON BRADBURY</span></div>
          <div className="orbit-node node-a"><small>01</small><strong>Fund</strong></div>
          <div className="orbit-node node-b"><small>02</small><strong>Compete</strong></div>
          <div className="orbit-node node-c"><small>03</small><strong>Prove</strong></div>
          <div className="orbit-node node-d"><small>04</small><strong>Settle</strong></div>
        </div>
      </section>

      <section className="trust-strip">
        <span>NO PLATFORM JUDGE</span><i />
        <span>IMMUTABLE PROOF SNAPSHOTS</span><i />
        <span>REQUIRED CRITERIA ARE HARD GATES</span><i />
        <span>FINALITY-GATED PAYOUTS</span>
      </section>

      <section className="challenge-section" id="challenges">
        <div className="section-heading">
          <div><span className="eyebrow">Challenge marketplace · onchain</span><h2>Outcomes worth proving</h2></div>
          <div className="filter-tabs" role="tablist" aria-label="Challenge filters">
            {filters.map((item) => (
              <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
        </div>
        {loading ? <div className="empty-state"><b>Reading ChallengePool…</b><span>Loading challenge, submission and verdict state from Bradbury.</span></div> : null}
        {error ? <div className="empty-state error-state"><b>Contract read failed.</b><span>{error}</span></div> : null}
        {!loading && !error && visible.length === 0 ? <div className="empty-state"><b>No onchain challenges yet.</b><span>Create one and it will appear here after acceptance.</span></div> : null}
        <div className="challenge-grid">
          {visible.map((challenge, index) => <ChallengeCard challenge={challenge} index={index} key={challenge.id} />)}
        </div>
      </section>

      <section className="protocol-section">
        <div className="protocol-copy">
          <span className="eyebrow">Why GenLayer</span>
          <h2>The contract reads the work,<br />not just the transaction.</h2>
          <p>Rules become a checklist before money enters. Validators inspect immutable evidence, every required criterion must pass, and unavailable evidence keeps funds escrowed for a retry instead of forcing an unsafe payout or refund.</p>
        </div>
        <ol className="protocol-steps">
          <li><span>01</span><div><strong>Rules → rubric</strong><p>Consensus proposes what can actually be checked.</p></div></li>
          <li><span>02</span><div><strong>Snapshot → evidence</strong><p>Every submission points to immutable public content.</p></div></li>
          <li><span>03</span><div><strong>Verdict → finality</strong><p>Settlement waits for a complete adjudication and protocol finality.</p></div></li>
        </ol>
      </section>
    </main>
  );
}
