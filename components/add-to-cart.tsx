"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WishlistButton from "@/components/wishlist-button";

type Variant = { id: string; sku: string; size: string | null; color: string | null; colorHex: string | null; price: number; stock: number };
type Product = { id: string; name: string; slug: string; price: number; image: string | null };
type CartItem = { variantId: string; quantity: number; product: Product; variant: Variant };

export default function AddToCart({ product, variants }: { product: Product; variants: Variant[] }) {
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[], [variants]);
  const colors = useMemo(() => [...new Map(variants.filter((v) => v.color).map((v) => [v.color, v])).values()], [variants]);
  const [size, setSize] = useState(sizes[0] || "");
  const [color, setColor] = useState(colors[0]?.color || "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  const selected = variants.find((v) => (v.size || "") === size && (v.color || "") === color)
    || variants.find((v) => (v.size || "") === size)
    || variants[0];

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(current, 1), selected?.stock || 1));
  }, [selected?.id, selected?.stock]);

  function add() {
    if (!selected) return setMessage("This product is currently unavailable.");
    if (quantity > selected.stock) return setMessage(`Only ${selected.stock} item${selected.stock === 1 ? "" : "s"} available.`);
    const existing = JSON.parse(localStorage.getItem("gjc-cart") || "[]") as CartItem[];
    const index = existing.findIndex((item) => item.variantId === selected.id);
    if (index >= 0) existing[index].quantity = Math.min(existing[index].quantity + quantity, selected.stock);
    else existing.push({ variantId: selected.id, quantity, product, variant: selected });
    localStorage.setItem("gjc-cart", JSON.stringify(existing));
    window.dispatchEvent(new Event("gjc-cart-updated"));
    setMessage(`${quantity} item${quantity === 1 ? "" : "s"} added to cart.`);
  }

  if (!variants.length) return <div className="rounded-xl bg-black/[0.04] px-4 py-3 text-sm text-black/60">Coming soon — this item is not in stock yet.</div>;

  return <div className="space-y-6">
    {sizes.length > 0 && <div><p className="mb-3 text-sm font-semibold">Size</p><div className="flex flex-wrap gap-2">{sizes.map((item) => <button type="button" key={item} onClick={() => { setSize(item); setMessage(""); }} className={`min-w-12 rounded-xl border px-4 py-2.5 text-sm font-semibold ${size === item ? "border-[#171717] bg-[#171717] text-white" : "border-black/10 bg-white text-[#171717]"}`}>{item}</button>)}</div></div>}
    {colors.length > 0 && <div><p className="mb-3 text-sm font-semibold">Colour</p><div className="flex flex-wrap gap-2">{colors.map((item) => <button type="button" key={item.color!} onClick={() => { setColor(item.color!); setMessage(""); }} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${color === item.color ? "border-[#171717] bg-[#171717] text-white" : "border-black/10 bg-white text-[#171717]"}`}>{item.color}</button>)}</div></div>}
    <div><p className="mb-3 text-sm font-semibold">Quantity</p><div className="flex w-fit items-center rounded-xl border border-black/15 bg-white"><button type="button" aria-label="Decrease quantity" onClick={() => { setQuantity((current) => Math.max(1, current - 1)); setMessage(""); }} disabled={quantity <= 1} className="flex h-11 w-11 items-center justify-center rounded-l-xl text-xl font-medium text-[#171717] disabled:cursor-not-allowed disabled:opacity-30">−</button><span aria-live="polite" className="flex h-11 min-w-12 items-center justify-center border-x border-black/10 px-3 text-sm font-bold">{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => { setQuantity((current) => Math.min(selected?.stock || 1, current + 1)); setMessage(""); }} disabled={!selected?.stock || quantity >= selected.stock} className="flex h-11 w-11 items-center justify-center rounded-r-xl text-xl font-medium text-[#171717] disabled:cursor-not-allowed disabled:opacity-30">+</button></div></div>
    <div className="flex items-center justify-between border-y border-black/10 py-4 text-sm"><span>Availability</span><span className={selected?.stock ? "font-semibold" : "text-red-600"}>{selected?.stock ? `${selected.stock} in stock` : "Out of stock"}</span></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]"><button type="button" onClick={add} disabled={!selected?.stock} style={{ color: "#fff", backgroundColor: "#171717" }} className="min-h-14 w-full rounded-xl px-5 py-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Add to cart</button><div className="min-h-14"><WishlistButton productId={product.id}/></div></div>
    <Link href="/cart" style={{ color: "#171717", backgroundColor: "#fff" }} className="flex min-h-14 w-full items-center justify-center rounded-xl border border-black/15 px-5 py-4 text-sm font-bold">Go to cart →</Link>
    {message && <p role="status" className="text-center text-sm text-black/60">{message}</p>}
  </div>;
}
