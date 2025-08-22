'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import PoolView from '../../../components/PoolView';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ConnectionBanner from '../../../components/ConnectionBanner';
import { useWallet } from '../../../components/WalletProvider';

export default function PotPage() {
  const { addr } = useParams<{ addr: string }>();
  const { isConnected } = useWallet();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Pool Details</h1>
        <Link href={`/pool/${addr}/admin`}>
          <Button variant="outline">Admin Panel</Button>
        </Link>
      </div>

      <ConnectionBanner
        show={!isConnected}
        message="Connect a wallet to contribute to this pool and see your balances."
      />

      <PoolView address={addr} />
    </div>
  );
}
