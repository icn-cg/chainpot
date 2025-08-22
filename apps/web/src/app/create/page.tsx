'use client';
import React, { useState } from 'react';
import { BrowserProvider, Contract, type ContractTransactionReceipt, type Log } from 'ethers';
import { USDC, factoryWrite, signerAddress, toUnixTs, toUnits6 } from '../../lib/web3';
import { factoryAbi } from '../../lib/abi';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreatePoolPage() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [entry, setEntry] = useState('50');
  const [end, setEnd] = useState<string>('');
  const [token, setToken] = useState<string>(USDC);
  const [txHash, setTxHash] = useState<string>('');
  const [potAddr, setPotAddr] = useState<string>('');

  async function create() {
    try {
      if (!provider) return alert('Connect a wallet first');
      if (!end) return alert('Pick an end time');
      const endTs = toUnixTs(end);
      if (endTs <= 0n) return alert('End time is invalid');

      const fac = await factoryWrite(provider); // signer-bound
      const owner = await signerAddress(provider);
      const fee = toUnits6(entry);

      const tx = await fac.createLeague(owner, token, fee, endTs);
      const rc = (await tx.wait()) as ContractTransactionReceipt | null;
      setTxHash(rc?.hash ?? '');

      // Parse LeagueCreated event (best effort)
      let createdAddr = '';
      if (rc?.logs?.length) {
        const parsed = (rc.logs as Log[])
          .map((l: Log) => {
            try {
              return (fac as Contract).interface.parseLog(l);
            } catch {
              return null;
            }
          })
          .find(
            (ev): ev is NonNullable<ReturnType<(typeof fac)['interface']['parseLog']>> =>
              !!ev && ev.name === 'LeagueCreated'
          );
        if (parsed?.args?.league) createdAddr = String(parsed.args.league);
      }

      if (!createdAddr) {
        const mine: string[] = await fac.leaguesOf(owner);
        createdAddr = mine[mine.length - 1];
      }
      setPotAddr(createdAddr);
    } catch (e: any) {
      alert(e?.reason || e?.message || String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Pool</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pool Configuration</CardTitle>
          <CardDescription>
            Set up your new Chainpool with entry fee and duration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Token Address</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry">Entry Fee (USDC)</Label>
            <Input
              id="entry"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="50"
              type="number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">End Time</Label>
            <Input
              id="end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          <Button onClick={create} className="w-full">
            Create Pool
          </Button>

          {txHash && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Transaction:{' '}
                <a
                  className="underline hover:no-underline"
                  href={`https://www.oklink.com/amoy/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {txHash.slice(0, 10)}…
                </a>
              </p>
            </div>
          )}
          
          {potAddr && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                New Pool Created:{' '}
                <Link 
                  className="underline hover:no-underline font-mono"
                  href={`/pot/${potAddr}`}
                >
                  {potAddr}
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
