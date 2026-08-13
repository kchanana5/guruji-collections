import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderActions from "../order-actions";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const { data: order, error } = await supabase.from("orders").select("id,order_number,status,grand_total,subtotal,shipping_address,created_at,order_items(product_name,sku,size,color,unit_price,quantity,line_total),payments(provider,status,provider_payment_id,amount),shipments(provider,status,awb_code,courier_name,tracking_url)").eq("id", id).single();
  if (error || !order) notFound();
  const address = order.shipping_address || {};
  const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
  const shipment = Array.isArray(order.shipments) ? order.shipments[0] : order.shipments;

  return <main className="min-h-screen bg-[#f7f3ec] px-5 py-8 text-[#171717] sm:px-8 lg:px-12"><div className="mx-auto max-w-5xl">
    <Link href="/admin/orders" className="text-sm font-semibold text-[#8a6a35]">← Back to orders</Link>
    <header className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-7"><div><p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8a6a35]">ORDER</p><h1 className="mt-2 text-4xl font-black">{order.order_number}</h1><p className="mt-2 text-sm text-black/50">{new Date(order.created_at).toLocaleString("en-IN")}</p></div><div className="text-right"><p className="text-2xl font-black">₹{Number(order.grand_total).toLocaleString("en-IN")}</p><span className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-bold">{order.status}</span></div></header>
    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="rounded-3xl border border-black/10 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a35]">Items</p><div className="mt-5 divide-y divide-black/10">{(order.order_items ?? []).map((item: any) => <div key={`${item.sku}-${item.size}-${item.color}`} className="flex justify-between gap-5 py-4 first:pt-0"><div><p className="font-bold">{item.product_name}</p><p className="mt-1 text-xs text-black/45">SKU {item.sku || "—"}{item.size ? ` · ${item.size}` : ""}{item.color ? ` · ${item.color}` : ""} · Qty {item.quantity}</p></div><p className="font-bold">₹{Number(item.line_total).toLocaleString("en-IN")}</p></div>)}</div></section>
      <aside className="space-y-5"><div className="rounded-3xl border border-black/10 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a35]">Delivery</p><p className="mt-4 font-bold">{address.recipientName}</p><p className="mt-1 text-sm leading-6 text-black/60">{address.phone}<br/>{address.line1}{address.line2 ? <><br/>{address.line2}</> : null}<br/>{address.city}, {address.state} {address.postalCode}</p></div><div className="rounded-3xl border border-black/10 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a35]">Payment</p><p className="mt-4 text-sm">{payment?.provider || "Razorpay"}</p><p className="mt-1 font-bold">{payment?.status || "pending"}</p>{payment?.provider_payment_id && <p className="mt-2 break-all text-xs text-black/45">{payment.provider_payment_id}</p>}</div></aside>
    </div>
    <OrderActions orderId={order.id} status={order.status} awbCode={shipment?.awb_code || ""} courierName={shipment?.courier_name || ""} trackingUrl={shipment?.tracking_url || ""} />
    {shipment?.awb_code && <div className="mt-5 rounded-3xl border border-black/10 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a35]">Shipment</p><p className="mt-3 font-bold">{shipment.courier_name || "Courier"} · AWB {shipment.awb_code}</p>{shipment.tracking_url && <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold underline">Open tracking</a>}</div>}
  </div></main>;
}
