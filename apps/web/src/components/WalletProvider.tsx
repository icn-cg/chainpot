'use client';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { BrowserProvider } from 'ethers';
import { useAppKitProvider, useAppKitAccount } from '@reown/appkit/react';
import { WalletState, WalletContextType } from '../lib/wallet';

// Inline the provider creation to avoid export issues
function createBrowserProvider(walletProvider: any): BrowserProvider | null {
  if (!walletProvider) return null;
  try {
    return new BrowserProvider(walletProvider);
  } catch {
    return null;
  }
}

const WalletCtx = createContext<WalletContextType>({
  provider: null,
  address: null,
  setWallet: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);

  const setWallet = useCallback((p: any, addr: string | null) => {
    setProvider(p);
    setAddress(addr);
  }, []);

  const value = useMemo(() => ({ provider, address, setWallet }), [provider, address, setWallet]);
  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

// Read: merge context (injected/AppKit pushed by ConnectBar) with AppKit fallback
export function useWallet(): WalletState {
  const ctx = useContext(WalletCtx);
  const { walletProvider } = useAppKitProvider('eip155');
  const { address, isConnected } = useAppKitAccount();

  const appKitProvider = useMemo(
    () => createBrowserProvider(walletProvider && isConnected ? walletProvider : null),
    [walletProvider, isConnected]
  );

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
