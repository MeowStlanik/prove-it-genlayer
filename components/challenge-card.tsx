import Link from "next/link";
import {
  Challenge,
  challengeAccent,
  challengeEyebrow,
  formatPool,
  modeLabel,
  statusLabel,
  timeLeft,
} from "@/lib/challenge-state";

export function ChallengeCard({ challenge, index }: { challenge: Challenge; index: number }) {
  const accent = challengeAccent(challenge.id);
  return (
    <article className={`challenge-card accent-${accent}`} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}>
      <div className="card-topline">
        <span className="eyebrow">{challengeEyebrow(challenge)}</span>
        <span className={`status-pill status-${challenge.status.toLowerCase()}`}>{statusLabel[challenge.status]}</span>
      </div>
      <h3><Link href={`/challenge/${challenge.id}`}>{challenge.title}</Link></h3>
      <p>{challenge.rulesText}</p>
      <div className="pool-row">
        <div><span className="metric-label">Prize pool</span><strong>{formatPool(challenge.poolWei)} <small>GEN</small></strong></div>
        <div className="align-right"><span className="metric-label">Deadline</span><strong>{timeLeft(challenge.deadline)}</strong></div>
      </div>
      <div className="card-footer">
        <span>{modeLabel[challenge.mode]}</span>
        <span>{challenge.submissions.length} submissions</span>
        <Link href={`/challenge/${challenge.id}`} className="round-arrow" aria-label={`Open ${challenge.title}`}>↗</Link>
      </div>
    </article>
  );
}
