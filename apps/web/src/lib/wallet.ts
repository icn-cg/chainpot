"use client";
import { useMemo } from "react";
import { BrowserProvider } from "ethers";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";

export type WalletState = {
  isConnected: boolean;
  address: string | null;
  provider: BrowserProvider | null;
};

export function useWallet(): WalletState {
  const { walletProvider } = useAppKitProvider("eip155");
  const { address, isConnected } = useAppKitAccount();

  const provider = useMemo(() => {
    if (!walletProvider || !isConnected) return null;
    try {
      return new BrowserProvider(walletProvider as any);
    } catch {
      return null;
    }
  }, [walletProvider, isConnected]);

  return {
    isConnected: !!isConnected,
    address: address ?? null,
    provider,
  };
}
