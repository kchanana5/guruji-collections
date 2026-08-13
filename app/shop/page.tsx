import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function imageUrl(supabase: Awaited<ReturnType<typeof createClient>>, path?: string | null) {
  if (!path) return null;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("id,name,slug,brand,short_description,base_price,currency,product_images(storage_path,sort_order,alt_text)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
  const { data: products, error } = await query;

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold tracking-widest text-white">GJC</span><span className="text-sm font-bold tracking-[0.25em]">GURUJI</span></Link>
          <nav className="flex items-center gap-4 text-sm"><Link href="/shop">Shop</Link><Link href="/cart">Cart</Link><Link href="/account">Account</Link></nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex flex-col gap-5 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">GJC COLLECTION</p><h1 className="mt-2 text-4xl font-semibold">Shop clothing</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Explore pieces published by Guruji Collections.</p></div>
          <form className="flex w-full max-w-sm gap-2"><input name="q" defaultValue={q} placeholder="Search products" className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30" /><button className="rounded-xl bg-[#171717] px-4 py-3 text-sm font-semibold text-white">Search</button></form>
        </div>

        {error ? <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">We couldn't load the collection right now.</div> : products?.length ? (
          <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => {
              const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
              const url = imageUrl(supabase, images[0]?.storage_path);
              return <Link href={`/shop/${product.slug}`} key={product.id} className="group">
                <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-stone-100">{url ? <img src={url} alt={images[0]?.alt_text || product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-sm text-black/30">GJC</div>}</div>
                <div className="mt-4 flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{product.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{product.brand || "Guruji Collections"}</p></div><p className="text-sm font-bold">₹{Number(product.base_price).toLocaleString("en-IN")}</p></div>
              </Link>;
            })}
          </div>
        ) : <div className="mt-16 rounded-3xl border border-dashed border-black/10 bg-white p-12 text-center"><p className="text-lg font-semibold">No published products yet.</p><p className="mt-2 text-sm text-[var(--muted)]">Publish a product from the GJC owner console and it will appear here.</p><Link href="/admin/products/new" className="mt-6 inline-flex rounded-xl bg-[#171717] px-5 py-3 text-sm font-semibold text-white">Add a product</Link></div>}
      </section>
    </main>
  );
}
