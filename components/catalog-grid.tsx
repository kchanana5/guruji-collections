import Link from "next/link";

type ProductCard = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  base_price: number | string;
  imageUrl: string | null;
  altText?: string | null;
};

export default function CatalogGrid({ products }: { products: ProductCard[] }) {
  if (!products.length) {
    return (
      <div className="rounded-3xl border border-dashed border-black/10 bg-white p-12 text-center">
        <p className="text-lg font-semibold">No products found.</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Check back soon for the next GJC collection.</p>
        <Link href="/shop" className="mt-6 inline-flex rounded-xl bg-[#171717] px-5 py-3 text-sm font-semibold text-white">
          View all products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <Link href={`/shop/${product.slug}`} key={product.id} className="group">
          <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-stone-100">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.altText || product.name}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/guruji-mark.svg";
                  event.currentTarget.className = "h-full w-full object-contain p-10 opacity-60";
                }}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-black/30">GJC</div>
            )}
          </div>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{product.name}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{product.brand || "Guruji Collections"}</p>
            </div>
            <p className="text-sm font-bold">₹{Number(product.base_price).toLocaleString("en-IN")}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
