"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const { data } = await supabase.from("profiles").select("role").single();
    if (data?.role !== "admin") {
      await supabase.auth.signOut();
      setError("This account is not authorized for the GJC admin panel.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f7f3ec] px-6 py-12 text-[#171717]">
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <section className="w-full rounded-[2rem] border border-black/10 bg-white p-8 shadow-[0_24px_80px_rgba(23,23,23,0.08)] sm:p-10">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8a6a35]">GJC OWNER ACCESS</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Admin Login</h1>
            <p className="mt-3 text-sm leading-6 text-black/55">Manage products, inventory and orders for Guruji Collections.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Email</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none transition focus:border-[#8a6a35]" placeholder="owner@gurujicollections.in" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Password</span>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none transition focus:border-[#8a6a35]" placeholder="••••••••" />
            </label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-[#171717] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Signing in…" : "Sign in to GJC"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
