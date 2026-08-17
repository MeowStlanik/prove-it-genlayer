import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("wallet connection uses the injected provider without the legacy Snap handshake", async () => {
  const source = await readFile(new URL("../lib/genlayer-client.ts", import.meta.url), "utf8");
  assert.match(source, /eth_requestAccounts/);
  assert.match(source, /wallet_switchEthereumChain/);
  assert.doesNotMatch(source, /client\.connect\(/);
});
