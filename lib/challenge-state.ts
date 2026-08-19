"use client";

import { readClient, requireContractAddress, weiToGen } from "@/lib/genlayer-client";

export type ChallengeMode = "FIRST_PASS" | "BEST_AT_DEADLINE" | "SPLIT";
export type ChallengeStatus = "NEEDS_REVISION" | "DRAFT" | "OPEN" | "RETRYABLE" | "RESOLVED" | "REFUNDABLE";
export type CriterionStatus = "MET" | "NOT_MET" | "UNVERIFIABLE";

export type ChecklistItem = {
  id: string;
  criterion: string;
  weight: number;
  kind: "REQUIRED" | "QUALITY";
};

export type AssessmentItem = {
  id: string;
  status: CriterionStatus;
  evidence: string;
};

export type SubmissionAssessment = {
  id: string;
  items: AssessmentItem[];
  score: number;
  summary: string;
};

export type RankingItem = {
  submission_id: string;
  score: number;
  required_met: boolean;
  eligible: boolean;
};

export type Payout = {
  submission_id: string;
  recipient: string;
  amount: bigint;
};

export type ChallengeVerdict = {
  assessment: SubmissionAssessment[];
  ranking: RankingItem[];
  payouts: Payout[];
  reason?: "PAID" | "NO_ELIGIBLE_SUBMISSION" | "UNVERIFIABLE_EVIDENCE" | "EXPIRED_WITHOUT_SETTLEMENT" | string;
  retryable?: boolean;
  unverifiable?: string[];
};

export type Submission = {
  id: string;
  submitter: string;
  sourceUrl: string;
  snapshotUri: string;
  snapshotSha256: string;
  note: string;
  submittedAt: number;
  score?: number;
  assessment?: SubmissionAssessment;
};

export type Challenge = {
  id: string;
  title: string;
  rulesText: string;
  creator: string;
  poolWei: bigint;
  deadline: number;
  expiryAt: number;
  mode: ChallengeMode;
  minScore: number;
  status: ChallengeStatus;
  checklist: ChecklistItem[];
  submissions: Submission[];
  verdict: ChallengeVerdict | null;
  createdAt: number;
  confirmedAt: number;
  judgedAt: number;
};

type RawChallenge = {
  id?: unknown;
  creator?: unknown;
  title?: unknown;
  rules_text?: unknown;
  checklist?: unknown;
  mode?: unknown;
  min_score?: unknown;
  deadline?: unknown;
  expiry_at?: unknown;
  status?: unknown;
  pool?: unknown;
  submission_count?: unknown;
  verdict?: unknown;
  created_at?: unknown;
  confirmed_at?: unknown;
  judged_at?: unknown;
};

type RawSubmission = {
  id?: unknown;
  submitter?: unknown;
  source_url?: unknown;
  snapshot_uri?: unknown;
  snapshot_sha256?: unknown;
  note?: unknown;
  submitted_at?: unknown;
};

const VALID_STATUSES = new Set<ChallengeStatus>([
  "NEEDS_REVISION", "DRAFT", "OPEN", "RETRYABLE", "RESOLVED", "REFUNDABLE",
]);
const VALID_MODES = new Set<ChallengeMode>(["FIRST_PASS", "BEST_AT_DEADLINE", "SPLIT"]);
let versionCheck: Promise<void> | null = null;

function asNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
}

function asBigInt(value: unknown) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return 0n;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function parseChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const kind = source.kind === "REQUIRED" ? "REQUIRED" : source.kind === "QUALITY" ? "QUALITY" : null;
    if (!kind) return [];
    return [{
      id: asString(source.id),
      criterion: asString(source.criterion),
      weight: asNumber(source.weight),
      kind,
    }];
  });
}

