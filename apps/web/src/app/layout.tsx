import { Metadata } from 'next';
import React from 'react';
import ConnectBar from '../components/ConnectBar';
import './globals.css';
import ReownProvider from '../components/ReownProvider';
import { WalletProvider } from '../components/WalletProvider';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'Chainpool',
  description: 'Decentralized money pools with smart billing and referrals',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReownProvider>
          <WalletProvider>
            <div className="p-4 flex items-center justify-between">
              <a href="/" className="font-bold">
                Chainpool
              </a>
              <ConnectBar />
            </div>
            <main className="max-w-3xl mx-auto p-4">{children}</main>
          </WalletProvider>
        </ReownProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
