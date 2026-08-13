import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

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
  const { data: order } = await service.from("orders").select("id,order_number,user_id,grand_total,status").eq("id", orderId).single();
  if (!order) return NextResponse.redirect(new URL("/checkout/failed?reason=order", url));
  if (order.user_id && userData.user?.id && order.user_id !== userData.user.id) return NextResponse.redirect(new URL("/checkout/failed?reason=order", url));

  const { data: payment } = await service.from("payments").select("id,provider_order_id,amount,status").eq("order_id", orderId).eq("provider", "razorpay").single();
  if (!payment?.provider_order_id) return NextResponse.redirect(new URL("/checkout/failed?reason=order", url));

  const expectedSignature = crypto.createHmac("sha256", razorpaySecret).update(`${payment.provider_order_id}|${paymentId}`).digest("hex");
  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(signature, "utf8");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return NextResponse.redirect(new URL("/checkout/failed?reason=signature", url));
  if (Number(payment.amount) !== Number(order.grand_total)) return NextResponse.redirect(new URL("/checkout/failed?reason=payment", url));

  try {
    const razorResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString("base64")}` },
      cache: "no-store",
    });
    if (!razorResponse.ok) return NextResponse.redirect(new URL("/checkout/failed?reason=payment", url));
    const razorPayment = await razorResponse.json();
    if (razorPayment.order_id !== payment.provider_order_id || Number(razorPayment.amount) !== Math.round(Number(payment.amount) * 100) || !["authorized", "captured"].includes(razorPayment.status)) {
      return NextResponse.redirect(new URL("/checkout/failed?reason=payment", url));
    }

    const { error: inventoryError } = await service.rpc("deduct_order_inventory", { p_order_id: orderId });
    if (inventoryError) {
      console.error("GJC inventory deduction", inventoryError);
      return NextResponse.redirect(new URL("/checkout/failed?reason=stock", url));
    }

    const { error: paymentError } = await service.from("payments").update({ status: "paid", provider_payment_id: paymentId, raw_response: razorPayment, updated_at: new Date().toISOString() }).eq("id", payment.id);
    if (paymentError) throw paymentError;
    await service.from("orders").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", orderId);

    return NextResponse.redirect(new URL(`/checkout/success?order=${encodeURIComponent(order.order_number)}`, url));
  } catch (error) {
    console.error("GJC checkout verification", error);
    return NextResponse.redirect(new URL("/checkout/failed?reason=verification", url));
  }
}
