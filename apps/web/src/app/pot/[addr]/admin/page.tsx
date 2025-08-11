"use client";
import { useParams } from "next/navigation";
import ConnectBar from "../../../../components/ConnectBar";
import AdminPanel from "../../../../components/AdminPanel";

export default function AdminPage() {
  const { addr } = useParams<{ addr: string }>();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Admin</h1>
        <ConnectBar />
      </div>
      <AdminPanel address={addr}/>
    </div>
  );
}
