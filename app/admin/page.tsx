import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");
  const [{ count: products }, { count: activeProducts }, { count: categories }, { count: orders }, { count: pendingOrders }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed", "processing"]),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f3ec] px-5 py-8 text-[#171717] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-black/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8a6a35]">GJC OWNER CONSOLE</p><h1 className="mt-2 text-4xl font-black tracking-tight">Good to see you{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1><p className="mt-2 text-sm text-black/55">Run Guruji Collections from one place.</p></div>
          <form action="/api/admin/signout" method="post"><button className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold">Sign out</button></form>
        </header>

        <section className="grid gap-4 py-8 sm:grid-cols-5">{[["Total products",products??0],["Live products",activeProducts??0],["Collections",categories??0],["Total orders",orders??0],["To fulfil",pendingOrders??0]].map(([label,value])=><div key={label} className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-sm text-black/50">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</section>

        <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl bg-[#171717] p-7 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d9b878]">GJC OPERATIONS</p><h2 className="mt-3 text-3xl font-black">Your store, one console.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Create AI-assisted products, review inventory and manage paid orders through fulfilment.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/admin/products/new" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#171717]">Add product</Link><Link href="/admin/products" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white">Manage products</Link><Link href="/admin/orders" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white">Manage orders</Link></div></div>
          <div className="rounded-3xl border border-black/10 bg-white p-7"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a35]">Launch checklist</p><ul className="mt-5 space-y-4 text-sm">{['AI product enrichment','Image storage & gallery','Inventory / size / colour variants','Razorpay payments','Shiprocket fulfilment','Customer tracking'].map((item)=><li key={item} className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-[#8a6a35]" />{item}</li>)}</ul></div>
        </section>
      </div>
    </main>
  );
}
