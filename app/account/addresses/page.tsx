"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const emptyForm = { label: "Home", recipient_name: "", phone: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "IN", is_default: false };

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
    event.preventDefault(); setError("");
    const phone = form.phone.replace(/\D/g, "");
    const postal = form.postal_code.trim();
    if (!/^[6-9]\d{9}$/.test(phone)) { setError("Enter a valid 10-digit Indian mobile number."); return; }
    if (!/^\d{6}$/.test(postal)) { setError("Enter a valid 6-digit PIN code."); return; }
    if (form.recipient_name.trim().length < 2) { setError("Enter the recipient's full name."); return; }
    if (form.line1.trim().length < 5) { setError("Enter a complete address in Address line 1."); return; }
    if (form.city.trim().length < 2 || form.state.trim().length < 2) { setError("Enter a valid city and state."); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/account"; return; }
    if (form.is_default) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await supabase.from("addresses").insert({ ...form, user_id: user.id, phone, postal_code: postal });
    if (error) setError(error.message); else { setForm(emptyForm); await load(); }
    setSaving(false);
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
    if (error) setError(error.message); else await load();
  }

  const update = (key: keyof typeof emptyForm, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));

  return <main className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-5 sm:py-10"><div className="mx-auto max-w-5xl"><Link href="/account" className="text-sm font-semibold">← Account</Link><p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">GJC ACCOUNT</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Saved addresses</h1><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
    <form onSubmit={save} noValidate className="rounded-3xl border bg-white p-5 sm:p-6 space-y-4"><h2 className="text-xl font-black">Add address</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[["label","Label",false],["recipient_name","Full name",true],["phone","Phone",true],["postal_code","PIN code",true],["city","City",true],["state","State",true],["country","Country",true]].map(([key,placeholder,required])=><label key={key as string} className={key==="recipient_name"?"sm:col-span-2":""}><span className="mb-1 block text-xs font-semibold">{placeholder as string}</span><input required={Boolean(required)} maxLength={key==="phone"?10:key==="postal_code"?6:80} inputMode={key==="phone"||key==="postal_code"?"numeric":undefined} value={(form as any)[key as string]} onChange={e=>update(key as keyof typeof emptyForm,e.target.value)} className="w-full rounded-xl border border-black/15 px-3 py-2.5 outline-none focus:border-black/40" /></label>)}</div><label className="block"><span className="mb-1 block text-xs font-semibold">Address line 1</span><input required maxLength={150} value={form.line1} onChange={e=>update("line1",e.target.value)} className="w-full rounded-xl border border-black/15 px-3 py-2.5 outline-none focus:border-black/40" /></label><label className="block"><span className="mb-1 block text-xs font-semibold">Address line 2 (optional)</span><input maxLength={150} value={form.line2} onChange={e=>update("line2",e.target.value)} className="w-full rounded-xl border border-black/15 px-3 py-2.5 outline-none focus:border-black/40" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={e=>update("is_default",e.target.checked)}/><span>Make this my default address</span></label>{error&&<p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<button type="submit" disabled={saving} className="w-full rounded-xl bg-[#171717] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving?"Saving…":"Save address"}</button></form>
    <section><h2 className="mb-4 text-xl font-black">Your addresses</h2>{loading?<p className="text-sm text-black/50">Loading…</p>:addresses.length===0?<div className="rounded-3xl border border-dashed p-10 text-center text-sm text-black/50">No saved addresses yet.</div>:<div className="space-y-4">{addresses.map(a=><article key={a.id} className="rounded-3xl border bg-white p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{a.label}</h3>{a.is_default&&<span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-bold text-white">DEFAULT</span>}</div><p className="mt-2 text-sm font-semibold">{a.recipient_name} · {a.phone}</p><p className="mt-1 text-sm text-black/60">{a.line1}{a.line2?`, ${a.line2}`:""}, {a.city}, {a.state} {a.postal_code}, {a.country === "IN" ? "India" : a.country}</p></div><button type="button" onClick={()=>remove(a.id)} className="shrink-0 text-sm font-bold text-red-600">Remove</button></div></article>)}</div>}</section>
  </div></div></main>;
}
