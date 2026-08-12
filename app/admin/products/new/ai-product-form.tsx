"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AIProductForm() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("GJC");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);

  const canGenerate = Boolean(image && Number(price) >= 0 && price !== "");

  const tags = useMemo(() => Array.isArray(result?.tags) ? result.tags : [], [result]);

  function onImageChange(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Please choose an image file.");
    if (file.size > 6 * 1024 * 1024) return setMessage("Please choose an image smaller than 6 MB.");
    setImage(file);
    setMessage("");
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function generate() {
    if (!image || !canGenerate) return;
    setLoading(true);
    setMessage("");
    try {
      const dataUrl = preview || await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });
      const response = await fetch("/api/admin/ai-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, price: Number(price), brand }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");
      setResult(data);
      setMessage("AI draft generated. Review it before publishing.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!result) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const slug = `${String(result.name || "gjc-product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
      const { data: product, error } = await supabase.from("products").insert({
        name: result.name,
        slug,
        base_price: Number(price),
        brand,
        short_description: result.short_description || null,
        description: result.description || null,
        seo_title: result.seo_title || null,
        seo_description: result.seo_description || null,
        tags,
        ai_generated: true,
        ai_generation_notes: result,
        status: "draft",
      }).select("id").single();
      if (error || !product) throw new Error(error?.message || "Could not save product.");

      if (image) {
        const safeName = image.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        const path = `${product.id}/${Date.now()}-${safeName}`;
        const upload = await supabase.storage.from("product-images").upload(path, image, { contentType: image.type, upsert: false });
        if (upload.error) throw new Error(upload.error.message);
        const imageInsert = await supabase.from("product_images").insert({ product_id: product.id, storage_path: path, alt_text: result.name || "GJC product" });
        if (imageInsert.error) throw new Error(imageInsert.error.message);
      }
      window.location.href = "/admin";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save product.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-dashed border-black/20 bg-[#faf9f6] p-5">
        <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
          <div className="aspect-square overflow-hidden rounded-2xl bg-black/[0.04]">
            {preview ? <img src={preview} alt="Product preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-5 text-center text-sm text-black/40">Upload a clear clothing photo</div>}
          </div>
          <div>
            <p className="text-sm font-bold">AI product assistant</p>
            <p className="mt-1 text-xs leading-5 text-black/50">Upload one product image and give GJC the selling price. AI will prepare the catalog copy and suggested attributes.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label><span className="mb-2 block text-sm font-semibold">Product image</span><input type="file" accept="image/*" onChange={(e) => onImageChange(e.target.files?.[0])} className="block w-full text-sm" /></label>
              <label><span className="mb-2 block text-sm font-semibold">Price (INR)</span><input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="1499" className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#8a6a35]" /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Brand</span><input value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#8a6a35]" /></label>
            </div>
            <button type="button" onClick={generate} disabled={!canGenerate || loading} className="mt-5 rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{loading ? "Generating…" : "Generate with AI"}</button>
          </div>
        </div>
      </div>

      {message && <p className="rounded-xl bg-[#f7f3ec] px-4 py-3 text-sm text-black/65">{message}</p>}

      {result && <section className="rounded-2xl border border-black/10 bg-white p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a35]">AI DRAFT</p><h2 className="mt-1 text-2xl font-black">Review before saving</h2></div><span className="rounded-full bg-[#f7f3ec] px-3 py-1 text-xs font-bold">GJC AI</span></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div><p className="text-xs font-bold uppercase tracking-wider text-black/40">Title</p><p className="mt-1 font-bold">{result.name}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-black/40">Category</p><p className="mt-1">{result.category || "—"}</p></div>
          <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wider text-black/40">Description</p><p className="mt-1 text-sm leading-6 text-black/65">{result.description}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-black/40">Material</p><p className="mt-1">{result.material || "Not confidently identified"}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-black/40">Fit</p><p className="mt-1">{result.fit || "—"}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-black/40">Suggested sizes</p><p className="mt-1">{Array.isArray(result.suggested_sizes) ? result.suggested_sizes.join(", ") : "—"}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-black/40">Suggested colours</p><p className="mt-1">{Array.isArray(result.suggested_colors) ? result.suggested_colors.join(", ") : "—"}</p></div>
          <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wider text-black/40">Tags</p><div className="mt-2 flex flex-wrap gap-2">{tags.map((tag: string) => <span key={tag} className="rounded-full bg-[#f7f3ec] px-3 py-1 text-xs font-semibold">{tag}</span>)}</div></div>
        </div>
        <button type="button" onClick={saveDraft} disabled={loading} className="mt-7 w-full rounded-xl bg-[#171717] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50">{loading ? "Saving…" : "Save AI product as draft"}</button>
      </section>}
    </div>
  );
}
