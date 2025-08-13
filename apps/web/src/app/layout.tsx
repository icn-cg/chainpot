import React from "react";
import ConnectBar from "../components/ConnectBar";
import "./globals.css";
import ReownProvider from "../components/ReownProvider";

export const metadata = {
  title: "ChainPool",
  description: "Friends-only FPL pots on-chain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReownProvider>
          <header className="flex justify-between items-center p-3 border-b border-gray-200">
            <a href="/" className="font-bold">ChainPool</a>
            <ConnectBar />
          </header>
          <main className="max-w-3xl mx-auto p-4">{children}</main>
        </ReownProvider>
      </body>
    </html>
  );
}
