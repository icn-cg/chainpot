"use client";
import React, { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Interface, id, zeroPadValue, getAddress } from "ethers";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";
import { useWallet } from "../lib/wallet";
import {
  erc20Readonly,
  escrowReadonly,
  escrowWrite,
  fromUnits6,
  rpc,
  FACTORY,
} from "../lib/web3";
import { erc20Abi, escrowAbi } from "../lib/abi";
import { formatFixed18, toNumberSafe, secondsToMilliseconds } from "../lib/numeric";


function fromUnits18(n: bigint): string {
  const sign = n < 0n ? "-" : "";
  const x = n < 0n ? -n : n;
  const i = x / 1_000_000_000_000_000_000n;
  const d = (x % 1_000_000_000_000_000_000n).toString().padStart(18, "0");
  return `${sign}${i}.${d}`;
}

// Trimmed W/D/H/M/S (drops leading zeros, always shows seconds)
const fmtCountdown = (secs: number) => {
  const neg = secs < 0;
  let s = Math.abs(Math.floor(secs));
  const U = [
    { k: "w", v: 7 * 24 * 3600 },
    { k: "d", v: 24 * 3600 },
    { k: "h", v: 3600 },
    { k: "m", v: 60 },
    { k: "s", v: 1 },
  ];
  const vals = U.map(u => { const q = Math.floor(s / u.v); s -= q * u.v; return q; });
  let first = vals.findIndex(n => n > 0);
  if (first === -1) first = U.length - 1;
  const parts = vals.slice(first).map((n, i) => `${n}${U[first + i].k}`).join(" ");
  return neg ? `-${parts}` : parts;
};

type Member = { address: string; amount: bigint };

