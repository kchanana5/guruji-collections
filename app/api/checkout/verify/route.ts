import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function safeSignatureEqual(expected: string, actual: string) {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(actual, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  const paymentId = url.searchParams.get("payment");
  const signature = url.searchParams.get("signature");
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keyId = process.env.RAZORPAY_KEY_ID;

  if (!orderId || !paymentId || !signature || !secret || !serviceKey || !supabaseUrl || !keyId) {
    return NextResponse.redirect(new URL("/checkout/failed?reason=configuration", request.url));
  }

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: payment } = await db
    .from("payments")
    .select("id,provider_order_id,amount,order_id,status")
    .eq("order_id", orderId)
    .eq("provider", "razorpay")
    .single();

  if (!payment?.provider_order_id || payment.order_id !== orderId) {
    return NextResponse.redirect(new URL("/checkout/failed?reason=order", request.url));
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${payment.provider_order_id}|${paymentId}`)
    .digest("hex");

  if (!safeSignatureEqual(expected, signature)) {
    return NextResponse.redirect(new URL("/checkout/failed?reason=signature", request.url));
  }

  try {
    const razorResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      },
      cache: "no-store",
    });

    if (!razorResponse.ok) {
      return NextResponse.redirect(new URL("/checkout/failed?reason=payment", request.url));
    }

    const razorPayment = await razorResponse.json();
    const expectedAmount = Math.round(Number(payment.amount) * 100);

    if (
      razorPayment.order_id !== payment.provider_order_id ||
      Number(razorPayment.amount) !== expectedAmount ||
      razorPayment.status !== "captured"
    ) {
      return NextResponse.redirect(new URL("/checkout/failed?reason=payment", request.url));
    }

    const { error: inventoryError } = await db.rpc("deduct_order_inventory", { p_order_id: orderId });
    if (inventoryError) {
      console.error("GJC inventory deduction", inventoryError);
      return NextResponse.redirect(new URL("/checkout/failed?reason=stock", request.url));
    }

    const { data: paidRows, error: paymentError } = await db
      .from("payments")
      .update({
        provider_payment_id: paymentId,
        status: "paid",
        raw_response: { verified: true, razorpay_status: razorPayment.status },
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (paymentError) throw paymentError;

    if (paidRows) {
      const { data: order } = await db.from("orders").select("coupon_code").eq("id", orderId).maybeSingle();
      if (order?.coupon_code) {
        const { data: couponRedeemed, error: couponUsageError } = await db.rpc("increment_coupon_usage", { p_code: order.coupon_code });
        if (couponUsageError || couponRedeemed === false) console.error("GJC Razorpay coupon redemption could not be recorded", couponUsageError?.message || "coupon unavailable at confirmation");
      }
    }

    await db
      .from("orders")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", orderId);

    return NextResponse.redirect(new URL(`/checkout/success?order=${encodeURIComponent(orderId)}`, request.url));
  } catch (error) {
    console.error("GJC checkout verification", error);
    return NextResponse.redirect(new URL("/checkout/failed?reason=verification", request.url));
  }
}
