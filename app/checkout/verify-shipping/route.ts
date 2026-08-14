import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createShiprocketShipment } from "@/lib/shiprocket";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  const paymentId = url.searchParams.get("payment");
  const signature = url.searchParams.get("signature");
  if (!orderId || !paymentId || !signature) return NextResponse.redirect(new URL("/checkout/failed?reason=verification", url));
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  if (!serviceKey || !razorpaySecret || !supabaseUrl || !razorpayKeyId) return NextResponse.redirect(new URL("/checkout/failed?reason=configuration", url));

  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const appClient = await createServerClient();
  const { data: userData } = await appClient.auth.getUser();
  const { data: order } = await service.from("orders").select("id,order_number,user_id,grand_total,discount_total,shipping_address,status").eq("id", orderId).single();
  if (!order) return NextResponse.redirect(new URL("/checkout/failed?reason=order", url));
  if (order.user_id && userData.user?.id && order.user_id !== userData.user.id) return NextResponse.redirect(new URL("/checkout/failed?reason=order", url));
  const { data: payment } = await service.from("payments").select("id,provider_order_id,amount,status").eq("order_id", orderId).eq("provider", "razorpay").single();
  if (!payment?.provider_order_id) return NextResponse.redirect(new URL("/checkout/failed?reason=order", url));

  const expected = crypto.createHmac("sha256", razorpaySecret).update(`${payment.provider_order_id}|${paymentId}`).digest("hex");
  const received = signature;
  if (expected.length !== received.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return NextResponse.redirect(new URL("/checkout/failed?reason=signature", url));
  if (Number(payment.amount) !== Number(order.grand_total)) return NextResponse.redirect(new URL("/checkout/failed?reason=payment", url));

  try {
    const razorResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString("base64")}` }, cache: "no-store" });
    if (!razorResponse.ok) return NextResponse.redirect(new URL("/checkout/failed?reason=payment", url));
    const razorPayment = await razorResponse.json();
    if (razorPayment.order_id !== payment.provider_order_id || Number(razorPayment.amount) !== Math.round(Number(payment.amount) * 100) || !["authorized", "captured"].includes(razorPayment.status)) return NextResponse.redirect(new URL("/checkout/failed?reason=payment", url));

    const { error: inventoryError } = await service.rpc("deduct_order_inventory", { p_order_id: orderId });
    if (inventoryError) return NextResponse.redirect(new URL("/checkout/failed?reason=stock", url));
    const { error: paymentError } = await service.from("payments").update({ status: "paid", provider_payment_id: paymentId, raw_response: razorPayment, updated_at: new Date().toISOString() }).eq("id", payment.id);
    if (paymentError) throw paymentError;
    await service.from("orders").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", orderId);

    try {
      const { data: existing } = await service.from("shipments").select("id,external_shipment_id,awb_code").eq("order_id", orderId).maybeSingle();
      if (!existing?.external_shipment_id && !existing?.awb_code) {
        const { data: items } = await service.from("order_items").select("sku,product_name,quantity,unit_price,variant_id").eq("order_id", orderId);
        const variantIds = (items || []).map((item: any) => item.variant_id).filter(Boolean);
        const { data: variants } = variantIds.length ? await service.from("product_variants").select("id,weight_grams").in("id", variantIds) : { data: [] };
        const weights = new Map((variants || []).map((v: any) => [v.id, Number(v.weight_grams || 0)]));
        const weightKg = Math.max(0.5, (items || []).reduce((sum: number, item: any) => sum + (weights.get(item.variant_id) || 0) * Number(item.quantity || 0) / 1000, 0));
        const a = order.shipping_address || {};
        const shipment = await createShiprocketShipment({ orderId: order.order_number, orderDate: new Date().toISOString().slice(0, 19).replace("T", " "), customerName: String(a.recipientName), phone: String(a.phone), email: userData.user?.email || "", address: String(a.line1), address2: String(a.line2 || ""), city: String(a.city), state: String(a.state), country: "India", pincode: String(a.postalCode), items: (items || []).map((i: any) => ({ sku: i.sku || `GJC-${i.variant_id}`, name: i.product_name, units: Number(i.quantity), sellingPrice: Number(i.unit_price) })), subtotal: Number(order.grand_total), totalDiscount: Number(order.discount_total || 0), weightKg, lengthCm: Number(process.env.SHIPROCKET_PACKAGE_LENGTH_CM || 10), breadthCm: Number(process.env.SHIPROCKET_PACKAGE_BREADTH_CM || 10), heightCm: Number(process.env.SHIPROCKET_PACKAGE_HEIGHT_CM || 10) });
        await service.from("shipments").upsert({ order_id: orderId, provider: "shiprocket", external_shipment_id: String(shipment.shipmentId), awb_code: shipment.awbCode, courier_name: shipment.courierName, tracking_url: shipment.awbCode ? `https://shiprocket.co/tracking/${encodeURIComponent(shipment.awbCode)}` : null, status: shipment.awbCode ? "awb_assigned" : "created", raw_response: shipment.raw, updated_at: new Date().toISOString() }, { onConflict: "order_id" });
      }
    } catch (shippingError) { console.error("GJC Shiprocket shipment creation", shippingError); }

    return NextResponse.redirect(new URL(`/checkout/success?order=${encodeURIComponent(order.order_number)}`, url));
  } catch (error) {
    console.error("GJC checkout verification", error);
    return NextResponse.redirect(new URL("/checkout/failed?reason=verification", url));
  }
}
