"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccountSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.session) {
      router.replace("/account");
      router.refresh();
      return;
    }
    setMessage("Account created. Check your email to confirm your address, then sign in.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10">
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <section className="w-full rounded-[2rem] border bg-white p-8 sm:p-10">
          <Link href="/account" className="text-sm font-semibold">← Account</Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">GJC ACCOUNT</p>
          <h1 className="mt-3 text-4xl font-black">Create your account</h1>
          <p className="mt-3 text-sm leading-6 text-black/55">Save your account access and view your GJC orders in one place.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-semibold">Email</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none focus:border-black" autoComplete="email" /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold">Password</span><input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none focus:border-black" autoComplete="new-password" /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold">Confirm password</span><input required type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none focus:border-black" autoComplete="new-password" /></label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {message && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-[#171717] px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading ? "Creating account…" : "Create account"}</button>
          </form>
          <p className="mt-6 text-center text-sm text-black/55">Already have an account? <Link href="/account/login" className="font-bold text-black underline underline-offset-4">Sign in</Link></p>
        </section>
      </div>
    </main>
  );
}
