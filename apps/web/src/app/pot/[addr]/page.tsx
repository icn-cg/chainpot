"use client";
import React from "react";
import { useParams } from "next/navigation";
import ConnectBar from "../../../components/ConnectBar";
import PotView from "../../../components/PotView";

export default function PotPage() {
  const { addr } = useParams<{ addr: string }>();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Pot</h1>
        <ConnectBar />
      </div>
      <PotView address={addr}/>
      <div>
        <a className="px-3 py-2 rounded border border-gray-300 inline-block" href={`/pot/${addr}/admin`}>Admin</a>
      </div>
    </div>
  );
}
