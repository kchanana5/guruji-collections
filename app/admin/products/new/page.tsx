import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function createProduct(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price"));
  const description = String(formData.get("description") || "").trim();
  const brand = String(formData.get("brand") || "GJC").trim();
  const status = String(formData.get("status") || "draft");

  if (!name || !Number.isFinite(price) || price < 0) return;

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
  await supabase.from("products").insert({ name, slug, base_price: price, description, brand, status, ai_generated: false });
  revalidatePath("/admin");
  redirect("/admin");
}

export default function NewProductPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ec] px-5 py-8 text-[#171717] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <a href="/admin" className="text-sm font-semibold text-black/50 hover:text-black">← Back to dashboard</a>
        <div className="mt-7 rounded-3xl border border-black/10 bg-white p-7 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8a6a35]">PRODUCT CREATOR</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Add a product</h1>
          <p className="mt-3 text-sm leading-6 text-black/55">This is the first manual catalog flow. AI enrichment and image upload will plug into this same product record next.</p>
          <form action={createProduct} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label><span className="mb-2 block text-sm font-semibold">Product name</span><input name="name" required placeholder="Classic Cotton Shirt" className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none focus:border-[#8a6a35]" /></label>
              <label><span className="mb-2 block text-sm font-semibold">Brand</span><input name="brand" defaultValue="GJC" className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none focus:border-[#8a6a35]" /></label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label><span className="mb-2 block text-sm font-semibold">Price (INR)</span><input name="price" required min="0" step="0.01" type="number" placeholder="1499" className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none focus:border-[#8a6a35]" /></label>
              <label><span className="mb-2 block text-sm font-semibold">Status</span><select name="status" defaultValue="draft" className="w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none focus:border-[#8a6a35]"><option value="draft">Draft</option><option value="active">Publish now</option></select></label>
            </div>
            <label className="block"><span className="mb-2 block text-sm font-semibold">Description</span><textarea name="description" rows={6} placeholder="Describe the fabric, fit, style and key details…" className="w-full resize-none rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 outline-none focus:border-[#8a6a35]" /></label>
            <div className="flex flex-col gap-3 rounded-2xl bg-[#f7f3ec] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold">AI enrichment</p><p className="mt-1 text-xs text-black/50">Coming next: image → title, description, tags, SEO & variants.</p></div><span className="rounded-full bg-black/10 px-3 py-1 text-xs font-bold text-black/50">NEXT MODULE</span></div>
            <button className="w-full rounded-xl bg-[#171717] px-5 py-3.5 text-sm font-bold text-white hover:bg-black">Save product</button>
          </form>
        </div>
      </div>
    </main>
  );
}
