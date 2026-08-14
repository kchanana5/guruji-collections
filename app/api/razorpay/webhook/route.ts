import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !serviceKey || !supabaseUrl) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signature, "utf8");
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  try {
    const payload = JSON.parse(rawBody);
    if (!["payment.captured", "order.paid"].includes(payload?.event)) return NextResponse.json({ ok: true, ignored: true });
    const razorOrderId = payload?.payload?.payment?.entity?.order_id || payload?.payload?.order?.entity?.id;
    const paymentId = payload?.payload?.payment?.entity?.id || null;
    if (!razorOrderId) return NextResponse.json({ ok: true, ignored: true });

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: payment } = await db.from("payments").select("id,order_id,amount,status").eq("provider", "razorpay").eq("provider_order_id", razorOrderId).maybeSingle();
    if (!payment) return NextResponse.json({ error: "Payment order not found" }, { status: 404 });
    if (payment.status === "paid") return NextResponse.json({ ok: true, duplicate: true });

    const { error: inventoryError } = await db.rpc("deduct_order_inventory", { p_order_id: payment.order_id });
    if (inventoryError) {
      console.error("GJC Razorpay webhook inventory", inventoryError);
      return NextResponse.json({ error: "Inventory confirmation failed" }, { status: 409 });
    }

    const { data: paidRows, error: paymentError } = await db
      .from("payments")
      .update({ status: "paid", provider_payment_id: paymentId, raw_response: payload, updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (paymentError) throw paymentError;

    if (paidRows) {
      const { data: order } = await db.from("orders").select("coupon_code").eq("id", payment.order_id).maybeSingle();
      if (order?.coupon_code) {
        const { data: couponRedeemed, error: couponUsageError } = await db.rpc("increment_coupon_usage", { p_code: order.coupon_code });
        if (couponUsageError || couponRedeemed === false) console.error("GJC Razorpay webhook coupon redemption could not be recorded", couponUsageError?.message || "coupon unavailable at confirmation");
      }
    }

    await db.from("orders").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", payment.order_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GJC Razorpay webhook", error);
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
