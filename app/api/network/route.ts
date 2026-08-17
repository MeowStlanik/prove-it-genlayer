import bradburyDeployment from "@/deployment/bradbury.json";

const CHAIN_RPC = "https://rpc.testnet-chain.genlayer.com";

async function rpc(method: string, params: unknown[]) {
  const response = await fetch(CHAIN_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`RPC returned ${response.status}`);
  const payload = (await response.json()) as { result?: string; error?: { message?: string } };
  if (payload.error || !payload.result) throw new Error(payload.error?.message ?? "Missing RPC result");
  return payload.result;
}

export async function GET() {
  try {
    const chainId = await rpc("eth_chainId", []);
    return Response.json({
      ok: chainId === `0x${bradburyDeployment.chainId.toString(16)}`,
      network: bradburyDeployment.network,
      chainId: Number.parseInt(chainId, 16),
      contractAddress: bradburyDeployment.contractAddress,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Network check failed" },
      { status: 502 },
    );
  }
}
