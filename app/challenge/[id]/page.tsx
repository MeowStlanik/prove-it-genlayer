import { ChallengeDetail } from "@/components/challenge-detail";
import { getChallenge } from "@/lib/demo-data";

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChallengeDetail challenge={getChallenge(id)} />;
}
