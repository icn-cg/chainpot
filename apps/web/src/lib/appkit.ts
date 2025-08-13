"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { polygonAmoy } from "@reown/appkit/networks";

// Get project ID and ensure it's valid
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error("Missing project ID: Set NEXT_PUBLIC_REOWN_PROJECT_ID in .env.local");
}

const metadata = {
  name: "ChainPool",
  description: "Private funding pools",
  url: process.env.NEXT_PUBLIC_DAPP_URL || "http://localhost:3000",
  icons: ["https://walletconnect.com/walletconnect-logo.png"],
};

const networks = [polygonAmoy] as any;
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
    alert("WalletConnect is not properly configured.");
    return;
  }
  appkit.open();
}
