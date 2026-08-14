"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const emptyForm = { label: "Home", full_name: "", phone: "", address_line1: "", address_line2: "", city: "", state: "", postal_code: "", country: "India", is_default: false };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/account"; return; }
    const { data, error } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
    if (error) setError(error.message); else setAddresses(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/account"; return; }
    const { error } = await supabase.from("addresses").insert({ ...form, user_id: user.id });
    if (error) setError(error.message); else { setForm(emptyForm); await load(); }
    setSaving(false);
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
    if (error) setError(error.message); else await load();
  }

  return <main className="min-h-screen bg-[var(--background)] px-5 py-10"><div className="mx-auto max-w-5xl"><Link href="/account" className="text-sm font-semibold">← Account</Link><p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">GJC ACCOUNT</p><h1 className="mt-2 text-4xl font-black">Saved addresses</h1><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
    <form onSubmit={save} className="rounded-3xl border bg-white p-6 space-y-4"><h2 className="text-xl font-black">Add address</h2><div className="grid grid-cols-2 gap-3">{[["label","Label"],["full_name","Full name"],["phone","Phone"],["postal_code","PIN code"],["city","City"],["state","State"],["country","Country"]].map(([key,placeholder])=><label key={key} className={key==="full_name"?"col-span-2":""}><span className="mb-1 block text-xs font-semibold">{placeholder}</span><input required={!['label','address_line2'].includes(key)} value={(form as any)[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="w-full rounded-xl border px-3 py-2.5" /></label>)}</div><label className="block"><span className="mb-1 block text-xs font-semibold">Address line 1</span><input required value={form.address_line1} onChange={e=>setForm({...form,address_line1:e.target.value})} className="w-full rounded-xl border px-3 py-2.5" /></label><label className="block"><span className="mb-1 block text-xs font-semibold">Address line 2 (optional)</span><input value={form.address_line2} onChange={e=>setForm({...form,address_line2:e.target.value})} className="w-full rounded-xl border px-3 py-2.5" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={e=>setForm({...form,is_default:e.target.checked})}/><span>Make this my default address</span></label>{error&&<p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<button disabled={saving} className="w-full rounded-xl bg-[#171717] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving?"Saving…":"Save address"}</button></form>
    <section><h2 className="mb-4 text-xl font-black">Your addresses</h2>{loading?<p className="text-sm text-black/50">Loading…</p>:addresses.length===0?<div className="rounded-3xl border border-dashed p-10 text-center text-sm text-black/50">No saved addresses yet.</div>:<div className="space-y-4">{addresses.map(a=><article key={a.id} className="rounded-3xl border bg-white p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-bold">{a.label}</h3>{a.is_default&&<span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-bold text-white">DEFAULT</span>}</div><p className="mt-2 text-sm font-semibold">{a.full_name} · {a.phone}</p><p className="mt-1 text-sm text-black/60">{a.address_line1}{a.address_line2?`, ${a.address_line2}`:""}, {a.city}, {a.state} {a.postal_code}, {a.country}</p></div><button onClick={()=>remove(a.id)} className="text-sm font-bold text-red-600">Remove</button></div></article>)}</div>}</section>
  </div></div></main>;
}