function parseVerdict(value: unknown): ChallengeVerdict | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const assessment: SubmissionAssessment[] = Array.isArray(source.assessment)
    ? source.assessment.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const items: AssessmentItem[] = Array.isArray(row.items)
          ? row.items.flatMap((criterion) => {
              if (!criterion || typeof criterion !== "object") return [];
              const result = criterion as Record<string, unknown>;
              const status = result.status;
              if (status !== "MET" && status !== "NOT_MET" && status !== "UNVERIFIABLE") return [];
              return [{ id: asString(result.id), status, evidence: asString(result.evidence) }];
            })
          : [];
        return [{ id: asString(row.id), items, score: asNumber(row.score), summary: asString(row.summary) }];
      })
    : [];
  const ranking: RankingItem[] = Array.isArray(source.ranking)
    ? source.ranking.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        return [{
          submission_id: asString(row.submission_id),
          score: asNumber(row.score),
          required_met: Boolean(row.required_met),
          eligible: Boolean(row.eligible),
        }];
      })
    : [];
  const payouts: Payout[] = Array.isArray(source.payouts)
    ? source.payouts.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        return [{
          submission_id: asString(row.submission_id),
          recipient: asString(row.recipient),
          amount: asBigInt(row.amount),
        }];
      })
    : [];
  const unverifiable = Array.isArray(source.unverifiable) ? source.unverifiable.map(asString) : undefined;
  return {
    assessment,
    ranking,
    payouts,
    reason: source.reason ? asString(source.reason) : undefined,
    retryable: typeof source.retryable === "boolean" ? source.retryable : undefined,
    unverifiable,
  };
}

export function ensureContractV2() {
  if (!versionCheck) {
    versionCheck = (async () => {
      const stats = await readClient.readContract({
        address: requireContractAddress(),
        functionName: "get_stats",
        args: [],
        jsonSafeReturn: true,
      }) as { contract_version?: unknown };
      if (asNumber(stats.contract_version) !== 2) {
        throw new Error("The configured ChallengePool is not v2. Redeploy the patched contract and update NEXT_PUBLIC_CHALLENGE_POOL_ADDRESS.");
      }
    })().catch((error) => {
      versionCheck = null;
      throw error;
    });
  }
  return versionCheck;
}

async function readRawChallenge(challengeId: string) {
  return readClient.readContract({
    address: requireContractAddress(),
    functionName: "get_challenge",
    args: [challengeId],
    jsonSafeReturn: true,
  }) as Promise<RawChallenge>;
}

async function readSubmissionIds(challengeId: string) {
  const result = await readClient.readContract({
    address: requireContractAddress(),
    functionName: "get_submission_ids",
    args: [challengeId],
    jsonSafeReturn: true,
  });
  return Array.isArray(result) ? result.map(asString).filter(Boolean) : [];
}

async function readSubmission(challengeId: string, submissionId: string): Promise<Submission> {
  const raw = await readClient.readContract({
    address: requireContractAddress(),
    functionName: "get_submission",
    args: [challengeId, submissionId],
    jsonSafeReturn: true,
  }) as RawSubmission;
  return {
    id: asString(raw.id) || submissionId,
    submitter: asString(raw.submitter),
    sourceUrl: asString(raw.source_url),
    snapshotUri: asString(raw.snapshot_uri),
    snapshotSha256: asString(raw.snapshot_sha256),
    note: asString(raw.note),
    submittedAt: asNumber(raw.submitted_at),
  };
}

export async function readChallenge(challengeId: string): Promise<Challenge> {
  await ensureContractV2();
  const raw = await readRawChallenge(challengeId);
  if (!VALID_STATUSES.has(raw.status as ChallengeStatus)) throw new Error(`Unsupported challenge status: ${asString(raw.status) || "empty"}`);
  if (!VALID_MODES.has(raw.mode as ChallengeMode)) throw new Error(`Unsupported challenge mode: ${asString(raw.mode) || "empty"}`);
  const status = raw.status as ChallengeStatus;
  const mode = raw.mode as ChallengeMode;
  const verdict = parseVerdict(raw.verdict);
  const submissionIds = await readSubmissionIds(challengeId);
  const submissions = await Promise.all(submissionIds.map((submissionId) => readSubmission(challengeId, submissionId)));
  const assessmentById = new Map(verdict?.assessment.map((item) => [item.id, item]) ?? []);
  const rankingById = new Map(verdict?.ranking.map((item) => [item.submission_id, item]) ?? []);

  return {
    id: asString(raw.id) || challengeId,
    title: asString(raw.title),
    rulesText: asString(raw.rules_text),
    creator: asString(raw.creator),
    poolWei: asBigInt(raw.pool),
    deadline: asNumber(raw.deadline),
    expiryAt: asNumber(raw.expiry_at),
    mode,
    minScore: asNumber(raw.min_score),
    status,
    checklist: parseChecklist(raw.checklist),
    submissions: submissions.map((submission) => ({
      ...submission,
      score: rankingById.get(submission.id)?.score ?? assessmentById.get(submission.id)?.score,
      assessment: assessmentById.get(submission.id),
    })),
    verdict,
    createdAt: asNumber(raw.created_at),
    confirmedAt: asNumber(raw.confirmed_at),
    judgedAt: asNumber(raw.judged_at),
  };
}

