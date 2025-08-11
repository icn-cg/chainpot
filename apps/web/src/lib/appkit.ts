"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { polygonAmoy } from "@reown/appkit/networks";

const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ||
  "";

const metadata = {
  name: "ChainPots",
  description: "Private FPL pots",
  url: process.env.NEXT_PUBLIC_DAPP_URL || "http://localhost:3000",
  icons: ["https://walletconnect.com/walletconnect-logo.png"],
};

const networks = [polygonAmoy] as any;
const ethersAdapter = new EthersAdapter();

// Initialize only if we have a projectId (avoid runtime crash)
let appkit: any = null;
if (projectId) {
  appkit = createAppKit({
    adapters: [ethersAdapter],
    networks,
    projectId,
    metadata,
    features: { analytics: true },
  });
} else {
  console.warn("Reown/AppKit: missing projectId — modal disabled.");
}

export { appkit };

export function openAppKit() {
  if (!appkit) {
    alert(
      "WalletConnect is not configured.\nSet NEXT_PUBLIC_REOWN_PROJECT_ID (or NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) in apps/web/.env.local and restart."
    );
    return;
  }
  appkit.open();
}
