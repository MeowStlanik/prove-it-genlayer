import Link from "next/link";
import { Challenge, modeLabel, statusLabel } from "@/lib/demo-data";

export function ChallengeCard({ challenge, index }: { challenge: Challenge; index: number }) {
  return (
    <article className={`challenge-card accent-${challenge.accent}`} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}>
      <div className="card-topline">
        <span className="eyebrow">{challenge.eyebrow}</span>
        <span className={`status-pill status-${challenge.status.toLowerCase()}`}>{statusLabel[challenge.status]}</span>
      </div>
      <h3><Link href={`/challenge/${challenge.id}`}>{challenge.title}</Link></h3>
      <p>{challenge.description}</p>
      <div className="pool-row">
        <div><span className="metric-label">Prize pool</span><strong>{challenge.pool.toFixed(1)} <small>GEN</small></strong></div>
        <div className="align-right"><span className="metric-label">Deadline</span><strong>{challenge.timeLeft}</strong></div>
      </div>
      <div className="progress-track" aria-label={`${challenge.fundedPercent}% funded`}>
        <span style={{ width: `${challenge.fundedPercent}%` }} />
      </div>
      <div className="card-footer">
        <span>{challenge.isLive ? "● LIVE ON BRADBURY" : modeLabel[challenge.mode]}</span>
        <span>{challenge.submissions.length} submissions</span>
        <Link href={`/challenge/${challenge.id}`} className="round-arrow" aria-label={`Open ${challenge.title}`}>↗</Link>
      </div>
    </article>
  );
}
