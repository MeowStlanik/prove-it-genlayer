"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { challenges } from "@/lib/demo-data";
import { explorerBase, shortAddress } from "@/lib/genlayer-client";
import { useWallet } from "./wallet-provider";

type Activity = { label: string; hash: string; address?: string; time: string };

export function ProfileView() {
  const { address, connect, connecting } = useWallet();
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    const read = () => {
      try { setActivity(JSON.parse(localStorage.getItem("prove-it-activity") ?? "[]") as Activity[]); }
      catch { setActivity([]); }
    };
    read();
    window.addEventListener("prove-it-activity", read);
    return () => window.removeEventListener("prove-it-activity", read);
  }, []);

  const mine = useMemo(() => {
    if (!address) return [];
    const compact = `${address.slice(0, 6)}…${address.slice(-4)}`.toLowerCase();
    return challenges.filter((item) => item.creator.toLowerCase() === compact || item.submissions.some((proof) => proof.submitter.toLowerCase() === compact));
  }, [address]);

  const ownActivity = activity.filter((item) => !item.address || item.address.toLowerCase() === address?.toLowerCase());
  const counters = {
    created: ownActivity.filter((item) => item.label.includes("challenge") || item.label.includes("rubric")).length,
    funded: ownActivity.filter((item) => item.label === "Fund challenge").length,
    submitted: ownActivity.filter((item) => item.label === "Submit immutable proof").length,
  };

  if (!address) return <main className="inner-page profile-page"><section className="profile-connect panel"><span className="eyebrow">Your onchain workspace</span><h1>Connect your wallet.<br /><em>See everything you proved.</em></h1><p>Created challenges, funding and proof submissions stay grouped by the wallet that signed each transaction.</p><button className="button button-primary" onClick={() => void connect()}>{connecting ? "Connecting…" : "Connect wallet ↗"}</button></section></main>;

  return <main className="inner-page profile-page">
    <section className="profile-hero">
      <div><span className="kicker"><i /> BRADBURY PROFILE</span><h1>{shortAddress(address)}</h1><p>Challenges you created, pools you funded and immutable proofs you submitted from this browser.</p></div>
      <Link className="button button-primary" href="/create">Create another challenge ↗</Link>
    </section>
    <section className="profile-stats">
      <article><span>Created</span><b>{counters.created}</b></article><article><span>Funded</span><b>{counters.funded}</b></article><article><span>Proofs</span><b>{counters.submitted}</b></article><article><span>Network</span><b>Bradbury</b></article>
    </section>
    <div className="profile-grid">
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">My challenges</span><h2>Markets & attempts</h2></div></div>{mine.length ? <div className="profile-markets">{mine.map((item) => <Link href={`/challenge/${item.id}`} key={item.id}><span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span><strong>{item.title}</strong><small>{item.pool} GEN · {item.timeLeft}</small></Link>)}</div> : <div className="empty-state"><b>No challenge activity yet.</b><span>Create a market or submit a proof to populate this profile.</span><Link className="text-link" href="/create">Create your first challenge →</Link></div>}</section>
      <aside className="panel"><span className="eyebrow">Signed activity</span><h2>Transactions</h2><div className="activity-list">{ownActivity.length ? ownActivity.map((item) => <a href={`${explorerBase}/tx/${item.hash}`} target="_blank" rel="noreferrer" key={`${item.hash}-${item.time}`}><strong>{item.label}</strong><small>{new Date(item.time).toLocaleString()} ↗</small></a>) : <p>Your next signed action will appear here.</p>}</div></aside>
    </div>
  </main>;
}
