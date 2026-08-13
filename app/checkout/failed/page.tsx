"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const messages: Record<string, string> = {
  configuration: "Payment configuration is incomplete.",
  order: "We could not find the payment order.",
  signature: "Payment verification failed. No order was confirmed.",
  payment: "The payment could not be verified.",
  stock: "Payment was received, but inventory could not be confirmed. Please contact GJC support before retrying.",
  verification: "We could not complete payment verification.",
};

function FailedContent() {
  const reason = useSearchParams().get("reason") || "verification";
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">!</div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.3em] text-[var(--accent)]">GJC PAYMENT</p>
        <h1 className="mt-2 text-4xl font-bold">Payment not confirmed</h1>
        <p className="mt-4 text-sm leading-6 text-black/55">{messages[reason] || messages.verification}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/cart" className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white">Return to cart</Link>
          <Link href="/shop" className="rounded-xl border border-black/10 px-5 py-3 text-sm font-bold">Continue shopping</Link>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--background)] px-5 py-16"><div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center sm:p-12"><p className="text-sm text-black/55">Loading payment status…</p></div></main>}>
      <FailedContent />
    </Suspense>
  );
}
