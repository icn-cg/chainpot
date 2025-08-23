'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { BrowserProvider, ethers } from 'ethers';
import { useAppKitProvider, useAppKitAccount } from '@reown/appkit/react';
import { useWallet } from './WalletProvider';
import {
  poolEscrowReadonly,
  poolEscrowWrite,
  fromUnits6,
  toUnixTs,
  erc20Write,
  toUnits6,
} from '../lib/web3';
import { toNumberSafe, secondsToMilliseconds } from 'src/lib/numeric';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Recipient = { address: string; bps: number };

// Set NEXT_PUBLIC_DEV_FAUCET=0 in .env.local to hide the faucet block
const DEV_FAUCET = process.env.NEXT_PUBLIC_DEV_FAUCET ?? '1';

const fmtCountdown = (secs: number) => {
  const neg = secs < 0;
  let s = Math.abs(Math.floor(secs));

  const U = [
    { k: 'w', v: 7 * 24 * 3600 },
    { k: 'd', v: 24 * 3600 },
    { k: 'h', v: 3600 },
    { k: 'm', v: 60 },
    { k: 's', v: 1 },
  ];

  const vals = U.map((u) => {
    const q = Math.floor(s / u.v);
    s -= q * u.v;
    return q;
  });

  // first non-zero; if all zero, show seconds
  let first = vals.findIndex((n) => n > 0);
  if (first === -1) first = U.length - 1;

  const parts = vals
    .slice(first)
    .map((n, i) => `${n}${U[first + i].k}`)
    .join(' ');

  return neg ? `-${parts}` : parts;
};