export async function readChallengeIds() {
  await ensureContractV2();
  const result = await readClient.readContract({
    address: requireContractAddress(),
    functionName: "get_challenge_ids",
    args: [],
    jsonSafeReturn: true,
  });
  return Array.isArray(result) ? result.map(asString).filter(Boolean) : [];
}

export async function readAllChallenges() {
  const ids = await readChallengeIds();
  const settled = await Promise.allSettled(ids.map((id) => readChallenge(id)));
  return settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
}

export async function readContribution(challengeId: string, funder: string) {
  const result = await readClient.readContract({
    address: requireContractAddress(),
    functionName: "contribution_of",
    args: [challengeId, funder],
    jsonSafeReturn: true,
  });
  return asBigInt(result);
}

export async function readReputation(account: string) {
  const result = await readClient.readContract({
    address: requireContractAddress(),
    functionName: "reputation",
    args: [account],
    jsonSafeReturn: true,
  }) as { completed?: unknown; failed?: unknown };
  return { completed: asNumber(result.completed), failed: asNumber(result.failed) };
}

export const statusLabel: Record<ChallengeStatus, string> = {
  NEEDS_REVISION: "Needs revision",
  DRAFT: "Draft",
  OPEN: "Accepting proof",
  RETRYABLE: "Adjudication retry",
  RESOLVED: "Verdict accepted",
  REFUNDABLE: "Refunds open",
};

export const modeLabel: Record<ChallengeMode, string> = {
  FIRST_PASS: "First passing proof",
  BEST_AT_DEADLINE: "Best at deadline",
  SPLIT: "Proportional split",
};

export function formatPool(value: bigint, maximumFractionDigits = 4) {
  const raw = weiToGen(value);
  const numeric = Number(raw);
  return Number.isFinite(numeric)
    ? numeric.toLocaleString(undefined, { maximumFractionDigits })
    : raw;
}

export function timeLeft(deadline: number, now = Date.now()) {
  const ms = deadline * 1000 - now;
  if (ms <= 0) return "Deadline passed";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.ceil(hours / 24)}d`;
}

export function formatTimestamp(timestamp: number) {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleString();
}

export function challengeAccent(id: string): "lime" | "violet" | "coral" | "blue" {
  const accents = ["lime", "violet", "coral", "blue"] as const;
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return accents[hash % accents.length];
}

export function challengeEyebrow(challenge: Challenge) {
  return `${modeLabel[challenge.mode]} · ${statusLabel[challenge.status]}`;
}

export function canJudgeChallenge(challenge: Challenge, now = Date.now()) {
  if (!(["OPEN", "RETRYABLE"] as ChallengeStatus[]).includes(challenge.status)) return false;
  if (challenge.submissions.length === 0) return false;
  if (challenge.mode === "FIRST_PASS") return true;
  return now > challenge.deadline * 1000;
}

export function canExpireChallenge(challenge: Challenge, now = Date.now()) {
  if (!(["OPEN", "RETRYABLE"] as ChallengeStatus[]).includes(challenge.status)) return false;
  if (now <= challenge.deadline * 1000) return false;
  if (challenge.submissions.length === 0) return true;
  return now > challenge.expiryAt * 1000;
}
