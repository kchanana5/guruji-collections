import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function timingSafeHexEqual(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!timingSafeHexEqual(expected, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const paymentEntity = event?.payload?.payment?.entity;
  const orderEntity = event?.payload?.order?.entity;
  const providerPaymentId = paymentEntity?.id;
  const providerOrderId = paymentEntity?.order_id || orderEntity?.id;
  const notesOrderId = paymentEntity?.notes?.gjc_order_id || orderEntity?.notes?.gjc_order_id;

  if (!providerPaymentId && !providerOrderId && !notesOrderId) {
    return NextResponse.json({ received: true });
  }

  const { data: payment } = await db
    .from("payments")
    .select("id, order_id, amount, status, provider_order_id")
    .eq("provider", "razorpay")
    .or(`provider_payment_id.eq.${providerPaymentId || "__missing__"},provider_order_id.eq.${providerOrderId || "__missing__"}`)
    .limit(1)
    .maybeSingle();

  const orderId = payment?.order_id || notesOrderId;
  if (!orderId) return NextResponse.json({ received: true });

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const { data: existingPayment } = await db
      .from("payments")
      .select("id, status, amount, provider_order_id")
      .eq("order_id", orderId)
      .eq("provider", "razorpay")
      .maybeSingle();

    if (!existingPayment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });

    if (paymentEntity?.amount && Number(paymentEntity.amount) !== Math.round(Number(existingPayment.amount) * 100)) {
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    const { error: inventoryError } = await db.rpc("deduct_order_inventory", { p_order_id: orderId });
    if (inventoryError) {
      console.error("GJC inventory deduction", inventoryError);
      return NextResponse.json({ error: "Inventory could not be confirmed" }, { status: 409 });
    }

    await db.from("payments").update({
      provider_payment_id: providerPaymentId || null,
      status: "paid",
      raw_response: event,
      updated_at: new Date().toISOString(),
    }).eq("id", existingPayment.id);
  } else if (event.event === "payment.failed") {
    await db.from("payments").update({
      provider_payment_id: providerPaymentId || null,
      status: "failed",
      raw_response: event,
      updated_at: new Date().toISOString(),
    }).eq("order_id", orderId).eq("provider", "razorpay");
    await db.from("orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", orderId).eq("status", "pending");
  }

  return NextResponse.json({ received: true });
}
