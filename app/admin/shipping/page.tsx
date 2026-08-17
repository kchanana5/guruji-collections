"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminShippingPage() {
  const [shippingCharge, setShippingCharge] = useState("69");
  const [threshold, setThreshold] = useState(499);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/shipping-settings", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load settings");
        setShippingCharge(String(data.shippingCharge));
        setThreshold(Number(data.freeShippingThreshold));
      })
      .catch(err => setError(err.message || "Unable to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/shipping-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCharge: Number(shippingCharge) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save shipping settings");
      setShippingCharge(String(data.shippingCharge));
      setThreshold(Number(data.freeShippingThreshold));
      setMessage("Shipping charge saved successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to save shipping settings");
    } finally {
      setSaving(false);
    }
  }

  return <main className="min-h-screen bg-[#f7f3ec] px-5 py-8 text-[#171717] sm:px-8 lg:px-12">
    <div className="mx-auto max-w-3xl">
      <Link href="/admin" className="text-sm font-semibold text-black/55 hover:text-black">← Admin dashboard</Link>
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8a6a35]">STORE SETTINGS</p>
        <h1 className="mt-2 text-3xl font-black">Shipping charges</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-black/55">Set the delivery charge customers pay when their merchandise subtotal is below the free-shipping threshold.</p>

        {loading ? <p className="mt-8 text-sm text-black/50">Loading settings…</p> : <>
          <label className="mt-8 block max-w-sm"><span className="text-xs font-bold uppercase tracking-wide text-black/55">Shipping charge (₹)</span><input type="number" min="0" step="0.01" value={shippingCharge} onChange={e => setShippingCharge(e.target.value)} className="mt-2 w-full rounded-xl border border-black/15 px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-black/10" /></label>
          <div className="mt-5 rounded-2xl bg-[#f7f3ec] p-5 text-sm">
            <p className="font-bold">Current rule</p>
            <p className="mt-2 text-black/60">Orders below ₹{threshold.toLocaleString("en-IN")} pay <strong>₹{Number(shippingCharge || 0).toLocaleString("en-IN")}</strong> shipping.</p>
            <p className="mt-1 text-black/60">Orders at or above ₹{threshold.toLocaleString("en-IN")} get <strong>FREE shipping</strong>.</p>
            <p className="mt-3 text-xs text-black/45">Coupon discounts are calculated only against merchandise and never reduce this shipping charge.</p>
          </div>
          {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
          {message && <p className="mt-5 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-700">{message}</p>}
          <button type="button" onClick={save} disabled={saving} className="mt-6 rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save shipping charge"}</button>
        </>}
      </div>
    </div>
  </main>;
}
