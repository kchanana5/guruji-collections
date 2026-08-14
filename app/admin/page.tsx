import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const [{ count: products }, { count: activeProducts }, { count: categories }, { count: orders }, { count: pendingOrders }, { data: recentProducts }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed", "processing"]),
    supabase.from("products").select("id, name, slug, base_price, status, brand, ai_generated, created_at, product_images(storage_path)").order("created_at", { ascending: false }).limit(5),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f3ec] px-5 py-8 text-[#171717] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-black/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8a6a35]">GJC OWNER CONSOLE</p><h1 className="mt-2 text-4xl font-black tracking-tight">Good to see you{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1><p className="mt-2 text-sm text-black/55">Run Guruji Collections from one place.</p></div>
          <form action="/api/admin/signout" method="post"><button className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold">Sign out</button></form>
        </header>

        <section className="grid gap-4 py-8 sm:grid-cols-5">{[["Total products",products??0],["Live products",activeProducts??0],["Collections",categories??0],["Total orders",orders??0],["To fulfil",pendingOrders??0]].map(([label,value])=><div key={label} className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-sm text-black/50">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</section>

        <section className="mb-5 overflow-hidden rounded-3xl border border-black/10 bg-white">
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
            <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a35]">CATALOG</p><h2 className="mt-1 text-2xl font-black">Recent products</h2></div>
            <Link href="/admin/products" className="rounded-xl border border-black/10 px-4 py-2 text-sm font-bold">Manage all</Link>
          </div>
          {!recentProducts?.length ? (
            <div className="px-6 py-10 text-sm text-black/50">No products yet. Create your first product above.</div>
          ) : (
            <div className="divide-y divide-black/10">
              {recentProducts.map((product) => {
                const imagePath = product.product_images?.[0]?.storage_path;
                const imageUrl = imagePath ? supabase.storage.from("product-images").getPublicUrl(imagePath).data.publicUrl : "";
                return (
                  <div key={product.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f7f3ec]">
                      {imageUrl ? <img src={imageUrl} alt={product.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/guruji-mark.svg"; event.currentTarget.className = "h-full w-full object-contain p-3 opacity-60"; }} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-bold text-black/25">GJC</div>}
                    </div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold">{product.name}</p>{product.ai_generated && <span className="rounded-full bg-[#f7f3ec] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8a6a35]">AI</span>}</div><p className="mt-1 text-xs text-black/45">{product.brand || "GJC"} · ₹{Number(product.base_price).toLocaleString("en-IN")}</p></div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${product.status === "active" ? "bg-green-50 text-green-700" : product.status === "archived" ? "bg-black/5 text-black/45" : "bg-amber-50 text-amber-700"}`}>{product.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl bg-[#171717] p-7 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d9b878]">GJC OPERATIONS</p><h2 className="mt-3 text-3xl font-black">Your store, one console.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Create AI-assisted products, review inventory and manage paid orders through fulfilment.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/admin/products/new" className="rounded-xl bg-[#d9b878] px-5 py-3 text-sm font-bold text-[#171717] hover:bg-[#e4c990]">Add product</Link><Link href="/admin/products" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white">Manage products</Link><Link href="/admin/orders" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white">Manage orders</Link></div></div>
          <div className="rounded-3xl border border-black/10 bg-white p-7"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a35]">Launch checklist</p><ul className="mt-5 space-y-4 text-sm">{['AI product enrichment','Image storage & gallery','Inventory / size / colour variants','Razorpay payments','Shiprocket fulfilment','Customer tracking'].map((item)=><li key={item} className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-[#8a6a35]" />{item}</li>)}</ul></div>
        </section>
      </div>
    </main>
  );
}
