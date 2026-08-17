"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChallengeCard } from "@/components/challenge-card";
import { challenges } from "@/lib/demo-data";

const filters = ["Hot", "Newest", "Finality", "Refunds"] as const;

export default function Home() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Hot");
  const visible = useMemo(() => {
    if (filter === "Finality") return challenges.filter((item) => item.status === "FINALITY");
    if (filter === "Refunds") return challenges.filter((item) => item.status === "REFUNDABLE");
    if (filter === "Newest") return [...challenges].reverse();
    return [...challenges].sort((a, b) => Number(Boolean(b.isLive)) - Number(Boolean(a.isLive)) || b.pool - a.pool);
  }, [filter]);

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
          <div className="orbit-core"><b>0.001</b><span>GEN LIVE<br />ON BRADBURY</span></div>
          <div className="orbit-node node-a"><small>01</small><strong>Fund</strong></div>
          <div className="orbit-node node-b"><small>02</small><strong>Compete</strong></div>
          <div className="orbit-node node-c"><small>03</small><strong>Prove</strong></div>
          <div className="orbit-node node-d"><small>04</small><strong>Settle</strong></div>
        </div>
      </section>

      <section className="trust-strip">
        <span>NO PLATFORM JUDGE</span><i />
        <span>IMMUTABLE PROOF SNAPSHOTS</span><i />
        <span>NATIVE APPEALS</span><i />
        <span>FINALITY-GATED PAYOUTS</span>
      </section>

      <section className="challenge-section" id="challenges">
        <div className="section-heading">
          <div><span className="eyebrow">Challenge marketplace</span><h2>Outcomes worth proving</h2></div>
          <div className="filter-tabs" role="tablist" aria-label="Challenge filters">
            {filters.map((item) => (
              <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="challenge-grid">
          {visible.map((challenge, index) => <ChallengeCard challenge={challenge} index={index} key={challenge.id} />)}
        </div>
      </section>

      <section className="protocol-section">
        <div className="protocol-copy">
          <span className="eyebrow">Why GenLayer</span>
          <h2>The contract reads the work,<br />not just the transaction.</h2>
          <p>Rules become a checklist before money enters. Validators independently inspect the same immutable evidence, agree item by item, then the protocol opens an appeal window before settlement.</p>
        </div>
        <ol className="protocol-steps">
          <li><span>01</span><div><strong>Rules → rubric</strong><p>Consensus proposes what can actually be checked.</p></div></li>
          <li><span>02</span><div><strong>Snapshot → evidence</strong><p>Every submission points to immutable public content.</p></div></li>
          <li><span>03</span><div><strong>Verdict → finality</strong><p>A larger validator set can re-evaluate an appealed result.</p></div></li>
        </ol>
      </section>
    </main>
  );
}
