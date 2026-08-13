import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <main className="min-h-screen bg-[var(--background)] px-5 py-10"><div className="mx-auto max-w-3xl"><Link href="/shop" className="text-sm font-semibold">← Continue shopping</Link><p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">GJC ACCOUNT</p><h1 className="mt-2 text-4xl font-black">Your account</h1>{user ? <div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-3xl border bg-white p-6"><p className="text-sm text-black/45">Signed in as</p><p className="mt-2 font-bold">{user.email}</p></div><Link href="/account/orders" className="rounded-3xl border bg-white p-6 transition hover:shadow-sm"><p className="text-sm text-black/45">Orders</p><p className="mt-2 font-bold">View order history →</p></Link></div> : <div className="mt-8 rounded-3xl border border-dashed bg-white p-10 text-center"><p className="font-bold">Guest shopping is available.</p><p className="mt-2 text-sm text-black/50">You can browse and checkout without an account. Customer sign-in and saved orders will be added next.</p><Link href="/shop" className="mt-6 inline-flex rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white">Shop GJC</Link></div>}</div></main>;
}
