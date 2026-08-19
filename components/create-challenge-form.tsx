"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "./wallet-provider";
import { genToWei, readClient, requireContractAddress, waitForAccepted } from "@/lib/genlayer-client";
import { ensureContractV2, type ChallengeMode, type ChecklistItem } from "@/lib/challenge-state";

type DraftState = {
  checklist?: ChecklistItem[];
  status?: string;
  verdict?: { unverifiable?: string[] } | null;
};

export function CreateChallengeForm() {
  const router = useRouter();
  const { send } = useWallet();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [draftTx, setDraftTx] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", rules: "", deadline: "", mode: "BEST_AT_DEADLINE" as ChallengeMode, minScore: "75", pool: "0.01",
  });

  function makeChallengeId() {
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "challenge";
    return `${slug}-${Date.now().toString(36).slice(-6)}`;
  }

  async function draft(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setIssues([]);
    setFormError(null);
    try {
      await ensureContractV2();
      const deadline = Math.floor(new Date(form.deadline).getTime() / 1000);
      if (!Number.isFinite(deadline)) throw new Error("Choose a valid deadline.");
      const nextId = makeChallengeId();
      setChallengeId(nextId);
      const hash = await send("Generate challenge checklist", async (client) => client.writeContract({
        address: requireContractAddress(),
        functionName: "draft_challenge",
        args: [nextId, form.title, form.rules, deadline, form.mode, Number(form.minScore)],
        value: 0n,
      }) as Promise<`0x${string}`>);
      setDraftTx(hash);
      await waitForAccepted(hash);
      const stored = await readClient.readContract({
        address: requireContractAddress(), functionName: "get_challenge", args: [nextId], jsonSafeReturn: true,
      }) as DraftState;
      if (!Array.isArray(stored?.checklist) || stored.checklist.length === 0) {
        throw new Error("The contract did not return a judgeable checklist.");
      }
      setChecklist(stored.checklist);
      setIssues(Array.isArray(stored.verdict?.unverifiable) ? stored.verdict.unverifiable : []);
      setStep(2);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Challenge draft failed.");
    } finally { setBusy(false); }
  }

  async function confirm() {
    setBusy(true);
    setFormError(null);
    try {
      if (issues.length > 0) throw new Error("Revise the rules before funding; the contract marked material requirements unverifiable.");
      const hash = await send("Confirm rubric and open funding", async (client) => client.writeContract({
        address: requireContractAddress(), functionName: "confirm_challenge", args: [challengeId], value: genToWei(form.pool),
      }) as Promise<`0x${string}`>);
      await waitForAccepted(hash);
      router.push(`/challenge/${challengeId}`);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Challenge confirmation failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="create-layout">
      <div className="step-rail" aria-label="Creation progress">
        <div className={step === 1 ? "active" : "done"}><b>01</b><span>Describe outcome</span></div>
        <div className={step === 2 ? "active" : ""}><b>02</b><span>Review rubric</span></div>
        <div><b>03</b><span>Open funding</span></div>
      </div>

      {step === 1 ? (
        <form className="panel form-panel" onSubmit={draft}>
          <span className="eyebrow">Step 01 · Natural-language rules</span>
          <h1>What should the world prove?</h1>
          <p className="lead">Describe a public outcome. GenLayer consensus will turn it into a weighted, judgeable checklist before a single GEN enters the pool.</p>
          <label>Challenge title<input required minLength={6} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Publish the clearest field guide to…" /></label>
          <label>Rules and success conditions<textarea required minLength={40} maxLength={4000} rows={7} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="The submission must be public, technically accurate, and demonstrate…" /></label>
          <div className="form-grid three">
            <label>Deadline<input required type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
            <label>Settlement<select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as ChallengeMode })}><option value="BEST_AT_DEADLINE">Best at deadline</option><option value="FIRST_PASS">First passing proof</option><option value="SPLIT">Proportional split</option></select></label>
            <label>Passing score<input type="number" min="50" max="100" value={form.minScore} onChange={(e) => setForm({ ...form, minScore: e.target.value })} /></label>
          </div>
          <button className="button button-primary wide" disabled={busy}>{busy ? "Consensus starting…" : "Generate judgeable rubric ↗"}</button>
          {formError ? <p className="form-error">{formError}</p> : null}
          <p className="form-note">This sends a real nondeterministic Bradbury transaction. The contract requires at least one REQUIRED criterion and blocks funding if material rules are unverifiable.</p>
        </form>
      ) : (
        <section className="panel rubric-review">
          <span className="eyebrow">Step 02 · Creator confirmation</span>
          <div className="review-heading"><div><h1>This is exactly how your challenge will be judged.</h1><p className="lead">Every REQUIRED row is a hard gate in addition to the passing score. Confirmation makes this rubric immutable.</p></div><span className="consensus-seal">CONSENSUS<br />PROPOSED</span></div>
          <div className="rubric-list">
            {checklist.map((item) => <div className="rubric-row" key={item.id}><span className="rubric-kind">{item.kind}</span><p>{item.criterion}</p><strong>{item.weight}<small>%</small></strong></div>)}
          </div>
          {issues.length ? <div className="safety-banner"><strong>Revision required before funding</strong>{issues.map((item) => <p key={item}>{item}</p>)}</div> : null}
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="confirm-bar">
            <label>Initial pool (GEN)<input required inputMode="decimal" value={form.pool} onChange={(e) => setForm({ ...form, pool: e.target.value })} /></label>
            <button className="button button-ghost" onClick={() => setStep(1)}>Revise rules</button>
            <button className="button button-primary" onClick={() => void confirm().catch(() => undefined)} disabled={busy || issues.length > 0}>{busy ? "Opening…" : "Confirm & fund"}</button>
          </div>
          {draftTx ? <small className="mono-note">Draft transaction: {draftTx}</small> : null}
        </section>
      )}
    </div>
  );
}
