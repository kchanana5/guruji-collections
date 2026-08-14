import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductStatusControl from "./status-control";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, base_price, status, brand, ai_generated, created_at, product_images(storage_path)")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f7f3ec] px-5 py-8 text-[#171717] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-black/45 hover:text-black">← Dashboard</Link>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-[#8a6a35]">GJC CATALOG</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Products</h1>
            <p className="mt-2 text-sm text-black/55">Review, publish and manage everything in your store catalog.</p>
          </div>
          <Link href="/admin/products/new" className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white">+ Add product</Link>
        </header>

        {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Could not load the catalog: {error.message}</p>}

        <section className="mt-7 overflow-hidden rounded-3xl border border-black/10 bg-white">
          {!products?.length ? (
            <div className="px-6 py-16 text-center"><p className="text-xl font-black">Your catalog is empty.</p><p className="mt-2 text-sm text-black/50">Start with a clothing photo and let GJC prepare the first draft.</p><Link href="/admin/products/new" className="mt-6 inline-flex rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white">Create first product</Link></div>
          ) : (
            <div className="divide-y divide-black/10">
              {products.map((product) => {
                const imagePath = product.product_images?.[0]?.storage_path;
                const imageUrl = imagePath ? supabase.storage.from("product-images").getPublicUrl(imagePath).data.publicUrl : "";
                return (
                  <article key={product.id} className="grid gap-4 p-5 sm:grid-cols-[72px_1fr_auto] sm:items-center sm:p-6">
                    <div className="h-20 w-20 overflow-hidden rounded-2xl bg-[#f7f3ec] sm:h-[72px] sm:w-[72px]">
                      {imageUrl ? <img src={imageUrl} alt={product.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/guruji-mark.svg"; event.currentTarget.className = "h-full w-full object-contain p-3 opacity-60"; }} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-bold text-black/25">GJC</div>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-bold">{product.name}</h2>
                        {product.ai_generated && <span className="rounded-full bg-[#f7f3ec] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8a6a35]">AI</span>}
                      </div>
                      <p className="mt-1 text-xs text-black/45">{product.brand || "GJC"} · ₹{Number(product.base_price).toLocaleString("en-IN")}</p>
                    </div>
                    <ProductStatusControl
                      productId={product.id}
                      productName={product.name}
                      initialStatus={product.status as "draft" | "active" | "archived"}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
