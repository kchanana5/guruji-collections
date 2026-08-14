"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import WishlistButton from "@/components/wishlist-button";

type Variant = { id: string; sku: string; size: string | null; color: string | null; colorHex: string | null; price: number; stock: number };
type Product = { id: string; name: string; slug: string; price: number; image: string | null };

export default function AddToCart({ product, variants }: { product: Product; variants: Variant[] }) {
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[], [variants]);
  const colors = useMemo(() => [...new Map(variants.filter((v) => v.color).map((v) => [v.color, v])).values()], [variants]);
  const [size, setSize] = useState(sizes[0] || "");
  const [color, setColor] = useState(colors[0]?.color || "");
  const [message, setMessage] = useState("");
  const selected = variants.find((v) => (v.size || "") === size && (v.color || "") === color) || variants.find((v) => (v.size || "") === size) || variants[0];
  function add() {
    if (!selected) return setMessage("This product is currently unavailable.");
    const existing = JSON.parse(localStorage.getItem("gjc-cart") || "[]") as Array<{ variantId: string; quantity: number; product: Product; variant: Variant }>;
    const index = existing.findIndex((item) => item.variantId === selected.id);
    if (index >= 0) existing[index].quantity = Math.min(existing[index].quantity + 1, selected.stock);
    else existing.push({ variantId: selected.id, quantity: 1, product, variant: selected });
    localStorage.setItem("gjc-cart", JSON.stringify(existing));
    window.dispatchEvent(new Event("gjc-cart-updated"));
    setMessage("Added to cart.");
  }
  if (!variants.length) return <div className="rounded-xl bg-black/[0.04] px-4 py-3 text-sm text-black/60">Coming soon — this item is not in stock yet.</div>;
  return <div className="space-y-6">
    {sizes.length > 0 && <div><p className="mb-3 text-sm font-semibold">Size</p><div className="flex flex-wrap gap-2">{sizes.map((item) => <button type="button" key={item} onClick={() => setSize(item)} className={`min-w-12 rounded-xl border px-4 py-2.5 text-sm font-semibold ${size === item ? "border-[#171717] bg-[#171717] text-white" : "border-black/10 bg-white text-[#171717]"}`}>{item}</button>)}</div></div>}
    {colors.length > 0 && <div><p className="mb-3 text-sm font-semibold">Colour</p><div className="flex flex-wrap gap-2">{colors.map((item) => <button type="button" key={item.color!} onClick={() => setColor(item.color!)} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${color === item.color ? "border-[#171717] bg-[#171717] text-white" : "border-black/10 bg-white text-[#171717]"}`}>{item.color}</button>)}</div></div>}
    <div className="flex items-center justify-between border-y border-black/10 py-4 text-sm"><span>Availability</span><span className={selected?.stock ? "font-semibold" : "text-red-600"}>{selected?.stock ? `${selected.stock} in stock` : "Out of stock"}</span></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
      <button type="button" onClick={add} disabled={!selected?.stock} style={{ color: "#fff", backgroundColor: "#171717" }} className="min-h-14 w-full rounded-xl px-5 py-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Add to cart</button>
      <div className="min-h-14"><WishlistButton productId={product.id}/></div>
    </div>
    <Link href="/cart" style={{ color: "#171717", backgroundColor: "#fff" }} className="flex min-h-14 w-full items-center justify-center rounded-xl border border-black/15 px-5 py-4 text-sm font-bold">Go to cart →</Link>
    {message && <p className="text-center text-sm text-black/60">{message}</p>}
  </div>;
}
