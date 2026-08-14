import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "gjc-product";
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "product-image").slice(0, 100);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });

  let draft: any;
  try { draft = JSON.parse(String(form.get("draft") || "")); }
  catch { return NextResponse.json({ error: "Invalid AI draft data." }, { status: 400 }); }

  const publish = String(form.get("publish") || "false") === "true";
  const price = Number(form.get("price"));
  const brand = String(form.get("brand") || "GJC").trim() || "GJC";
  const imageEntries = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  const legacyImage = form.get("image");
  const images = imageEntries.length ? imageEntries : (legacyImage instanceof File ? [legacyImage] : []);
  const variants = Array.isArray(draft?.variants) ? draft.variants : [];

  if (!draft?.name || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Product title and a valid INR price are required." }, { status: 400 });
  if (publish && !images.length) return NextResponse.json({ error: "At least one product image is required before publishing." }, { status: 400 });
  if (images.some(image => !image.type.startsWith("image/"))) return NextResponse.json({ error: "All uploaded files must be images." }, { status: 400 });
  if (images.some(image => image.size > 6 * 1024 * 1024)) return NextResponse.json({ error: "Each product image must be smaller than 6 MB." }, { status: 400 });
  if (images.length > 8) return NextResponse.json({ error: "You can upload up to 8 product images." }, { status: 400 });
  if (publish && !variants.length) return NextResponse.json({ error: "Add at least one size/colour variant before publishing." }, { status: 400 });

  const seenSkus = new Set<string>();
  for (const variant of variants) {
    const sku = String(variant?.sku || "").trim();
    const size = String(variant?.size || "").trim();
    const color = String(variant?.color || "").trim();
    const stock = Number(variant?.stock_quantity);
    const variantPrice = variant?.price === "" || variant?.price == null ? null : Number(variant.price);
    if (!sku || !size || !color || !Number.isInteger(stock) || stock < 0 || (variantPrice !== null && (!Number.isFinite(variantPrice) || variantPrice < 0))) return NextResponse.json({ error: "Every variant needs a size, colour, SKU and valid stock/price." }, { status: 400 });
    if (seenSkus.has(sku)) return NextResponse.json({ error: `Duplicate SKU: ${sku}` }, { status: 400 });
    seenSkus.add(sku);
  }
  if (publish && !variants.some((variant: any) => Number(variant?.stock_quantity) > 0)) return NextResponse.json({ error: "Add stock to at least one variant before publishing." }, { status: 400 });

  const slug = `${slugify(String(draft.name))}-${Date.now()}`;
  const { data: product, error: productError } = await supabase.from("products").insert({
    name: String(draft.name).trim(), slug, base_price: price, brand,
    short_description: draft.short_description || null, description: draft.description || null,
    seo_title: draft.seo_title || null, seo_description: draft.seo_description || null,
    tags: Array.isArray(draft.tags) ? draft.tags : [], ai_generated: true,
    ai_generation_notes: draft, status: publish ? "active" : "draft",
  }).select("id,slug").single();

  if (productError || !product) {
    console.error("GJC product insert failed", productError?.message);
    return NextResponse.json({ error: productError?.message || "Could not save product." }, { status: 500 });
  }

  const uploadedPaths: string[] = [];
  try {
    if (variants.length) {
      const { error: variantError } = await supabase.from("product_variants").insert(variants.map((variant: any) => ({
        product_id: product.id, sku: String(variant.sku).trim(), size: String(variant.size).trim(),
        color: String(variant.color).trim(), price: variant.price === "" || variant.price == null ? null : Number(variant.price),
        stock_quantity: Number(variant.stock_quantity), is_active: true,
      })));
      if (variantError) throw new Error(variantError.message);
    }

    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const path = `${product.id}/${String(index + 1).padStart(2, "0")}-${Date.now()}-${safeFileName(image.name)}`;
      const upload = await supabase.storage.from("product-images").upload(path, image, { contentType: image.type, upsert: false });
      if (upload.error) throw new Error(upload.error.message);
      uploadedPaths.push(path);
      const { error: imageError } = await supabase.from("product_images").insert({ product_id: product.id, storage_path: path, alt_text: String(draft.name || "GJC product"), sort_order: index });
      if (imageError) throw new Error(imageError.message);
    }

    return NextResponse.json({ id: product.id, slug: product.slug, published: publish, imageCount: images.length });
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from("product-images").remove(uploadedPaths).catch(() => undefined);
    await supabase.from("products").delete().eq("id", product.id);
    const message = error instanceof Error ? error.message : "Could not save product.";
    console.error("GJC product save failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
