'use client';
import React, { useEffect, useState } from 'react';
import { useWallet } from './WalletProvider';
import {
  getPoolInfo,
  contribute,
  withdrawPayout,
  getContributions,
  getPoolModeDescription,
} from '../lib/pool';
import { formatEther, parseUnits } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CalendarIcon, TrophyIcon, UsersIcon, DollarSignIcon, InfoIcon } from 'lucide-react';
import type { PoolInfo, ContributionInfo } from '../types/pool';

interface PoolViewProps {
  address: string;
}

export default function PoolView({ address }: PoolViewProps) {
  const { provider, address: userAddress, isConnected } = useWallet();
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [contributions, setContributions] = useState<ContributionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [referrer, setReferrer] = useState('');

  // Refresh pool data
  const refreshData = async () => {
    if (!provider) return;

    setLoading(true);
    setError('');

    try {
      const [info, contribs] = await Promise.all([
        getPoolInfo(address),
        getContributions(provider, address),
      ]);

      setPoolInfo(info);
      setContributions(contribs);
    } catch (err: any) {
      console.error('Failed to load pool data:', err);
      setError(err?.message || 'Failed to load pool data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [provider, address]);

  const handleContribute = async () => {
    if (!provider || !poolInfo || !contributionAmount) return;

    // Validate contribution amount for fixed pools
    if (poolInfo.mode === 'FIXED_ENTRY' && contributionAmount !== poolInfo.entryUnit) {
      setError(`This pool requires exactly ${poolInfo.entryUnit} USDC`);
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      await contribute(provider, address, contributionAmount, referrer || undefined);
      setContributionAmount('');
      setReferrer('');
      await refreshData();
    } catch (err: any) {
      console.error('Contribution failed:', err);
      setError(err?.reason || err?.message || 'Contribution failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!provider) return;

    setActionLoading(true);
    setError('');

    try {
      await withdrawPayout(provider, address);
      await refreshData();
    } catch (err: any) {
      console.error('Withdrawal failed:', err);
      setError(err?.reason || err?.message || 'Withdrawal failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCountdown = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const isEnded = poolInfo ? new Date(poolInfo.endTime) <= new Date() : false;
  const canWithdraw =
    isEnded && poolInfo?.isOrganizer && parseFloat(poolInfo.totalContributions) > 0;
  const userContribution = contributions.find(
    (c) => c.contributor.toLowerCase() === userAddress?.toLowerCase()
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!poolInfo) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Pool not found or failed to load</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pool Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Chainpool</CardTitle>
              <CardDescription className="text-sm font-mono">{address}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={poolInfo.mode === 'FIXED_ENTRY' ? 'default' : 'secondary'}>
                {poolInfo.mode === 'FIXED_ENTRY' ? 'Fixed Entry' : 'Flexible Amount'}
              </Badge>
              <Badge variant={isEnded ? 'destructive' : 'default'}>
                {isEnded ? 'Ended' : 'Active'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Entry Amount */}
            <div className="flex items-center gap-2">
              <DollarSignIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Entry</p>
                <p className="font-semibold">
                  {poolInfo.mode === 'FIXED_ENTRY' ? `${poolInfo.entryUnit} USDC` : 'Flexible'}
                </p>
              </div>
            </div>

            {/* Total Pool */}
            <div className="flex items-center gap-2">
              <TrophyIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Pool</p>
                <p className="font-semibold">{poolInfo.totalContributions} USDC</p>
              </div>
            </div>

            {/* Contributors */}
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Contributors</p>
                <p className="font-semibold">{poolInfo.contributorCount}</p>
              </div>
            </div>

            {/* Time Left */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold">
                  {isEnded ? 'Ended' : formatCountdown(poolInfo.endTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Pool Description */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <InfoIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">{getPoolModeDescription(poolInfo.mode)}</p>
                <p className="text-muted-foreground mt-1">
                  Ends on {new Date(poolInfo.endTime).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Tabs */}
      <Tabs defaultValue="contribute" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contribute">Contribute</TabsTrigger>
          <TabsTrigger value="contributors">Contributors</TabsTrigger>
        </TabsList>

        <TabsContent value="contribute" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{userContribution ? 'Additional Contribution' : 'Join Pool'}</CardTitle>
              <CardDescription>
                {userContribution
                  ? `You've already contributed ${userContribution.amount} USDC`
                  : 'Contribute to this pool'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected ? (
                <Alert>
                  <AlertDescription>
                    Please connect your wallet to contribute to this pool.
                  </AlertDescription>
                </Alert>
              ) : isEnded ? (
                <Alert>
                  <AlertDescription>
                    This pool has ended. No more contributions are accepted.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Contribution Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      Amount (USDC)
                      {poolInfo.mode === 'FIXED_ENTRY' && (
                        <span className="text-muted-foreground ml-1">
                          (Fixed: {poolInfo.entryUnit})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      placeholder={
                        poolInfo.mode === 'FIXED_ENTRY' ? poolInfo.entryUnit : 'Enter amount'
                      }
                      disabled={poolInfo.mode === 'FIXED_ENTRY'}
                    />
                    {poolInfo.mode === 'FIXED_ENTRY' && (
                      <p className="text-sm text-muted-foreground">
                        This pool requires a fixed contribution of {poolInfo.entryUnit} USDC
                      </p>
                    )}
                  </div>

                  {/* Referrer (optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="referrer">Referrer Address (optional)</Label>
                    <Input
                      id="referrer"
                      value={referrer}
                      onChange={(e) => setReferrer(e.target.value)}
                      placeholder="0x..."
                    />
                    <p className="text-sm text-muted-foreground">
                      If someone referred you, enter their address to give them credit
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleContribute}
                    disabled={actionLoading || !contributionAmount}
                    className="w-full"
                  >
                    {actionLoading ? 'Contributing...' : 'Contribute'}
                  </Button>
                </>
              )}

              {/* Organizer Withdrawal */}
              {canWithdraw && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-2">Organizer Actions</h3>
                  <Button
                    onClick={handleWithdraw}
                    disabled={actionLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {actionLoading ? 'Withdrawing...' : 'Withdraw Pool Funds'}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    As the organizer, you can withdraw all funds after the pool ends.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contributors ({contributions.length})</CardTitle>
              <CardDescription>All contributions to this pool</CardDescription>
            </CardHeader>
            <CardContent>
              {contributions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No contributions yet. Be the first to join!
                </p>
              ) : (
                <div className="space-y-2">
                  {contributions.map((contribution, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-mono text-sm">
                            {contribution.contributor.slice(0, 6)}...
                            {contribution.contributor.slice(-4)}
                          </p>
                          {contribution.contributor.toLowerCase() ===
                            userAddress?.toLowerCase() && (
                            <Badge variant="secondary" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{contribution.amount} USDC</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(contribution.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
