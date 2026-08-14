import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddToCart from "@/components/add-to-cart";
import ProductReviews from "@/components/product-reviews";
import ProductGallery from "@/components/product-gallery";
import GjcLogo from "@/components/gjc-logo";
import { productImageUrl } from "@/lib/product-image";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,name,slug,brand,short_description,description,base_price,currency,tags,product_images(id,storage_path,alt_text,sort_order),product_variants(id,sku,size,color,color_hex,price,stock_quantity,is_active)")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!product) notFound();

  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const variants = (product.product_variants ?? []).filter(v => v.is_active && v.stock_quantity > 0);
  const imageUrls = images.map(image => ({ ...image, url: productImageUrl(supabase, image.storage_path) }));

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:px-8">
          <GjcLogo />
          <nav className="flex items-center gap-3 text-xs sm:gap-5 sm:text-sm"><Link href="/shop">Shop</Link><Link href="/account">Account</Link><Link href="/cart">Cart</Link></nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8 lg:px-8">
        <Link href="/shop" className="text-sm text-black/50">← Back to shop</Link>
        <section className="mt-6 grid gap-8 lg:mt-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-12">
          <ProductGallery images={imageUrls.map(image => ({ id: image.id, url: image.url, alt: image.alt_text || product.name }))} productName={product.name} />
          <div className="lg:sticky lg:top-8 lg:self-start">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">{product.brand || "GJC"}</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{product.name}</h1>
            <p className="mt-4 text-xl font-bold">₹{Number(product.base_price).toLocaleString("en-IN")}</p>
            {product.short_description && <p className="mt-5 text-sm leading-6 text-black/60">{product.short_description}</p>}
            <div className="mt-7"><AddToCart product={{ id: product.id, name: product.name, slug: product.slug, price: Number(product.base_price), image: imageUrls[0]?.url || null }} variants={variants.map(v => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, colorHex: v.color_hex, price: Number(v.price ?? product.base_price), stock: v.stock_quantity }))} /></div>
            {product.description && <div className="mt-9 border-t border-black/10 pt-7"><h2 className="font-semibold">Product details</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-black/60">{product.description}</p></div>}
            {product.tags?.length ? <div className="mt-7 flex flex-wrap gap-2">{product.tags.map((tag: string) => <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{tag}</span>)}</div> : null}
          </div>
        </section>
        <ProductReviews productId={product.id} />
      </div>
    </main>
  );
}
