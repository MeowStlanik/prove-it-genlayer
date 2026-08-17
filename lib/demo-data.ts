export type ChallengeMode = "FIRST_PASS" | "BEST_AT_DEADLINE" | "SPLIT";
export type ChallengeStatus = "OPEN" | "JUDGING" | "FINALITY" | "RESOLVED" | "REFUNDABLE";

export type ChecklistItem = {
  id: string;
  criterion: string;
  weight: number;
  kind: "REQUIRED" | "QUALITY";
};

export type Submission = {
  id: string;
  submitter: string;
  sourceUrl: string;
  snapshotUri: string;
  submittedAt: string;
  score?: number;
};

export type Challenge = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  creator: string;
  pool: number;
  fundedPercent: number;
  deadline: string;
  timeLeft: string;
  mode: ChallengeMode;
  minScore: number;
  status: ChallengeStatus;
  accent: "lime" | "violet" | "coral" | "blue";
  checklist: ChecklistItem[];
  submissions: Submission[];
  isLive?: boolean;
};

export const challenges: Challenge[] = [
  {
    id: "smoke-guide-sws34n9",
    title: "Publish a verifiable GenLayer integration guide",
    eyebrow: "Live onchain · Open",
    description: "Publish an immutable public guide covering deployment, challenge creation, proof snapshots, semantic judging, appeals, and finality-gated settlement.",
    creator: "0xC4a9…cc48",
    pool: 0.001,
    fundedPercent: 100,
    deadline: "2026-09-16T06:33:28Z",
    timeLeft: "30d",
    mode: "BEST_AT_DEADLINE",
    minScore: 70,
    status: "OPEN",
    accent: "lime",
    isLive: true,
    checklist: [
      { id: "item_1", criterion: "The guide is published and immutable through a public, timestamped, non-editable medium.", weight: 15, kind: "REQUIRED" },
      { id: "item_2", criterion: "The guide accurately documents the contract deployment process.", weight: 15, kind: "REQUIRED" },
      { id: "item_3", criterion: "The guide accurately documents the challenge creation process.", weight: 15, kind: "REQUIRED" },
      { id: "item_4", criterion: "The guide accurately documents proof snapshot requirements.", weight: 15, kind: "REQUIRED" },
      { id: "item_5", criterion: "The guide accurately documents semantic judging procedures.", weight: 15, kind: "REQUIRED" },
      { id: "item_6", criterion: "The guide accurately documents appeals and finality-gated settlement with public evidence.", weight: 25, kind: "REQUIRED" },
    ],
    submissions: [],
  },
  {
    id: "genlayer-field-guide",
    title: "Publish the clearest field guide to GenLayer consensus",
    eyebrow: "Writing · Open",
    description:
      "Create a public, technically accurate guide that explains Optimistic Democracy to a smart contract developer in under 1,500 words.",
    creator: "0x6A2f…18C9",
    pool: 184.6,
    fundedPercent: 92,
    deadline: "2026-08-22T18:00:00Z",
    timeLeft: "4d 13h",
    mode: "BEST_AT_DEADLINE",
    minScore: 70,
    status: "OPEN",
    accent: "lime",
    checklist: [
      { id: "public", criterion: "The immutable snapshot is publicly readable.", weight: 15, kind: "REQUIRED" },
      { id: "mechanics", criterion: "Explains leader, validators, equivalence, appeals, and finality accurately.", weight: 35, kind: "REQUIRED" },
      { id: "example", criterion: "Includes at least one concrete Intelligent Contract example.", weight: 20, kind: "REQUIRED" },
      { id: "clarity", criterion: "Uses a clear structure and stays below 1,500 words.", weight: 30, kind: "QUALITY" },
    ],
    submissions: [
      { id: "proof_1", submitter: "0x91b4…2A10", sourceUrl: "https://example.com/guide", snapshotUri: "https://raw.githubusercontent.com/example/proofs/2a4c/guide.md", submittedAt: "2h ago" },
      { id: "proof_2", submitter: "0x3D8c…99F1", sourceUrl: "https://example.com/notes", snapshotUri: "https://raw.githubusercontent.com/example/proofs/841e/notes.md", submittedAt: "47m ago" },
    ],
  },
  {
    id: "wallet-recovery-spec",
    title: "Ship a threat model for social wallet recovery",
    eyebrow: "Security · Finality",
    description:
      "Produce an actionable threat model covering guardians, collusion, compromise, liveness, and recovery delays.",
    creator: "0xBC72…10E4",
    pool: 96.0,
    fundedPercent: 100,
    deadline: "2026-08-17T02:00:00Z",
    timeLeft: "Finality 14m",
    mode: "BEST_AT_DEADLINE",
    minScore: 75,
    status: "FINALITY",
    accent: "violet",
    checklist: [
      { id: "public", criterion: "A public immutable document is available.", weight: 10, kind: "REQUIRED" },
      { id: "threats", criterion: "Covers at least five distinct attacker capabilities.", weight: 35, kind: "REQUIRED" },
      { id: "controls", criterion: "Maps each material threat to a concrete control.", weight: 35, kind: "REQUIRED" },
      { id: "tradeoffs", criterion: "Explains usability and security trade-offs.", weight: 20, kind: "QUALITY" },
    ],
    submissions: [
      { id: "spec_a", submitter: "0xA431…9C2D", sourceUrl: "https://example.com/spec-a", snapshotUri: "https://raw.githubusercontent.com/example/proofs/a431/spec.md", submittedAt: "3d ago", score: 92 },
      { id: "spec_b", submitter: "0x17A0…F721", sourceUrl: "https://example.com/spec-b", snapshotUri: "https://raw.githubusercontent.com/example/proofs/17a0/spec.md", submittedAt: "2d ago", score: 78 },
      { id: "spec_c", submitter: "0x77e1…8C02", sourceUrl: "https://example.com/spec-c", snapshotUri: "https://raw.githubusercontent.com/example/proofs/77e1/spec.md", submittedAt: "1d ago", score: 55 },
    ],
  },
  {
    id: "open-source-index",
    title: "Map 25 production-ready agent infrastructure projects",
    eyebrow: "Research · Open",
    description: "Build a sourced index with project purpose, license, activity signal, and one-line technical assessment.",
    creator: "0xE912…AA71",
    pool: 62.4,
    fundedPercent: 71,
    deadline: "2026-08-25T12:00:00Z",
    timeLeft: "7d 7h",
    mode: "SPLIT",
    minScore: 80,
    status: "OPEN",
    accent: "blue",
    checklist: [
      { id: "count", criterion: "Contains at least 25 distinct project entries.", weight: 25, kind: "REQUIRED" },
      { id: "sources", criterion: "Each entry links to an immutable repository revision.", weight: 30, kind: "REQUIRED" },
      { id: "fields", criterion: "Every entry includes purpose, license, and activity signal.", weight: 25, kind: "REQUIRED" },
      { id: "quality", criterion: "Technical assessments are specific and non-promotional.", weight: 20, kind: "QUALITY" },
    ],
    submissions: [],
  },
  {
    id: "failed-proof-demo",
    title: "Prove a public API supports signed webhook retries",
    eyebrow: "Engineering · Refundable",
    description: "Submit immutable documentation and a reproducible request trace proving all required retry semantics.",
    creator: "0x2B11…440C",
    pool: 40.0,
    fundedPercent: 100,
    deadline: "2026-08-15T12:00:00Z",
    timeLeft: "Closed",
    mode: "FIRST_PASS",
    minScore: 85,
    status: "REFUNDABLE",
    accent: "coral",
    checklist: [
      { id: "docs", criterion: "Immutable official documentation describes signed webhooks.", weight: 35, kind: "REQUIRED" },
      { id: "retry", criterion: "Evidence proves exponential retry for at least 24 hours.", weight: 40, kind: "REQUIRED" },
      { id: "trace", criterion: "A reproducible signed request trace is included.", weight: 25, kind: "REQUIRED" },
    ],
    submissions: [
      { id: "attempt_1", submitter: "0x890A…B771", sourceUrl: "https://example.com/docs", snapshotUri: "https://raw.githubusercontent.com/example/proofs/890a/docs.md", submittedAt: "4d ago", score: 60 },
    ],
  },
];

export const getChallenge = (id: string) => challenges.find((challenge) => challenge.id === id) ?? challenges[0];

export const statusLabel: Record<ChallengeStatus, string> = {
  OPEN: "Accepting proof",
  JUDGING: "Consensus running",
  FINALITY: "Awaiting finality",
  RESOLVED: "Settled",
  REFUNDABLE: "Refunds open",
};

export const modeLabel: Record<ChallengeMode, string> = {
  FIRST_PASS: "First passing proof",
  BEST_AT_DEADLINE: "Best at deadline",
  SPLIT: "Proportional split",
};
