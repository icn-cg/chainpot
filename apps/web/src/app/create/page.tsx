"use client";
import React, { useState } from "react";
import ConnectBar from "../../components/ConnectBar";
import { BrowserProvider, Contract, type ContractTransactionReceipt, type Log } from "ethers";
import { USDC, factoryWrite, signerAddress, toUnixTs, toUnits6 } from "../../lib/web3";
import { factoryAbi } from "../../lib/abi";

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export default function CreatePotPage() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [entry, setEntry] = useState("50");
  const [end, setEnd] = useState<string>("");
  const [token, setToken] = useState<string>(USDC);
  const [txHash, setTxHash] = useState<string>("");
  const [potAddr, setPotAddr] = useState<string>("");

  async function create() {
    try {
      if (!provider) return alert("Connect a wallet first");
      if (!end)     return alert("Pick an end time");
      const endTs = toUnixTs(end);
      if (endTs <= 0n) return alert("End time is invalid");

      const fac = await factoryWrite(provider); // signer-bound
      const owner = await signerAddress(provider);
      const fee   = toUnits6(entry);

      const tx = await fac.createLeague(owner, token, fee, endTs);
      const rc = (await tx.wait()) as ContractTransactionReceipt | null;
      setTxHash(rc?.hash ?? "");

      // Parse LeagueCreated event (best effort)
      let createdAddr = "";
      if (rc?.logs?.length) {
        const parsed = (rc.logs as Log[])
          .map((l: Log) => { try { return (fac as Contract).interface.parseLog(l); } catch { return null; } })
          .find((ev): ev is NonNullable<ReturnType<(typeof fac)["interface"]["parseLog"]>> => !!ev && ev.name === "LeagueCreated");
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
        <h1 className="text-xl font-semibold">Create Pot</h1>
        <ConnectBar onProvider={setProvider} />
      </div>

      <div className="border border-gray-200 p-3 rounded-xl space-y-3">
        <label className="flex gap-2 items-center">
          <span className="w-40">Token:</span>
          <input className="flex-1 border border-gray-300 rounded px-2 py-1"
                 value={token} onChange={(e) => setToken(e.target.value)} />
        </label>

        <label className="flex gap-2 items-center">
          <span className="w-40">Entry Fee (USDC):</span>
          <input className="flex-1 border border-gray-300 rounded px-2 py-1"
                 value={entry} onChange={(e) => setEntry(e.target.value)} />
        </label>

        <label className="flex gap-2 items-center">
          <span className="w-40">End time:</span>
          <input type="datetime-local"
                 className="flex-1 border border-gray-300 rounded px-2 py-1"
                 value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>

        <button className="px-3 py-2 rounded border border-gray-300" onClick={create}>
          Create League
        </button>

        {txHash && (
          <div>
            Tx:{" "}
            <a className="underline" href={`https://www.oklink.com/amoy/tx/${txHash}`} target="_blank" rel="noreferrer">
              {txHash.slice(0, 10)}…
            </a>
          </div>
        )}
        {potAddr && (
          <div>
            New Pot:{" "}
            <a className="underline" href={`/pot/${potAddr}`}>
              {potAddr}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
