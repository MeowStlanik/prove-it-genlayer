import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("wallet connection uses the injected provider without the legacy Snap handshake", async () => {
  const source = await readFile(new URL("../lib/genlayer-client.ts", import.meta.url), "utf8");
  assert.match(source, /eth_requestAccounts/);
  assert.match(source, /wallet_switchEthereumChain/);
  assert.doesNotMatch(source, /client\.connect\(/);
});

test("marketplace and detail views hydrate challenge state from the contract", async () => {
  const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const state = await readFile(new URL("../lib/challenge-state.ts", import.meta.url), "utf8");
  const detail = await readFile(new URL("../components/challenge-detail.tsx", import.meta.url), "utf8");
  assert.match(home, /readAllChallenges/);
  assert.match(state, /get_challenge_ids/);
  assert.match(state, /get_submission_ids/);
  assert.match(detail, /functionName: "judge", args: \[challenge\.id\]/);
});

test("static demo challenge records were removed", async () => {
  await assert.rejects(access(new URL("../lib/demo-data.ts", import.meta.url)));
});
