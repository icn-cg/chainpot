"use client";
import React from "react";
import { useParams } from "next/navigation";
import PotView from "../../../components/PotView";
import Link from "next/link";


import ConnectionBanner from "../../../components/ConnectionBanner";
import { useWallet } from "../../../components/WalletProvider";

export default function PotPage() {
  const { addr } = useParams<{ addr: string }>();
  const { isConnected } = useWallet();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Pot</h1>
      </div>
  <ConnectionBanner show={!isConnected} message="Connect a wallet to see your balances." />
      <PotView address={addr} />
      <div>
        <Link className="px-3 py-2 rounded border border-gray-300 inline-block" href={`/pot/${addr}/admin`}>
          Admin
        </Link>
      </div>
    </div>
  );
}
