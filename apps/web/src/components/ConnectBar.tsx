"use client";
import React, { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import { connectInjected, signerAddress, ensureChain } from "../lib/web3";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";
import { openAppKit } from "../lib/appkit";

type Props = { onProvider?(p: BrowserProvider | null): void };

export default function ConnectBar({ onProvider }: Props) {
  const [addr, setAddr] = useState("");
  const [error, setError] = useState("");
  const [hasInjected, setHasInjected] = useState(false);

  const { walletProvider } = useAppKitProvider("eip155");
  const { address: wcAddress, isConnected } = useAppKitAccount();

  useEffect(() => {
    setHasInjected(typeof window !== "undefined" && !!(window as any).ethereum);
  }, []);

  useEffect(() => {
    (async () => {
      if (!walletProvider || !isConnected) {
        onProvider?.(null);
        return;
      }
      const p = new BrowserProvider(walletProvider as any);
      try { await ensureChain(p); } catch {}
      (walletProvider as any)?.on?.("chainChanged", () => window.location.reload());
      onProvider?.(p);

      if (wcAddress) setAddr(wcAddress);
      else {
        try { setAddr(await signerAddress(p)); } catch {}
      }
    })();
  }, [walletProvider, isConnected, wcAddress, onProvider]);

  async function doConnectInjected() {
    try {
      setError("");
      if (!hasInjected) {
        setError("No injected wallet found. Install/enable MetaMask (or Coinbase Wallet).");
        return;
      }
      const p = await connectInjected();
      onProvider?.(p);
      setAddr(await signerAddress(p));
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  function doConnectWC() {
    setError("");
    openAppKit(); // opens the Reown/AppKit modal (WC v2)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {addr ? (
          <div className="px-3 py-2 rounded border border-gray-200">
            {addr.slice(0, 6)}…{addr.slice(-4)}
          </div>
        ) : (
          <>
            <button className="px-3 py-2 rounded border border-gray-300" onClick={doConnectInjected}>
              Connect Wallet
            </button>
            <button className="px-3 py-2 rounded border border-gray-300" onClick={doConnectWC}>
              WalletConnect
            </button>
          </>
        )}
      </div>
      {!!error && (
        <div className="text-sm px-3 py-2 rounded border border-amber-300 bg-amber-50">
          {error}
        </div>
      )}
    </div>
  );
}
