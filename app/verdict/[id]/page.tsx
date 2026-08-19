import { VerdictView } from "@/components/verdict-view";

export default async function VerdictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VerdictView challengeId={id} />;
}
