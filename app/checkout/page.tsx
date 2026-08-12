"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export default function CheckoutPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ recipientName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" });
  const items = useMemo(() => { try { return JSON.parse(localStorage.getItem("gjc-cart") || "[]"); } catch { return []; } }, []);
  const total = items.reduce((s: number, i: any) => s + Number(i.variant.price) * Number(i.quantity), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch("/api/checkout/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map((i: any) => ({ variantId: i.variantId, quantity: i.quantity })), address: form }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start checkout");
      localStorage.removeItem("gjc-cart"); window.location.href = `/checkout/success?order=${encodeURIComponent(data.orderNumber)}`;
    } catch (err: any) { setError(err.message || "Checkout failed"); setBusy(false); }
  }

  if (!items.length) return <main className="mx-auto max-w-3xl px-5 py-16"><h1 className="text-3xl font-bold">Your cart is empty</h1><Link href="/shop" className="mt-6 inline-block underline">Continue shopping</Link></main>;
  return <main className="min-h-screen bg-[var(--background)]"><header className="border-b bg-white"><div className="mx-auto flex max-w-5xl justify-between px-5 py-5"><Link href="/cart" className="font-semibold">← Cart</Link><span className="font-bold tracking-[.25em]">GJC CHECKOUT</span></div></header>
    <section className="mx-auto grid max-w-5xl gap-8 px-5 py-10 lg:grid-cols-[1fr_320px]">
      <form onSubmit={submit} className="rounded-3xl border bg-white p-6 sm:p-8"><h1 className="text-3xl font-bold">Delivery address</h1><p className="mt-2 text-sm text-black/50">We’ll use this address for your order.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">{[["recipientName","Full name"],["phone","Phone"],["line1","Address line 1"],["line2","Address line 2 (optional)"],["city","City"],["state","State"],["postalCode","PIN code"]].map(([key,label]) => <label key={key} className={key === "line1" || key === "line2" ? "sm:col-span-2" : ""}><span className="text-xs font-semibold uppercase tracking-wide text-black/50">{label}</span><input required={key !== "line2"} value={(form as any)[key]} onChange={e => setForm({...form,[key]:e.target.value})} className="mt-1 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2" /></label>)}</div>
        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-7 w-full rounded-xl bg-[#171717] px-5 py-4 text-sm font-bold text-white disabled:opacity-50">{busy ? "Preparing payment…" : `Pay ₹${total.toLocaleString("en-IN")}`}</button>
        <p className="mt-3 text-center text-xs text-black/45">Payment will use Razorpay Test Mode during development.</p>
      </form>
      <aside className="h-fit rounded-2xl border bg-white p-6"><p className="text-xs font-bold uppercase tracking-[.25em] text-[var(--accent)]">Order summary</p>{items.map((i:any) => <div key={i.variantId} className="mt-4 flex justify-between gap-4 text-sm"><span>{i.product.name} × {i.quantity}</span><span>₹{(Number(i.variant.price)*Number(i.quantity)).toLocaleString("en-IN")}</span></div>)}<div className="mt-5 flex justify-between border-t pt-5 font-bold"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div></aside>
    </section></main>;
}
