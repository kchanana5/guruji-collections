"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const order = searchParams.get("order");
  const isCod = searchParams.get("method") === "cod";

  useEffect(() => {
    localStorage.removeItem("gjc-cart");
    localStorage.removeItem("gjc-checkout-form");
    window.dispatchEvent(new Event("gjc-cart-updated"));
  }, []);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#171717] text-white">✓</div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[.3em] text-[var(--accent)]">GJC ORDER CONFIRMED</p>
      <h1 className="mt-2 text-4xl font-bold">Thank you!</h1>
      <p className="mt-4 text-sm leading-6 text-black/55">
        {isCod
          ? "Your Cash on Delivery order has been confirmed. Please keep the order amount ready when your package is delivered."
          : "Your payment has been verified and your order is confirmed. We’ll keep the order updated as it moves toward dispatch."}
      </p>
      {order && <p className="mt-6 rounded-xl bg-black/[.03] p-3 text-sm font-semibold break-all">Order: {order}</p>}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white">Continue shopping</Link>
        <Link href="/account" className="rounded-xl border border-black/10 px-5 py-3 text-sm font-bold">View account</Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccess() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-16">
      <Suspense fallback={<div className="mx-auto max-w-xl rounded-3xl border bg-white p-12 text-center text-sm text-black/50">Loading order confirmation…</div>}>
        <CheckoutSuccessContent />
      </Suspense>
    </main>
  );
}
