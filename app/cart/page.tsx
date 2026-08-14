"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import GjcLogo from "@/components/gjc-logo";

type Item = {
  variantId: string;
  quantity: number;
  product: { id: string; name: string; slug: string; price: number; image: string | null };
  variant: { size: string | null; color: string | null; price: number; stock: number };
};

type Coupon = { code: string; discount: number };

export default function CartPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    const read = () => setItems(JSON.parse(localStorage.getItem("gjc-cart") || "[]"));
    read();
    const saved = JSON.parse(localStorage.getItem("gjc-coupon") || "null");
    if (saved?.code) {
      setCouponCode(String(saved.code).toUpperCase());
      setCoupon({ code: String(saved.code).toUpperCase(), discount: Number(saved.discount || 0) });
    }
    window.addEventListener("gjc-cart-updated", read);
    return () => window.removeEventListener("gjc-cart-updated", read);
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0), [items]);
  const discount = Math.min(coupon?.discount || 0, subtotal);
  const total = Math.max(0, subtotal - discount);

  useEffect(() => {
    if (!coupon?.code || !subtotal) return;
    let cancelled = false;
    const refreshCoupon = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("validate_coupon", { p_code: coupon.code, p_order_value: subtotal });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.valid) {
        setCoupon(null);
        setCouponCode("");
        localStorage.removeItem("gjc-coupon");
        setCouponMessage(row?.message || "This coupon is no longer valid for this cart.");
        return;
      }
      const refreshed = { code: coupon.code, discount: Number(row.discount || 0) };
      setCoupon(refreshed);
      localStorage.setItem("gjc-coupon", JSON.stringify(refreshed));
    };
    refreshCoupon();
    return () => { cancelled = true; };
  }, [subtotal, coupon?.code]);

  function update(index: number, quantity: number) {
    const next = [...items];
    if (quantity <= 0) next.splice(index, 1);
    else next[index] = { ...next[index], quantity: Math.min(quantity, next[index].variant.stock) };
    setItems(next);
    localStorage.setItem("gjc-cart", JSON.stringify(next));
    window.dispatchEvent(new Event("gjc-cart-updated"));
  }

  function clearItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    localStorage.setItem("gjc-cart", JSON.stringify(next));
    window.dispatchEvent(new Event("gjc-cart-updated"));
  }

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code) { setCouponMessage("Enter a coupon code."); return; }
    setCouponBusy(true);
    setCouponMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("validate_coupon", { p_code: code, p_order_value: subtotal });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row?.valid) {
      setCoupon(null);
      localStorage.removeItem("gjc-coupon");
      setCouponMessage(row?.message || "This coupon is invalid or unavailable.");
    } else {
      const next = { code: code.toUpperCase(), discount: Number(row.discount || 0) };
      setCoupon(next);
      setCouponCode(next.code);
      localStorage.setItem("gjc-coupon", JSON.stringify(next));
    }
    setCouponBusy(false);
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponCode("");
    setCouponMessage("");
    localStorage.removeItem("gjc-coupon");
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-5 sm:py-5 lg:px-8">
          <GjcLogo />
          <Link href="/shop" style={{ color: "#171717", backgroundColor: "#fff" }} className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold">Continue shopping</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">GJC BAG</p>
        <h1 className="mt-2 text-4xl font-semibold">Your cart</h1>
        {!items.length ? (
          <div className="mt-10 rounded-3xl border border-dashed border-black/10 bg-white p-10 text-center sm:p-12">
            <p className="font-semibold">Your cart is empty.</p>
            <Link href="/shop" style={{ color: "#fff", backgroundColor: "#171717" }} className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-bold">Shop GJC</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.variantId} className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-4 sm:flex-row">
                  <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100">{item.product.image && <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3"><Link href={`/shop/${item.product.slug}`} className="font-semibold">{item.product.name}</Link><button type="button" onClick={() => clearItem(index)} style={{ color: "#171717", backgroundColor: "#fff" }} className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold">Remove</button></div>
                    <p className="mt-1 text-xs text-black/50">{item.variant.size || "One size"}{item.variant.color ? ` · ${item.variant.color}` : ""}</p>
                    <p className="mt-3 text-sm font-bold">₹{item.variant.price.toLocaleString("en-IN")}</p>
                    <div className="mt-3 flex items-center gap-2"><button type="button" aria-label="Decrease quantity" onClick={() => update(index, item.quantity - 1)} style={{ color: "#171717", backgroundColor: "#fff" }} className="h-9 w-9 rounded-lg border border-black/15 text-lg">−</button><span className="w-7 text-center text-sm font-semibold">{item.quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => update(index, item.quantity + 1)} style={{ color: "#171717", backgroundColor: "#fff" }} className="h-9 w-9 rounded-lg border border-black/15 text-lg">+</button></div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[.25em] text-[var(--accent)]">Order summary</p>
              <div className="mt-5">
                <label htmlFor="coupon" className="text-sm font-semibold">Have a coupon?</label>
                {coupon ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800"><span><strong>{coupon.code}</strong> applied</span><button type="button" onClick={removeCoupon} className="font-bold underline">Remove</button></div>
                ) : (
                  <div className="mt-2 flex gap-2"><input id="coupon" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === "Enter") applyCoupon(); }} placeholder="Enter coupon code" className="min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3 py-3 text-sm outline-none focus:border-black" /><button type="button" onClick={applyCoupon} disabled={couponBusy} style={{ color: "#fff", backgroundColor: "#171717" }} className="shrink-0 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50">{couponBusy ? "Applying…" : "Apply"}</button></div>
                )}
                {couponMessage && !coupon && <p role="status" className="mt-2 text-xs text-red-600">{couponMessage}</p>}
              </div>
              <div className="mt-5 flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">₹{subtotal.toLocaleString("en-IN")}</span></div>
              {discount > 0 && <div className="mt-3 flex justify-between text-sm text-green-700"><span>Coupon discount</span><span className="font-bold">−₹{discount.toLocaleString("en-IN")}</span></div>}
              <div className="mt-4 flex justify-between border-t pt-4 text-sm"><span>Shipping</span><span className="text-black/50">Calculated at checkout</span></div>
              <div className="mt-4 flex justify-between border-t pt-4 font-bold"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
              <p className="mt-3 text-xs leading-5 text-black/50">Taxes included. Shipping calculated at checkout.</p>
              <Link href="/checkout" style={{ color: "#fff", backgroundColor: "#171717" }} className="mt-6 flex min-h-14 w-full items-center justify-center rounded-xl px-5 py-4 text-sm font-bold">Proceed to checkout →</Link>
              <div className="mt-4 flex justify-center gap-3 text-xs text-black/50"><span>✓ Secure checkout</span><span>•</span><span>↻ Easy returns</span></div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
