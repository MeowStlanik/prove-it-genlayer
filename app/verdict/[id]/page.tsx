import { VerdictView } from "@/components/verdict-view";
import { getChallenge } from "@/lib/demo-data";

export default async function VerdictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VerdictView challenge={getChallenge(id)} />;
}
