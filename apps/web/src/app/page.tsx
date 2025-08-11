"use client";
import React, { useState } from "react";
import ConnectBar from "../components/ConnectBar";

export default function Home() {
  const [addr, setAddr] = useState("");
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Welcome</h1>
        <ConnectBar />
      </div>

      <div className="border border-gray-200 p-3 rounded-xl">
        <h3 className="font-semibold mb-2">Create a pot</h3>
        <a className="px-3 py-2 rounded border border-gray-300 inline-block" href="/create">Go to Create</a>
      </div>

      <div className="border border-gray-200 p-3 rounded-xl">
        <h3 className="font-semibold mb-2">Open an existing pot</h3>
        <div className="flex gap-2">
          <input className="flex-1 border border-gray-300 rounded px-2 py-1" placeholder="0xPotAddress" value={addr} onChange={e=>setAddr(e.target.value)} />
          <a className="px-3 py-2 rounded border border-gray-300 inline-block" href={addr ? `/pot/${addr}` : "#"}>Open</a>
        </div>
        <p className="mt-2 text-sm">Your fresh pot: <code>0xC9e2125c0F792781A80dcE2c396Ce277F030A0a3</code></p>
      </div>
    </div>
  );
}
