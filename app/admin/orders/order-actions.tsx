"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OrderActions({ orderId, status, awbCode = "", courierName = "", trackingUrl = "" }: { orderId: string; status: string; awbCode?: string; courierName?: string; trackingUrl?: string }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(awbCode ? "Shiprocket shipment created" : "");

  async function post(url: string, body: unknown) {
    setSaving(true); setMessage("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request failed");
      setMessage("Saved successfully");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally { setSaving(false); }
  }

  async function createShipment() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/shipments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create Shiprocket shipment");
      setMessage(result.alreadyExists ? "Shiprocket shipment already exists" : "Shiprocket shipment created and AWB assigned");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create Shiprocket shipment");
    } finally { setSaving(false); }
  }

  const options = status === "pending" ? ["pending", "confirmed", "cancelled"] : status === "confirmed" ? ["confirmed", "processing", "cancelled"] : status === "processing" ? ["processing", "shipped"] : status === "shipped" ? ["shipped", "delivered"] : [status];
  const canCreateShipment = ["confirmed", "processing"].includes(status) && !awbCode;

  return <div className="mt-6 rounded-2xl bg-[#f7f3ec] p-5">
    <p className="text-xs font-bold uppercase tracking-wide text-black/45">Fulfillment</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} disabled={saving} className="rounded-xl border bg-white px-3 py-2 text-sm">
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <button type="button" disabled={saving || nextStatus === status} onClick={() => post("/api/admin/orders/status", { id: orderId, status: nextStatus })} className="rounded-xl bg-[#171717] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Update status</button>
    </div>

    {canCreateShipment && <div className="mt-5 rounded-2xl border border-[#c9973e]/30 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold">Shiprocket fulfillment</p>
          <p className="mt-1 text-xs leading-5 text-black/50">Create the Shiprocket order, assign a courier, generate the AWB and save tracking details automatically.</p>
        </div>
        <button type="button" disabled={saving} onClick={createShipment} className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{saving ? "Creating shipment…" : "Create Shiprocket shipment →"}</button>
      </div>
    </div>}

    {awbCode && <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
      <p className="font-bold text-green-900">Shiprocket shipment created</p>
      <p className="mt-1 text-sm text-green-800">{courierName || "Courier assigned"} · AWB {awbCode}</p>
      {trackingUrl && <a href={trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-green-900 underline">Open tracking →</a>}
    </div>}

    {message && !awbCode && <p className="mt-3 text-xs font-semibold text-black/60">{message}</p>}
  </div>;
}
