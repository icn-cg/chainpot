'use client';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { BrowserProvider } from 'ethers';
import { useAppKitProvider, useAppKitAccount } from '@reown/appkit/react';

type Ctx = {
  provider: BrowserProvider | null;
  address: string | null;
  setWallet: (p: BrowserProvider | null, address: string | null) => void;
};

const WalletCtx = createContext<Ctx>({ provider: null, address: null, setWallet: () => {} });

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const setWallet = useCallback((p: BrowserProvider | null, addr: string | null) => {
    setProvider(p);
    setAddress(addr);
  }, []);

  const value = useMemo(() => ({ provider, address, setWallet }), [provider, address, setWallet]);
  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export type WalletState = {
  isConnected: boolean;
  address: string | null;
  provider: BrowserProvider | null;
};

// Read: merge context (injected/AppKit pushed by ConnectBar) with AppKit fallback
export function useÍWallet(): WalletState {
  const ctx = useContext(WalletCtx);
  const { walletProvider } = useAppKitProvider('eip155');
  const { address, isConnected } = useAppKitAccount();

  const appKitProvider = useMemo(() => {
    if (!walletProvider || !isConnected) return null;
    try {
      return new BrowserProvider(walletProvider as any);
    } catch {
      return null;
    }
  }, [walletProvider, isConnected]);

  const effectiveProvider = ctx.provider ?? appKitProvider;
  const effectiveAddress = ctx.address ?? address ?? null;
  const connected = !!effectiveProvider && !!effectiveAddress;

  return { isConnected: connected, address: effectiveAddress, provider: effectiveProvider };
}

// Write: allow header ConnectBar to push wallet state for injected or AppKit
export function useSetWallet() {
  const { setWallet } = useContext(WalletCtx);
  return setWallet;
}
