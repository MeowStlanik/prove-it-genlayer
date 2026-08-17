"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { createClient } from "genlayer-js";
import { connectWallet, explorerBase, restoreWallet, shortAddress, waitForAccepted } from "@/lib/genlayer-client";

type Client = ReturnType<typeof createClient>;
type TxState = {
  label: string;
  hash: `0x${string}`;
  stage: "SUBMITTED" | "ACCEPTED" | "ERROR";
  detail?: string;
};

type WalletContextValue = {
  address: `0x${string}` | null;
  client: Client | null;
  connecting: boolean;
  tx: TxState | null;
  connect: () => Promise<Client>;
  send: (label: string, action: (client: Client) => Promise<`0x${string}`>) => Promise<`0x${string}`>;
  clearTx: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [tx, setTx] = useState<TxState | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const connected = await connectWallet();
      setAddress(connected.address);
      setClient(connected.client);
      return connected.client;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The wallet could not connect to Bradbury.";
      setTx({ label: "Connect wallet", hash: "0x" as `0x${string}`, stage: "ERROR", detail });
      throw error;
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    let live = true;
    void restoreWallet().then((connected) => {
      if (!live || !connected) return;
      setAddress(connected.address);
      setClient(connected.client);
    }).catch(() => undefined);
    const provider = typeof window !== "undefined" ? window.ethereum : undefined;
    const handleWalletChange = () => {
      setAddress(null);
      setClient(null);
      void restoreWallet().then((connected) => {
        if (!connected) return;
        setAddress(connected.address);
        setClient(connected.client);
      }).catch(() => undefined);
    };
    provider?.on?.("accountsChanged", handleWalletChange);
    provider?.on?.("chainChanged", handleWalletChange);
    return () => {
      live = false;
      provider?.removeListener?.("accountsChanged", handleWalletChange);
      provider?.removeListener?.("chainChanged", handleWalletChange);
    };
  }, []);

  const send = useCallback(
    async (label: string, action: (activeClient: Client) => Promise<`0x${string}`>) => {
      try {
        let activeClient = client;
        let activeAddress = address;
        if (!activeClient) {
          const connected = await connectWallet();
          setAddress(connected.address);
          setClient(connected.client);
          activeClient = connected.client;
          activeAddress = connected.address;
        }
        const hash = await action(activeClient);
        const history = JSON.parse(localStorage.getItem("prove-it-activity") ?? "[]") as unknown[];
        localStorage.setItem("prove-it-activity", JSON.stringify([{ label, hash, address: activeAddress, time: new Date().toISOString() }, ...history].slice(0, 50)));
        window.dispatchEvent(new Event("prove-it-activity"));
        setTx({ label, hash, stage: "SUBMITTED", detail: "Validator consensus is running." });
        void waitForAccepted(hash)
          .then(() => setTx({ label, hash, stage: "ACCEPTED", detail: "Accepted. The native appeal window is open." }))
          .catch((error: unknown) => {
            const detail = error instanceof Error ? error.message : "Receipt polling timed out; the transaction is still trackable.";
            setTx({ label, hash, stage: "SUBMITTED", detail });
          });
        return hash;
      } catch (error) {
        const message = error instanceof Error ? error.message : "The wallet rejected the transaction.";
        setTx({ label, hash: "0x" as `0x${string}`, stage: "ERROR", detail: message });
        throw error;
      }
    },
    [address, client],
  );

  const value = useMemo(
    () => ({ address, client, connecting, tx, connect, send, clearTx: () => setTx(null) }),
    [address, client, connecting, tx, connect, send],
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      {tx ? (
        <aside className={`tx-dock ${tx.stage === "ERROR" ? "tx-error" : ""}`} aria-live="polite">
          <button className="tx-close" onClick={() => setTx(null)} aria-label="Close transaction status">×</button>
          <span className="eyebrow">{tx.stage === "ERROR" ? "Wallet error" : "Bradbury transaction"}</span>
          <strong>{tx.label}</strong>
          <p>{tx.detail}</p>
          {tx.hash !== "0x" ? (
            <a href={`${explorerBase}/tx/${tx.hash}`} target="_blank" rel="noreferrer">Open in explorer ↗</a>
          ) : null}
        </aside>
      ) : null}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}

export function WalletButton() {
  const { address, connecting, connect } = useWallet();
  return (
    <button className="wallet-button" onClick={() => void connect().catch(() => undefined)} disabled={connecting}>
      <span className={`wallet-dot ${address ? "online" : ""}`} />
      {address ? shortAddress(address) : connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
