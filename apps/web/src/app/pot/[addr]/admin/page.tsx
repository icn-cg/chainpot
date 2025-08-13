"use client";
import { useParams } from "next/navigation";
import AdminPanel from "../../../../components/AdminPanel";


import ConnectionBanner from "../../../../components/ConnectionBanner";
import { useAppKitAccount } from "@reown/appkit/react";

export default function AdminPage() {
  const { addr } = useParams<{ addr: string }>();
  const { isConnected } = useAppKitAccount();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Admin</h1>
      </div>
  <ConnectionBanner show={!isConnected} message="Connect a wallet to manage this pot as owner." />
      <AdminPanel address={addr} />
    </div>
  );
}
