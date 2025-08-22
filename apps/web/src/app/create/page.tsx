'use client';
import React, { useState } from 'react';
import { BrowserProvider } from 'ethers';
import { useWallet } from '../../components/WalletProvider';
import { createPool } from '../../lib/pool';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { PoolMode, FeePolicy } from '../../lib/abi';
import type { CreatePoolFormData } from '../../types/pool';

export default function CreatePoolPage() {
  const { provider } = useWallet();
  const [loading, setLoading] = useState(false);
  const [poolAddress, setPoolAddress] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<CreatePoolFormData>({
    mode: 'FIXED_ENTRY',
    entryUnit: '50',
    endTime: '',
    referralBps: 500, // 5%
    restricted: false,
    feePolicy: 'ORGANIZER_ABSORB',
  });

  const handleInputChange = (field: keyof CreatePoolFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const createNewPool = async () => {
    if (!provider) {
      setError('Please connect your wallet first');
      return;
    }

    if (!formData.endTime) {
      setError('Please select an end time');
      return;
    }

    if (formData.mode === 'FIXED_ENTRY' && !formData.entryUnit) {
      setError('Please enter an entry amount for fixed pools');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const poolAddr = await createPool(provider, {
        mode: formData.mode,
        entryUnit: formData.mode === 'FIXED_ENTRY' ? formData.entryUnit : undefined,
        endTime: formData.endTime,
        referralBps: formData.referralBps,
        restricted: formData.restricted,
        feePolicy: formData.feePolicy,
      });

      setPoolAddress(poolAddr);
    } catch (err: any) {
      console.error('Pool creation failed:', err);
      setError(err?.reason || err?.message || 'Pool creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Pool</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pool Configuration</CardTitle>
          <CardDescription>
            Set up your new Chainpool with entry requirements and duration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pool Mode Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Pool Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card
                className={`cursor-pointer transition-all ${
                  formData.mode === 'FIXED_ENTRY'
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleInputChange('mode', 'FIXED_ENTRY')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        formData.mode === 'FIXED_ENTRY'
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      }`}
                    />
                    <div>
                      <h3 className="font-semibold">Fixed Entry</h3>
                      <p className="text-sm text-muted-foreground">
                        Everyone contributes the same amount
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  formData.mode === 'FLEXIBLE_AMOUNT'
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleInputChange('mode', 'FLEXIBLE_AMOUNT')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        formData.mode === 'FLEXIBLE_AMOUNT'
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      }`}
                    />
                    <div>
                      <h3 className="font-semibold">Flexible Amount</h3>
                      <p className="text-sm text-muted-foreground">
                        Contributors choose their amount
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Entry Amount (Fixed mode only) */}
          {formData.mode === 'FIXED_ENTRY' && (
            <div className="space-y-2">
              <Label htmlFor="entryUnit">Entry Amount (USDC)</Label>
              <Input
                id="entryUnit"
                value={formData.entryUnit}
                onChange={(e) => handleInputChange('entryUnit', e.target.value)}
                placeholder="50"
                type="number"
                min="0"
                step="0.01"
              />
              <p className="text-sm text-muted-foreground">
                Fixed amount each contributor must pay to join the pool
              </p>
            </div>
          )}

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              When the pool closes and becomes eligible for payout
            </p>
          </div>

          {/* Referral Rate */}
          <div className="space-y-2">
            <Label htmlFor="referralBps">Referral Rate (%)</Label>
            <Input
              id="referralBps"
              value={formData.referralBps / 100}
              onChange={(e) =>
                handleInputChange(
                  'referralBps',
                  Math.round(parseFloat(e.target.value || '0') * 100)
                )
              }
              placeholder="5"
              type="number"
              min="0"
              max="10"
              step="0.1"
            />
            <p className="text-sm text-muted-foreground">
              Percentage of contributions that go to referrers (0-10%)
            </p>
          </div>

          {/* Fee Policy */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Referral Fee Policy</Label>
            <div className="space-y-2">
              <Card
                className={`cursor-pointer transition-all ${
                  formData.feePolicy === 'ORGANIZER_ABSORB'
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleInputChange('feePolicy', 'ORGANIZER_ABSORB')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        formData.feePolicy === 'ORGANIZER_ABSORB'
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      }`}
                    />
                    <div>
                      <h4 className="font-medium">Organizer Absorbs</h4>
                      <p className="text-sm text-muted-foreground">
                        Referral fees are deducted from your payout
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        Recommended
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Access Control */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="restricted"
                checked={formData.restricted}
                onChange={(e) => handleInputChange('restricted', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="restricted">Restricted Access</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Only allow specific addresses to contribute (allowlist required)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={createNewPool} disabled={loading} className="w-full">
            {loading ? 'Creating Pool...' : 'Create Pool'}
          </Button>

          {poolAddress && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-green-800">Pool Created Successfully!</p>
                  <Link
                    className="underline hover:no-underline font-mono text-sm"
                    href={`/pool/${poolAddress}`}
                  >
                    {poolAddress}
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