export default function PotView({ address }: { address: string }) {
  const { walletProvider } = useAppKitProvider("eip155");
  const { address: wcAddress, isConnected } = useAppKitAccount();
      {/* action buttons */}
      <div className="flex gap-2">
        <button className="px-3 py-2 rounded border border-gray-300" onClick={approve}>
          Approve USDC
        </button>
        <button className="px-3 py-2 rounded border border-gray-300" onClick={join}>
          Join
        </button>
      </div>
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [me, setMe] = useState<string>("");
  const wallet = useWallet();

  // Bridge WalletConnect/AppKit provider → ethers BrowserProvider and capture address
  useEffect(() => {
    setProvider(wallet.provider);
    setMe(wallet.address || "");
  }, [wallet.provider, wallet.address]);

  const [fee, setFee] = useState<bigint>(0n);
  const [endTs, setEndTs] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [balance, setBalance] = useState<bigint>(0n);

  // balances banner
  const [nativeBal, setNativeBal] = useState<bigint>(0n); // wei (MATIC)
  const [tokenBal, setTokenBal]   = useState<bigint>(0n); // 6-dec (MockUSDC)

  // participants
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // live clock for countdown
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // -------- refresh pot + balances (wallet optional) --------
  async function refresh() {
    const esc = escrowReadonly(address);

    // pot params
    const [f, e, potBal] = await Promise.all([
      esc.entryFee(),
      esc.leagueEndTime(),
      esc.getPotBalance(),
    ]);
    setFee(f);
    setEndTs(e);
    setBalance(potBal);

    if (provider) {
      const signer = await provider.getSigner();
      const meAddr = await signer.getAddress();
      setMe(meAddr);

      // token + allowance
      const tokAddr = await esc.token();
      const tok = erc20Readonly(tokAddr);
      const [alw, bal] = await Promise.all([
        tok.allowance(meAddr, address),
        tok.balanceOf(meAddr),
      ]);
      setAllowance(alw);
      setTokenBal(bal);

      // native balance (prefer app RPC to dodge flaky wallet RPC)
      try {
        setNativeBal(await rpc().getBalance(meAddr));
      } catch {
        try { setNativeBal(await provider.getBalance(meAddr)); }
        catch { setNativeBal(0n); }
      }
    } else {
      setMe("");
    }
  }

  // Find the escrow's creation block via Factory.LeagueCreated(owner, league)
  async function findCreationBlock(): Promise<bigint | null> {
    try {
      const prov = rpc();
      const topicCreated = id("LeagueCreated(address,address)");
      const leagueTopic = zeroPadValue(getAddress(address), 32);
      const logs = await prov.getLogs({
        address: FACTORY,
        topics: [topicCreated, null, leagueTopic],
        fromBlock: 0n,
        toBlock: "latest",
      });
      if (logs.length) {
        const bn = (logs[0] as any).blockNumber as number;
        return BigInt(bn);
      }
    } catch (e) {
      console.warn("findCreationBlock failed", e);
    }
    return null;
  }

  // -------- participants: chunked + cached scan (no wallet needed) --------
  async function loadMembersFast(force = false) {
    setLoadingMembers(true);
    try {
      const prov = rpc();
      const iface = new Interface(escrowAbi);
      const topicJoined = id("Joined(address,uint256)"); // exact signature

      // tiny cache key per escrow
      const key = `members:${address.toLowerCase()}`;
      let byAddr = new Map<string, bigint>();
      let fromBlock: bigint | null = null;

      // use cache if present (unless force)
      if (!force && typeof window !== "undefined") {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          const c = JSON.parse(cached) as { last: number; entries: [string, string][] };
          byAddr = new Map(c.entries.map(([a, n]) => [a, BigInt(n)]));
          fromBlock = BigInt(c.last + 1);
          // show immediately while we fetch new logs
          setMembers(Array.from(byAddr.entries()).map(([address, amount]) => ({ address, amount })));
        }
      }

      if (fromBlock === null) {
        // start at creation block; fallback to recent window
        const foundBlock = await findCreationBlock();
        if (foundBlock !== null) {
          fromBlock = foundBlock;
        } else {
          const latest0 = BigInt(await prov.getBlockNumber());
          fromBlock = latest0 > 200_000n ? latest0 - 200_000n : 0n;
        }
      }
      
      const latest = BigInt(await prov.getBlockNumber());
      if (fromBlock > latest) {
        setLoadingMembers(false);
        return; // cache already up-to-date
      }

      // chunked scan
      const step = 20000n;
      let start = fromBlock;

      while (start <= latest) {
        const end = start + step > latest ? latest : start + step;
        try {
          const logs = await prov.getLogs({
            address,
            topics: [topicJoined],
            fromBlock: start,
            toBlock: end,
          });

          for (const l of logs) {
            try {
              const parsed = iface.parseLog(l as any) as any;
              const a = String(parsed.args?.account ?? parsed.args?.[0]);
              const n = BigInt(parsed.args?.amount ?? parsed.args?.[1]);
              byAddr.set(a, (byAddr.get(a) ?? 0n) + n);
            } catch {}
          }
        } catch (e) {
          console.warn(`Log scan failed for blocks ${start}-${end}:`, e);
        }
        start = end + 1n;
      }

      const list = Array.from(byAddr.entries()).map(([address, amount]) => ({ address, amount }));
      setMembers(list);

      // update cache
      if (typeof window !== "undefined") {
        // Dev diagnostic: ensure no BigInt is serialized by accident
        const cacheObj = {
          last: toNumberSafe(latest),
          entries: list.map(m => [m.address, m.amount.toString()]),
        } as const;
        // eslint-disable-next-line no-console
        console.log("[PotView] cache types", {
          last: typeof cacheObj.last,
          entry0: list[0] ? typeof list[0].amount : undefined,
        });
        sessionStorage.setItem(key, JSON.stringify(cacheObj));
      }
    } catch (e) {
      console.warn("loadMembersFast failed", e);
    } finally {
      setLoadingMembers(false);
    }
  }

  // First load: run refresh() and loadMembersFast() in parallel
  useEffect(() => {
    (async () => { await Promise.allSettled([refresh(), loadMembersFast()]); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, provider]);

  // ---------- Approve (robust) ----------
  async function approve() {
    if (!provider) return alert("Connect a wallet first");
    try {
      const signer = await provider.getSigner();
      const from = await signer.getAddress();

      const escR = escrowReadonly(address);
      const tokAddr = await escR.token();
      const tokR = erc20Readonly(tokAddr);
      const current = await tokR.allowance(from, address);

      const iface20 = new Interface(erc20Abi);

      // helper: simulate + estimate + raw send
      const sendRaw = async (calldata: string) => {
        // simulate to catch real reverts
        await provider.call({ from, to: tokAddr, data: calldata });

        // estimate (provider-level) + buffer
        let gasLimit = 150_000n;
        try {
          const est = await provider.estimateGas({ from, to: tokAddr, data: calldata });
          gasLimit = est + 30_000n;
        } catch {}

        // raw send (no explicit fees first)
        try {
          const tx = await signer.sendTransaction({ to: tokAddr, data: calldata, gasLimit });
          await tx.wait();
          return;
        } catch {
          // fallback with explicit 1559
          const feeData = await provider.getFeeData();
          const tx = await signer.sendTransaction({
            to: tokAddr,
            data: calldata,
            gasLimit,
            ...(feeData.maxFeePerGas && feeData.maxPriorityFeePerGas
              ? {
                  maxFeePerGas: (feeData.maxFeePerGas * 12n) / 10n,
                  maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas * 12n) / 10n,
                }
              : {}),
          });
          await tx.wait();
        }
      };

      // Many USDCs require approve(0) before changing a non-zero allowance
      if (current > 0n) {
        await sendRaw(iface20.encodeFunctionData("approve", [address, 0n]));
      }

      await sendRaw(iface20.encodeFunctionData("approve", [address, fee]));

      await refresh();
      alert("Approved.");
    } catch (e: any) {
      alert(e?.reason || e?.data?.message || e?.message || "Approve failed");
    }
  }

  // ---------- Join (simulate + raw send) ----------
  async function join() {
    if (!provider) return alert("Connect a wallet first");
    try {
      const escW = await escrowWrite(address, provider);
      const signer = await provider.getSigner();
      const from = await signer.getAddress();

      // preflight simulate (throws "already" if you try twice)
      await (escW as any).joinLeague.staticCall();

      // calldata + estimate
      const data = (escW as any).interface.encodeFunctionData("joinLeague", []);
      let gasLimit = 200_000n;
      try {
        const est = await provider.estimateGas({ from, to: address, data });
        gasLimit = est + 40_000n;
      } catch {}

      const tx = await signer.sendTransaction({ to: address, data, gasLimit });
      await tx.wait();

      await Promise.allSettled([refresh(), loadMembersFast(true)]);
      alert("Joined!");
    } catch (e: any) {
      // Map common revert to friendlier msg
      const msg = String(e?.reason || e?.data?.message || e?.message || "Join failed");
      alert(msg.includes("already") ? "Already joined this pot." : msg);
    }
  }

  // ---------- derived ----------
  // Tiny diagnostics to help catch BigInt mixing during build-time SSR
  // Safe to keep; remove once the build error is resolved.
  // eslint-disable-next-line no-console
  console.log("[PotView] derive types", {
    endTs: typeof endTs,
    nowMs: typeof nowMs,
  });

  const endDate = useMemo(
    () => new Date(secondsToMilliseconds(endTs)).toLocaleString(),
    [endTs]
  );
  const secondsLeft = useMemo(() => {
    // Convert once through helper, then do pure number math
    const endMs = secondsToMilliseconds(endTs);
    return Math.floor(endMs / 1000) - Math.floor(nowMs / 1000);
  }, [endTs, nowMs]);
  const eligible = secondsLeft <= 0;
  const noGas = me && nativeBal === 0n;

  return (
    <div className="space-y-4">
      {/* balances banner */}
      {me && (
        <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
          <div className="text-sm text-gray-600">
            Connected: <span className="font-mono">{me.slice(0, 6)}…{me.slice(-4)}</span> on Polygon Amoy
          </div>
          <div className="text-sm">
            Gas: <b>{formatFixed18(nativeBal)}</b> MATIC
          </div>
          <div className="text-sm">
            MockUSDC: <b>{fromUnits6(tokenBal)}</b> (balance) • Allowance to pot: <b>{fromUnits6(allowance)}</b>
          </div>
          {noGas && (
            <div className="text-sm mt-1 rounded border border-amber-300 bg-amber-50 px-2 py-1">
              You have 0 MATIC for gas on Amoy. Get some from a faucet, then try again.
            </div>
          )}
        </div>
      )}

      {/* pot card (Escrow, Entry Fee, Pot Balance, Participants) */}
      <div className="border border-gray-200 p-3 rounded-xl space-y-2">
        <div><b>Escrow</b>: {address}</div>
        <div>Entry Fee: {fromUnits6(fee)} USDC</div>
        <div className="flex gap-2 items-center">
          <span>Ends: {endDate}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
              eligible
                ? "border-green-300 bg-green-50 text-green-700"
                : "border-gray-300 bg-gray-50 text-gray-700"
            }`}
          >
            {eligible ? "payout eligible" : `ends in ${fmtCountdown(secondsLeft)}`}
          </span>
        </div>
        <div>Pot Balance: {fromUnits6(balance)} USDC</div>

        {/* Participants */}
        <div className="mt-2">
          <div className="font-semibold mb-1 flex items-center gap-2">
            Participants ({members.length})
            {loadingMembers && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
            )}
          </div>
          {members.length === 0 ? (
            <div className="text-sm text-gray-500">No one has joined yet.</div>
          ) : (
            <ul className="text-sm space-y-1">
              {members.map((m) => (
                <li key={m.address} className="flex items-center justify-between font-mono">
                  <span>{m.address.slice(0,6)}…{m.address.slice(-4)}</span>
                  <span className="tabular-nums">{fromUnits6(m.amount)} USDC</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

