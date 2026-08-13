"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccountActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/account");
    router.refresh();
  }
  return <button onClick={signOut} disabled={loading} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-bold disabled:opacity-60">{loading ? "Signing out…" : "Sign out"}</button>;
}
