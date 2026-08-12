import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url); const orderId = url.searchParams.get("order"); const paymentId = url.searchParams.get("payment"); const signature = url.searchParams.get("signature");
  const secret = process.env.RAZORPAY_KEY_SECRET; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!orderId || !paymentId || !signature || !secret || !serviceKey) return NextResponse.redirect(new URL("/checkout/failed?reason=configuration", request.url));
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } });
  const { data: payment } = await db.from("payments").select("id,provider_order_id,amount,order_id").eq("order_id", orderId).eq("provider","razorpay").single();
  if (!payment?.provider_order_id) return NextResponse.redirect(new URL("/checkout/failed?reason=order", request.url));
  const expected = crypto.createHmac("sha256", secret).update(`${payment.provider_order_id}|${paymentId}`).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return NextResponse.redirect(new URL("/checkout/failed?reason=signature", request.url));
  await db.from("payments").update({ provider_payment_id: paymentId, status: "paid", raw_response: { verified: true } }).eq("id", payment.id);
  await db.from("orders").update({ status: "confirmed" }).eq("id", orderId);
  return NextResponse.redirect(new URL(`/checkout/success?order=${encodeURIComponent(orderId)}`, request.url));
}
