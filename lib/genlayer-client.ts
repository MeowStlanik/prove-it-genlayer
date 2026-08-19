"use client";

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import type { TransactionHash } from "genlayer-js/types";
import bradburyDeployment from "@/deployment/bradbury.json";

const bundledAddress = bradburyDeployment.contractVersion === 2 ? bradburyDeployment.contractAddress : "";
export const contractAddress = (process.env.NEXT_PUBLIC_CHALLENGE_POOL_ADDRESS || bundledAddress) as `0x${string}`;
export const explorerBase = "https://explorer-bradbury.genlayer.com";

export function requireContractAddress() {
  if (!contractAddress) {
    throw new Error("Deploy ChallengePool v2 and set NEXT_PUBLIC_CHALLENGE_POOL_ADDRESS. The bundled Bradbury deployment is the pre-fix v1 contract.");
  }
  return contractAddress;
}

export const readClient = createClient({ chain: testnetBradbury });

export function requireWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("A browser wallet such as MetaMask is required.");
  }
  return window.ethereum;
}

async function ensureBradburyNetwork(provider: EthereumProvider) {
  const chainId = `0x${testnetBradbury.id.toString(16)}`;
  const current = await provider.request({ method: "eth_chainId" }) as string;
  if (current.toLowerCase() === chainId) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? Number((error as { code: unknown }).code) : 0;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId,
        chainName: testnetBradbury.name,
        nativeCurrency: testnetBradbury.nativeCurrency,
        rpcUrls: [...testnetBradbury.rpcUrls.default.http],
        blockExplorerUrls: testnetBradbury.blockExplorers?.default.url ? [testnetBradbury.blockExplorers.default.url] : [],
      }],
    });
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  }
}

function walletClient(address: `0x${string}`, provider: EthereumProvider) {
  return createClient({ chain: testnetBradbury, account: address, provider });
}

export async function connectWallet() {
  const provider = requireWallet();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts[0]) throw new Error("No wallet account was returned.");
  const address = accounts[0] as `0x${string}`;
  await ensureBradburyNetwork(provider);
  return { address, client: walletClient(address, provider) };
}

export async function restoreWallet() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
  if (!accounts[0]) return null;
  const address = accounts[0] as `0x${string}`;
  await ensureBradburyNetwork(window.ethereum);
  return { address, client: walletClient(address, window.ethereum) };
}

export async function waitForAccepted(hash: `0x${string}`) {
  const receipt = await readClient.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    interval: 5_000,
    retries: 24,
  });
  if (receipt.txExecutionResultName && receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(`Transaction was accepted with ${receipt.txExecutionResultName}.`);
  }
  return receipt;
}

export async function waitForFinalized(hash: `0x${string}`) {
  const receipt = await readClient.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.FINALIZED,
    interval: 10_000,
    retries: 360,
  });
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(`Transaction finalized with ${receipt.txExecutionResultName ?? "an unknown execution result"}.`);
  }
  return receipt;
}

export function shortAddress(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

export function genToWei(value: string) {
  if (!/^\d+(\.\d{0,18})?$/.test(value.trim())) throw new Error("Enter a valid GEN amount.");
  const [whole = "0", fraction = ""] = value.trim().split(".");
  const decimals = (fraction + "0".repeat(18)).slice(0, 18);
  return BigInt(whole || "0") * 10n ** 18n + BigInt(decimals || "0");
}

export function weiToGen(value: bigint) {
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
