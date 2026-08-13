import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  const paymentId = url.searchParams.get("payment");
  const signature = url.searchParams.get("signature");

  if (!orderId || !paymentId || !signature) {
    return NextResponse.redirect(new URL("/checkout?error=missing-payment-details", url));
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !razorpaySecret || !supabaseUrl) {
    return NextResponse.redirect(new URL("/checkout?error=payment-verification-not-configured", url));
  }

  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const appClient = await createServerClient();
  const { data: userData } = await appClient.auth.getUser();

  const { data: order, error: orderError } = await service
    .from("orders")
    .select("id,order_number,user_id,grand_total,status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.redirect(new URL("/checkout?error=order-not-found", url));
  }

  if (order.user_id && userData.user?.id && order.user_id !== userData.user.id) {
    return NextResponse.redirect(new URL("/checkout?error=order-access-denied", url));
  }

  const { data: payment, error: paymentLookupError } = await service
    .from("payments")
    .select("id,provider_order_id,amount,status")
    .eq("order_id", orderId)
    .eq("provider", "razorpay")
    .single();

  if (paymentLookupError || !payment || !payment.provider_order_id) {
    return NextResponse.redirect(new URL("/checkout?error=payment-record-not-found", url));
  }

  const expectedSignature = crypto
    .createHmac("sha256", razorpaySecret)
    .update(`${payment.provider_order_id}|${paymentId}`)
    .digest("hex");
  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(signature, "utf8");

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    await service.from("payments").update({ status: "failed", provider_payment_id: paymentId }).eq("id", payment.id);
    return NextResponse.redirect(new URL(`/checkout?error=payment-signature-invalid&order=${encodeURIComponent(orderId)}`, url));
  }

  if (Number(payment.amount) !== Number(order.grand_total)) {
    await service.from("payments").update({ status: "failed", provider_payment_id: paymentId }).eq("id", payment.id);
    return NextResponse.redirect(new URL(`/checkout?error=payment-amount-mismatch&order=${encodeURIComponent(orderId)}`, url));
  }

  if (["confirmed", "processing", "shipped", "delivered"].includes(order.status)) {
    return NextResponse.redirect(new URL(`/checkout/success?order=${encodeURIComponent(order.order_number)}`, url));
  }

  const { error: paymentError } = await service
    .from("payments")
    .update({ status: "paid", provider_payment_id: paymentId })
    .eq("id", payment.id);

  if (paymentError) {
    console.error("GJC payment update", paymentError);
    return NextResponse.redirect(new URL("/checkout?error=payment-update-failed", url));
  }

  const { error: inventoryError } = await service.rpc("deduct_order_inventory", { p_order_id: orderId });
  if (inventoryError) {
    // The payment was successful; do not mark it failed because stock reconciliation
    // is a separate concern that must be handled/refunded by the order workflow.
    console.error("GJC inventory deduction after successful payment", inventoryError);
    return NextResponse.redirect(new URL(`/checkout?error=inventory-unavailable&order=${encodeURIComponent(orderId)}`, url));
  }

  return NextResponse.redirect(new URL(`/checkout/success?order=${encodeURIComponent(order.order_number)}`, url));
}
