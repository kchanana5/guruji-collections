import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: orders } = await supabase.from("orders").select("id,order_number,status,grand_total,created_at,shipping_address,payments(status,provider_payment_id),shipments(status,awb_code,courier_name,tracking_url)").order("created_at", { ascending: false }).limit(100);

  return <main className="min-h-screen bg-[#f7f3ec] px-5 py-8 text-[#171717] sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl">
    <header className="flex items-end justify-between border-b border-black/10 pb-7"><div><Link href="/admin" className="text-sm font-semibold text-[#8a6a35]">← GJC Owner Console</Link><p className="mt-5 text-xs font-bold uppercase tracking-[0.3em] text-[#8a6a35]">ORDERS</p><h1 className="mt-2 text-4xl font-black">Fulfilment</h1></div><span className="rounded-full bg-white px-4 py-2 text-sm font-semibold">{orders?.length ?? 0} recent orders</span></header>
    <section className="mt-8 overflow-hidden rounded-3xl border border-black/10 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-black/[0.02] text-xs uppercase tracking-wide text-black/45"><tr><th className="px-5 py-4">Order</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Payment</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Shipment</th></tr></thead><tbody>{(orders ?? []).map((o: any) => { const a=o.shipping_address||{}; const p=Array.isArray(o.payments)?o.payments[0]:o.payments; const s=Array.isArray(o.shipments)?o.shipments[0]:o.shipments; return <tr key={o.id} className="border-b last:border-0"><td className="px-5 py-5"><p className="font-bold">{o.order_number}</p><p className="mt-1 text-xs text-black/45">{new Date(o.created_at).toLocaleString("en-IN")}</p></td><td className="px-5 py-5"><p className="font-semibold">{a.recipientName || "Customer"}</p><p className="text-xs text-black/45">{a.city || ""} {a.postalCode || ""}</p></td><td className="px-5 py-5"><span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-semibold">{p?.status || "pending"}</span></td><td className="px-5 py-5 font-bold">₹{Number(o.grand_total).toLocaleString("en-IN")}</td><td className="px-5 py-5"><span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-semibold">{o.status}</span></td><td className="px-5 py-5">{s?.awb_code ? <div><p className="font-semibold">{s.courier_name || "Courier"}</p><a className="text-xs underline" href={s.tracking_url || `https://shiprocket.co/tracking/${s.awb_code}`} target="_blank" rel="noreferrer">AWB {s.awb_code}</a></div> : <span className="text-xs text-black/45">Ready for shipment</span>}</td></tr> })}</tbody></table>{!orders?.length && <div className="p-12 text-center text-sm text-black/50">No orders yet. Your first paid GJC order will appear here.</div>}</div></section>
  </div></main>;
}
