'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { BrowserProvider } from 'ethers';
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

  // Dev faucet: send MockUSDC from owner to any address
  async function faucet() {
    if (!provider) return alert('Connect');
    try {
      const escR = poolEscrowReadonly(address);
      const tokAddr = await escR.token();
      const tokW = await erc20Write(provider, tokAddr);
      const tx = await tokW.transfer(fTo, toUnits6(fAmt));
      await tx.wait();
      alert(`Sent ${fAmt} MockUSDC to ${fTo}`);
    } catch (e: any) {
      alert(e?.reason || e?.data?.message || e?.message || 'Faucet failed');
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
    <div className="space-y-4">
      <div className="border border-gray-200 p-3 rounded-xl space-y-1">
        <div>
          <b>Owner</b>: {owner}
        </div>
        <div>Params frozen: {String(frozen)} (freeze occurs on first join)</div>
        <div className="flex gap-2 items-center">
          <span>Ends: {new Date(secondsToMilliseconds(endTs)).toLocaleString()}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
              eligible
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-gray-300 bg-gray-50 text-gray-700'
            }`}
          >
            {eligible ? 'payout eligible' : `ends in ${fmtCountdown(secondsLeft)}`}
          </span>
        </div>
      </div>

      {!isOwner ? (
        <div className="p-3 rounded border border-amber-200 bg-amber-50">
          Connect as owner to manage.
        </div>
      ) : (
        <>
          <div className="border border-gray-200 p-3 rounded-xl">
            <h3 className="font-semibold mb-2">Edit (only before first join)</h3>
            <label className="flex gap-2 items-center my-2">
              Entry Fee (USDC):
              <input
                className="flex-1 border border-gray-300 rounded px-2 py-1"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </label>
            <button className="px-3 py-2 rounded border border-gray-300 mr-2" onClick={updateFee}>
              Update Fee
            </button>
            <label className="flex gap-2 items-center my-2">
              End time (local):
              <input
                className="flex-1 border border-gray-300 rounded px-2 py-1"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <button className="px-3 py-2 rounded border border-gray-300" onClick={updateEnd}>
              Update End
            </button>
          </div>

          <div className="border border-gray-200 p-3 rounded-xl">
            <h3 className="font-semibold mb-2">Recipients (bps sum to 10000)</h3>
            {recipients.map((r, i) => (
              <div key={i} className="flex gap-2 items-center my-2">
                <input
                  className="flex-1 border border-gray-300 rounded px-2 py-1"
                  placeholder="0xRecipient..."
                  value={r.address}
                  onChange={(e) => setR(i, 'address', e.target.value)}
                />
                <input
                  className="w-28 border border-gray-300 rounded px-2 py-1"
                  type="number"
                  placeholder="bps"
                  value={r.bps}
                  onChange={(e) => setR(i, 'bps', e.target.value)}
                />
                <button className="px-2 py-1 rounded border border-gray-300" onClick={() => rmR(i)}>
                  ✕
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded border border-gray-300" onClick={addRecipient}>
                + Add Recipient
              </button>
              <button
                className="px-3 py-2 rounded border border-gray-300"
                onClick={setRecipientsOnChain}
              >
                Set Recipients
              </button>
              <button className="px-3 py-2 rounded border border-gray-300" onClick={payout}>
                Payout
              </button>
              <button className="px-3 py-2 rounded border border-gray-300" onClick={cancel}>
                Cancel Pool
              </button>
            </div>
          </div>

          {DEV_FAUCET !== '0' && (
            <div className="border border-gray-200 p-3 rounded-xl">
              <h3 className="font-semibold mb-2">Dev Faucet (owner → address)</h3>
              <div className="flex gap-2 items-center">
                <input
                  className="flex-1 border border-gray-300 rounded px-2 py-1"
                  placeholder="0xRecipient..."
                  value={fTo}
                  onChange={(e) => setFTo(e.target.value)}
                />
                <input
                  className="w-40 border border-gray-300 rounded px-2 py-1"
                  placeholder="Amount (USDC)"
                  value={fAmt}
                  onChange={(e) => setFAmt(e.target.value)}
                />
                <button className="px-3 py-2 rounded border border-gray-300" onClick={faucet}>
                  Send
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Sends the pot’s token (MockUSDC) from the connected owner wallet.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
