// Types and pure wallet utilities (no JSX)
import { BrowserProvider } from 'ethers';

export type WalletState = {
  isConnected: boolean;
  address: string | null;
  provider: BrowserProvider | null;
};

export type WalletContextType = {
  provider: BrowserProvider | null;
  address: string | null;
  setWallet: (p: BrowserProvider | null, address: string | null) => void;
};
