"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OrderActions({ orderId, status, awbCode = "", courierName = "", trackingUrl = "" }: { orderId: string; status: string; awbCode?: string; courierName?: string; trackingUrl?: string }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [shipment, setShipment] = useState({ awbCode, courierName, trackingUrl });

  async function post(url: string, body: unknown) {
    setSaving(true); setMessage("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request failed");
      setMessage("Saved");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally { setSaving(false); }
  }

  const options = status === "pending" ? ["pending", "confirmed", "cancelled"] : status === "confirmed" ? ["confirmed", "processing", "cancelled"] : status === "processing" ? ["processing", "shipped"] : status === "shipped" ? ["shipped", "delivered"] : [status];

  return <div className="mt-6 rounded-2xl bg-[#f7f3ec] p-5">
    <p className="text-xs font-bold uppercase tracking-wide text-black/45">Admin actions</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} disabled={saving} className="rounded-xl border bg-white px-3 py-2 text-sm">
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <button type="button" disabled={saving || nextStatus === status} onClick={() => post("/api/admin/orders/status", { id: orderId, status: nextStatus })} className="rounded-xl bg-[#171717] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Update status</button>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <input value={shipment.courierName} onChange={e => setShipment({ ...shipment, courierName: e.target.value })} placeholder="Courier" className="rounded-xl border bg-white px-3 py-2 text-sm" />
      <input value={shipment.awbCode} onChange={e => setShipment({ ...shipment, awbCode: e.target.value })} placeholder="AWB number" className="rounded-xl border bg-white px-3 py-2 text-sm" />
      <input value={shipment.trackingUrl} onChange={e => setShipment({ ...shipment, trackingUrl: e.target.value })} placeholder="Tracking URL (optional)" className="rounded-xl border bg-white px-3 py-2 text-sm sm:col-span-3" />
    </div>
    <button type="button" disabled={saving || !shipment.awbCode.trim()} onClick={() => post("/api/admin/orders/shipment", { orderId, ...shipment })} className="mt-3 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Save shipment & mark shipped</button>
    {message && <p className="mt-3 text-xs font-semibold text-green-700">{message}</p>}
  </div>;
}
