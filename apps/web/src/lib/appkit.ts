'use client';

import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { polygonAmoy, polygon } from '@reown/appkit/networks';

// Get environment configuration
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '80002');
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

// Get project ID and ensure it's valid
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error('Missing project ID: Set NEXT_PUBLIC_REOWN_PROJECT_ID in .env.local');
}

const metadata = {
  name: 'ChainPots',
  description: 'Privately funded money pools',
  url: process.env.NEXT_PUBLIC_DAPP_URL || 'http://localhost:3000',
  icons: ['https://walletconnect.com/walletconnect-logo.png'],
};

// Dynamic network configuration based on environment
const getNetworks = () => {
  if (CHAIN_ID === 31337) {
    // Local Hardhat network
    return [{
      id: 31337,
      chainId: 31337,
      name: 'Hardhat Local',
      currency: 'ETH',
      explorerUrl: '',
      rpcUrl: RPC_URL,
    }];
  } else if (CHAIN_ID === 137) {
    // Polygon Mainnet
    return [polygon];
  }
  
  // Default to Polygon Amoy for testnet (80002)
  return [polygonAmoy];
};

const networks = getNetworks() as any;
const ethersAdapter = new EthersAdapter();

// Initialize AppKit synchronously to ensure it's available for hooks
const appkit = createAppKit({
  adapters: [ethersAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true,
    allWallets: true,
    email: false, // Disable email to potentially avoid some initialization
    socials: false, // Disable socials to potentially avoid some initialization
  },
});

export { appkit };

export function openAppKit() {
  if (!appkit) {
    alert('WalletConnect is not properly configured.');
    return;
  }
  appkit.open();
}
