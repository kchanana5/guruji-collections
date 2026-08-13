"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccountLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.replace("/account");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10">
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <section className="w-full rounded-[2rem] border bg-white p-8 sm:p-10">
          <Link href="/account" className="text-sm font-semibold">← Account</Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">GJC ACCOUNT</p>
          <h1 className="mt-3 text-4xl font-black">Welcome back</h1>
          <p className="mt-3 text-sm leading-6 text-black/55">Sign in to view your orders and manage your GJC account.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-semibold">Email</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none focus:border-black" autoComplete="email" /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold">Password</span><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none focus:border-black" autoComplete="current-password" /></label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-[#171717] px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading ? "Signing in…" : "Sign in"}</button>
          </form>
          <p className="mt-6 text-center text-sm text-black/55">New to GJC? <Link href="/account/signup" className="font-bold text-black underline underline-offset-4">Create an account</Link></p>
        </section>
      </div>
    </main>
  );
}
