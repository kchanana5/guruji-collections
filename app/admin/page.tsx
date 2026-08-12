import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const [{ count: products }, { count: activeProducts }, { count: categories }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("categories").select("id", { count: "exact", head: true }),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f3ec] px-5 py-8 text-[#171717] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-black/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8a6a35]">GJC OWNER CONSOLE</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Good to see you{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1>
            <p className="mt-2 text-sm text-black/55">Run Guruji Collections from one place.</p>
          </div>
          <form action="/api/admin/signout" method="post"><button className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-black/[0.03]">Sign out</button></form>
        </header>

        <section className="grid gap-4 py-8 sm:grid-cols-3">
          {[
            ["Total products", products ?? 0],
            ["Live products", activeProducts ?? 0],
            ["Collections", categories ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-black/10 bg-white p-6">
              <p className="text-sm text-black/50">{label}</p>
              <p className="mt-2 text-4xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl bg-[#171717] p-7 text-white sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d9b878]">Next workflow</p>
            <h2 className="mt-3 text-3xl font-black">Add your first collection.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">The next GJC module turns a product photo and a price into a ready-to-review catalog listing. AI will prepare the copy, tags, SEO fields and suggested variants.</p>
            <a href="/admin/products/new" className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#171717] hover:bg-white/90">Add product</a>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-7">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a35]">Coming next</p>
            <ul className="mt-5 space-y-4 text-sm">
              {['AI product enrichment', 'Image storage & gallery', 'Inventory / size / colour variants', 'Orders & Shiprocket'].map((item) => <li key={item} className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-[#8a6a35]" />{item}</li>)}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
