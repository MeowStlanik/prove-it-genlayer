"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Challenge, formatPool, readAllChallenges, readContribution, readReputation, statusLabel, timeLeft } from "@/lib/challenge-state";
import { explorerBase, shortAddress } from "@/lib/genlayer-client";
import { useWallet } from "./wallet-provider";

type Activity = { label: string; hash: string; address?: string; time: string };

type ProfileState = {
  address: string | null;
  challenges: Challenge[];
  fundedCount: number;
  reputation: { completed: number; failed: number };
};

const EMPTY_PROFILE: Omit<ProfileState, "address"> = {
  challenges: [],
  fundedCount: 0,
  reputation: { completed: 0, failed: 0 },
};

export function ProfileView() {
  const { address, connect, connecting } = useWallet();
  const [activity, setActivity] = useState<Activity[]>([]);
  const [state, setState] = useState<ProfileState>({ address: null, ...EMPTY_PROFILE });

  useEffect(() => {
    const read = () => {
      try { setActivity(JSON.parse(localStorage.getItem("prove-it-activity") ?? "[]") as Activity[]); }
      catch { setActivity([]); }
    };
    const initial = window.setTimeout(read, 0);
    window.addEventListener("prove-it-activity", read);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("prove-it-activity", read);
    };
  }, []);

  useEffect(() => {
    if (!address) return;
    let live = true;
    const initial = window.setTimeout(() => {
      void (async () => {
        const all = await readAllChallenges();
        const contributions = await Promise.all(all.map((item) => readContribution(item.id, address).catch(() => 0n)));
        const reputation = await readReputation(address).catch(() => ({ completed: 0, failed: 0 }));
        if (!live) return;
        setState({ address, challenges: all, fundedCount: contributions.filter((amount) => amount > 0n).length, reputation });
      })().catch(() => {
        if (live) setState({ address, ...EMPTY_PROFILE });
      });
    }, 0);
    return () => {
      live = false;
      window.clearTimeout(initial);
    };
  }, [address]);

  const stateMatchesAddress = Boolean(address && state.address?.toLowerCase() === address.toLowerCase());
  const visibleState = stateMatchesAddress ? state : { address, ...EMPTY_PROFILE };
  const loading = Boolean(address) && !stateMatchesAddress;

  const mine = useMemo(() => {
    if (!address) return [];
    const normalized = address.toLowerCase();
    return visibleState.challenges.filter((item) => item.creator.toLowerCase() === normalized || item.submissions.some((proof) => proof.submitter.toLowerCase() === normalized));
  }, [address, visibleState.challenges]);

  const ownActivity = activity.filter((item) => !item.address || item.address.toLowerCase() === address?.toLowerCase());
  const created = address ? visibleState.challenges.filter((item) => item.creator.toLowerCase() === address.toLowerCase()).length : 0;
  const submitted = address ? visibleState.challenges.reduce((sum, item) => sum + item.submissions.filter((proof) => proof.submitter.toLowerCase() === address.toLowerCase()).length, 0) : 0;

  if (!address) return <main className="inner-page profile-page"><section className="profile-connect panel"><span className="eyebrow">Your onchain workspace</span><h1>Connect your wallet.<br /><em>See everything you proved.</em></h1><p>Created challenges, contributions and proof submissions are read from the ChallengePool contract. Local transaction history is shown separately for explorer links.</p><button className="button button-primary" onClick={() => void connect()} disabled={connecting}>{connecting ? "Connecting…" : "Connect wallet ↗"}</button></section></main>;

  return <main className="inner-page profile-page">
    <section className="profile-hero">
      <div><span className="kicker"><i /> BRADBURY PROFILE · ONCHAIN STATE</span><h1>{shortAddress(address)}</h1><p>Challenges you created, pools you funded and immutable proofs you submitted, derived from the deployed ChallengePool.</p></div>
      <Link className="button button-primary" href="/create">Create another challenge ↗</Link>
    </section>
    <section className="profile-stats">
      <article><span>Created</span><b>{loading ? "…" : created}</b></article><article><span>Funded</span><b>{loading ? "…" : visibleState.fundedCount}</b></article><article><span>Proofs</span><b>{loading ? "…" : submitted}</b></article><article><span>Completed</span><b>{loading ? "…" : visibleState.reputation.completed}</b></article>
    </section>
    <div className="profile-grid">
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">My challenges</span><h2>Markets & attempts</h2></div></div>{loading ? <div className="empty-state"><b>Reading contract state…</b></div> : mine.length ? <div className="profile-markets">{mine.map((item) => <Link href={`/challenge/${item.id}`} key={item.id}><span className={`status-pill status-${item.status.toLowerCase()}`}>{statusLabel[item.status]}</span><strong>{item.title}</strong><small>{formatPool(item.poolWei)} GEN · {timeLeft(item.deadline)}</small></Link>)}</div> : <div className="empty-state"><b>No challenge activity yet.</b><span>Create a market or submit a proof to populate this profile.</span><Link className="text-link" href="/create">Create your first challenge →</Link></div>}</section>
      <aside className="panel"><span className="eyebrow">Signed from this browser</span><h2>Transactions</h2><div className="activity-list">{ownActivity.length ? ownActivity.map((item) => <a href={`${explorerBase}/tx/${item.hash}`} target="_blank" rel="noreferrer" key={`${item.hash}-${item.time}`}><strong>{item.label}</strong><small>{new Date(item.time).toLocaleString()} ↗</small></a>) : <p>Your next signed action will appear here.</p>}</div><p className="form-note">Failed: {visibleState.reputation.failed} · reputation counters are contract-derived.</p></aside>
    </div>
  </main>;
}
