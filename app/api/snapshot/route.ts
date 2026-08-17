import { createHash } from "node:crypto";

const MAX_BYTES = 2_000_000;

function isImmutableUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.hostname === "raw.githubusercontent.com") {
      return /^\/[\w.-]+\/[\w.-]+\/[0-9a-f]{40}\//i.test(url.pathname);
    }
    if (url.hostname === "arweave.net") return /^\/[A-Za-z0-9_-]{43}\/?$/.test(url.pathname);
    if (url.hostname === "ipfs.io" || url.hostname.endsWith(".ipfs.dweb.link")) {
      return /(?:\/ipfs\/|^\/)(bafy|Qm)[A-Za-z0-9]+/.test(url.pathname);
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: { snapshotUri?: string };
  try {
    body = (await request.json()) as { snapshotUri?: string };
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const snapshotUri = body.snapshotUri?.trim() ?? "";
  if (!isImmutableUrl(snapshotUri)) {
    return Response.json({
      ok: false,
      error: "Use an immutable GitHub raw URL pinned to a 40-character commit SHA, an IPFS CID, or an Arweave transaction.",
    }, { status: 422 });
  }
  try {
    const response = await fetch(snapshotUri, { redirect: "error", signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`Snapshot returned HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) throw new Error("Snapshot must be 1 byte to 2 MB.");
    return Response.json({
      ok: true,
      snapshotUri,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.byteLength,
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Snapshot fetch failed." }, { status: 422 });
  }
}