export default function AdminPanel({ address }: { address: string }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const { walletProvider } = useAppKitProvider('eip155');
  const { address: wcAddress, isConnected } = useAppKitAccount();
  const wallet = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [owner, setOwner] = useState<string>('');

  const [end, setEnd] = useState<string>('');
  const [fee, setFee] = useState<string>('');
  const [frozen, setFrozen] = useState<boolean>(true);

  const [recipients, setRecipients] = useState<Recipient[]>([{ address: '', bps: 10000 }]);
  const [me, setMe] = useState<string>('');

  // Bridge WalletConnect/AppKit provider → ethers BrowserProvider
  useEffect(() => {
    setProvider(wallet.provider);
  }, [wallet.provider]);

  // faucet UI
  const [fTo, setFTo] = useState<string>('');
  const [fAmt, setFAmt] = useState<string>('50'); // USDC

  // countdown
  const [endTs, setEndTs] = useState<bigint>(0n);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secondsLeft = useMemo(() => {
    const nowSec = Math.floor(nowMs / 1000);
    return Math.floor(secondsToMilliseconds(endTs) / 1000) - nowSec;
  }, [endTs, nowMs]);
  const eligible = secondsLeft <= 0;

  useEffect(() => {
    (async () => {
      const escR = poolEscrowReadonly(address);
      const o = await escR.organizer();
      setOwner(o);
      // Note: new pools don't have paramsFrozen - they're immutable after creation
      setFrozen(true);

      const e = await escR.endTime();
      setEndTs(e);
      setEnd(new Date(secondsToMilliseconds(e)).toISOString().slice(0, 16));

      // New pools have different fee structure - check if it's fixed or flexible
      try {
        const entryUnit = await escR.entryUnit();
        setFee(fromUnits6(entryUnit));
      } catch {
        // Flexible pool - no fixed entry fee
        setFee('0');
      }

      // Prefer wallet hook address for immediacy
      if (wallet.address) {
        setMe(wallet.address);
        setIsOwner(wallet.address.toLowerCase() === o.toLowerCase());
        return;
      }

      if (provider) {
        try {
          const s = await provider.getSigner();
          const addr = await s.getAddress();
          setMe(addr);
          setIsOwner(addr.toLowerCase() === o.toLowerCase());
          return;
        } catch {}
      }

      setMe('');
      setIsOwner(false);
    })();
  }, [provider, wallet.address, address]);

  // Pre-fill recipients + faucet recipient with my address if I'm organizer
  useEffect(() => {
    if (isOwner && me) {
      if (recipients.length === 1 && recipients[0].address === '') {
        setRecipients([{ address: me, bps: 10000 }]);
      }
      if (!fTo) setFTo(me);
    }
  }, [isOwner, me]);

  async function updateFee() {
    alert('Pool entry fees cannot be modified after creation in the new system.');
  }
  async function updateEnd() {
    alert('Pool end times cannot be modified after creation in the new system.');
  }
  async function setRecipientsOnChain() {
    if (!provider) return alert('Connect');
    const sum = recipients.reduce((a: number, r: Recipient) => a + toNumberSafe(r.bps || 0), 0);
    if (sum !== 10000) return alert('Bps must sum to 10000.');
    const esc = await poolEscrowWrite(address, provider);
    const addrs = recipients.map((r: Recipient) => r.address);
    const bps = recipients.map((r: Recipient) => BigInt(r.bps));
    const tx = await esc.setRecipients(addrs, bps); // Updated function name
    await tx.wait();
    alert('Recipients set.');
  }
  async function payout() {
    if (!provider) return alert('Connect');
    const esc = await poolEscrowWrite(address, provider);
    const tx = await esc.payout();
    await tx.wait();
    alert('Paid out.');
  }
  async function cancel() {
    if (!provider) return alert('Connect');
    const esc = await poolEscrowWrite(address, provider);
    const tx = await esc.cancel(); // Updated function name
    await tx.wait();
    alert('Cancelled. Participants can claimRefund().');
  }

    // Pool organizer faucet: mint MockUSDC directly to any address
  async function faucet() {
    if (!provider) return alert('Connect wallet first');
    if (!isOwner) return alert('Only pool organizer can use faucet');
    
    // Validate amount
    const amount = parseFloat(fAmt);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (amount > 1000) {
      alert('Maximum faucet amount is 1000 mUSDC per transaction');
      return;
    }
    
    // Validate recipient address
    if (!fTo || !ethers.isAddress(fTo)) {
      alert('Please enter a valid recipient address');
      return;
    }
    
    try {
      const escR = poolEscrowReadonly(address);
      const tokAddr = await escR.token();
      
      // For local networks, pool organizer can mint tokens
      const network = await provider.getNetwork();
      if (network.chainId === 31337n) {
        const signer = await provider.getSigner();
        const tokW = new ethers.Contract(tokAddr, [
          'function faucet(address to, uint256 amount) external',
          'function mint(address to, uint256 amount) external',
          'function owner() external view returns (address)',
          'function balanceOf(address account) external view returns (uint256)'
        ], signer);
        
        try {
          // Try public faucet first (works for anyone, limited to 1000 mUSDC)
          const tx = await tokW.faucet(fTo, toUnits6(fAmt));
          await tx.wait();
          alert(`✅ Successfully minted ${fAmt} mUSDC to ${fTo}`);
          setFAmt(''); // Clear amount after successful mint
        } catch (faucetError) {
          // If public faucet fails, try admin mint if organizer is contract owner
          try {
            const contractOwner = await tokW.owner();
            const currentAccount = await signer.getAddress();
            
            if (currentAccount.toLowerCase() === contractOwner.toLowerCase()) {
              const tx = await tokW.mint(fTo, toUnits6(fAmt));
              await tx.wait();
              alert(`✅ Successfully minted ${fAmt} mUSDC to ${fTo} (admin mint)`);
              setFAmt(''); // Clear amount after successful mint
            } else {
              alert(`❌ Faucet limit is 1000 mUSDC per transaction. Please use a smaller amount.`);
            }
          } catch (mintError: any) {
            alert(`❌ Faucet failed: ${mintError?.message || 'Unknown error'}`);
          }
        }
      } else {
        alert('Faucet only works on local network');
      }
    } catch (e: any) {
      alert(`❌ ${e?.reason || e?.data?.message || e?.message || 'Faucet failed'}`);
    }
  }

  function addRecipient() {
    setRecipients([...recipients, { address: '', bps: 0 }]);
  }
  function setR(i: number, key: 'address' | 'bps', v: string) {
    const copy = [...recipients];
    (copy[i] as any)[key] = key === 'bps' ? toNumberSafe(v) : v;
    setRecipients(copy);
  }
  function rmR(i: number) {
    setRecipients(recipients.filter((_, j: number) => j !== i));
  }

  return (
    <div className="space-y-6">
      {/* Pool Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Pool Administration</CardTitle>
              <CardDescription>Manage pool settings and participants</CardDescription>
            </div>
            <Badge variant={eligible ? "default" : "secondary"} className="text-sm">
              {eligible ? 'Payout Eligible' : `Ends in ${fmtCountdown(secondsLeft)}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Organizer</Label>
              <p className="font-mono text-xs">{owner?.slice(0, 6)}...{owner?.slice(-4)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Entry Fee</Label>
              <p className="font-semibold">{fee} USDC</p>
            </div>
            <div>
              <Label className="text-muted-foreground">End Time</Label>
              <p className="font-semibold">{new Date(secondsToMilliseconds(endTs)).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <p className="font-semibold">{frozen ? 'Active' : 'Draft'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isOwner ? (
        <Alert>
          <AlertDescription>
            Connect as pool organizer to access management features.
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Pool Settings</TabsTrigger>
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="faucet">Dev Faucet</TabsTrigger>
          </TabsList>

          {/* Pool Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pool Configuration</CardTitle>
                <CardDescription>
                  Edit pool settings (only before first participant joins)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fee">Entry Fee (USDC)</Label>
                    <Input
                      id="fee"
                      type="number"
                      placeholder="100"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={updateFee} variant="outline">
                    Update Fee
                  </Button>
                  <Button onClick={updateEnd} variant="outline">
                    Update End Time
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payout Recipients</CardTitle>
                <CardDescription>
                  Configure how pool funds are distributed (basis points must sum to 10,000)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recipients.map((r, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Recipient Address</Label>
                      <Input
                        placeholder="0xRecipient..."
                        value={r.address}
                        onChange={(e) => setR(i, 'address', e.target.value)}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Basis Points</Label>
                      <Input
                        type="number"
                        placeholder="5000"
                        value={r.bps}
                        onChange={(e) => setR(i, 'bps', e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => rmR(i)}
                      className="text-destructive"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={addRecipient} variant="outline">
                    Add Recipient
                  </Button>
                  <Button onClick={setRecipientsOnChain}>
                    Save Recipients
                  </Button>
                  <Button onClick={payout} variant="default">
                    Execute Payout
                  </Button>
                  <Button onClick={cancel} variant="destructive">
                    Cancel Pool
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dev Faucet Tab */}
          {DEV_FAUCET !== '0' && (
            <TabsContent value="faucet" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Development Faucet</CardTitle>
                  <CardDescription>
                    Mint test tokens for development and testing (Local network only)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <strong>Faucet Limits:</strong> Maximum 1000 mUSDC per transaction. 
                      Use smaller amounts for multiple recipients.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="faucetRecipient">Recipient Address</Label>
                      <Input
                        id="faucetRecipient"
                        placeholder="0xRecipient... or use your address"
                        value={fTo}
                        onChange={(e) => setFTo(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="faucetAmount">Amount (mUSDC)</Label>
                      <Input
                        id="faucetAmount"
                        type="number"
                        placeholder="100"
                        min="1"
                        max="1000"
                        value={fAmt}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val > 1000) {
                            setFAmt('1000');
                          } else {
                            setFAmt(e.target.value);
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setFTo(me || '')}
                      variant="outline"
                      disabled={!me}
                    >
                      Use My Address
                    </Button>
                    <Button
                      onClick={faucet}
                      disabled={!fTo || !fAmt || parseFloat(fAmt) <= 0 || parseFloat(fAmt) > 1000}
                    >
                      Mint Tokens
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Pool organizers can mint test mUSDC tokens for development. 
                    These tokens work identically to mainnet USDC but only on local networks.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
