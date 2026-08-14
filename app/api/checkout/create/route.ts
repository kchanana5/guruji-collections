import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
function orderNumber() { return `GJC-${Date.now().toString(36).toUpperCase()}`; }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const address = body.address;
    const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim() : "";
    if (!items.length || !address?.recipientName || !address?.phone || !address?.line1 || !address?.city || !address?.state || !address?.postalCode) return NextResponse.json({ error: "Cart and complete delivery address are required" }, { status: 400 });
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!adminKey || !razorpayKeyId || !razorpaySecret) return NextResponse.json({ error: "Checkout is not configured yet" }, { status: 503 });
    const supabase = await createClient();
    const variantIds = items.map((i: any) => i.variantId).filter(Boolean);
    const { data: variants, error: variantsError } = await supabase.from("product_variants").select("id, product_id, sku, size, color, price, stock_quantity, is_active, products!inner(id,name,status)").in("id", variantIds).eq("is_active", true).eq("products.status", "active");
    if (variantsError) throw variantsError;
    const byId = new Map((variants || []).map((v: any) => [v.id, v]));
    let subtotal = 0; const orderItems: any[] = [];
    for (const requested of items) {
      const v: any = byId.get(requested.variantId); const qty = Number(requested.quantity);
      if (!v || !Number.isInteger(qty) || qty < 1 || qty > v.stock_quantity) return NextResponse.json({ error: "One or more items are unavailable or out of stock" }, { status: 409 });
      const unit = Number(v.price || 0); subtotal += unit * qty;
      orderItems.push({ product_id: v.product_id, variant_id: v.id, product_name: v.products.name, sku: v.sku, size: v.size, color: v.color, unit_price: unit, quantity: qty, line_total: unit * qty });
    }
    const service = (await import("@supabase/supabase-js")).createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey, { auth: { persistSession: false } });
    let discount = 0;
    if (couponCode) {
      const { data: couponResult, error: couponError } = await service.rpc("validate_coupon", { p_code: couponCode, p_order_value: subtotal });
      const row: any = Array.isArray(couponResult) ? couponResult[0] : couponResult;
      if (couponError || !row?.valid) return NextResponse.json({ error: row?.message || "This coupon is invalid or unavailable." }, { status: 400 });
      discount = Math.min(Number(row.discount || 0), subtotal);
    }
    const grandTotal = Math.max(0, subtotal - discount);
    const { data: { user } } = await supabase.auth.getUser();
    const number = orderNumber();
    const { data: order, error: orderError } = await service.from("orders").insert({ order_number: number, user_id: user?.id ?? null, subtotal, discount_total: discount, grand_total: grandTotal, shipping_address: { ...address, country: "IN" }, notes: couponCode ? `Coupon: ${couponCode.toUpperCase()}` : null }).select("id,order_number,grand_total").single();
    if (orderError) throw orderError;
    const { error: itemError } = await service.from("order_items").insert(orderItems.map(i => ({ ...i, order_id: order.id })));
    if (itemError) throw itemError;
    const razorResponse = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString("base64")}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.round(grandTotal * 100), currency: "INR", receipt: number, notes: { gjc_order_id: order.id, coupon: couponCode || undefined, discount: discount.toFixed(2) } }) });
    if (!razorResponse.ok) {
      const raw = await razorResponse.text(); let details: any = null; try { details = JSON.parse(raw); } catch {}
      await service.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      console.error("GJC Razorpay order creation failed", { status: razorResponse.status, statusText: razorResponse.statusText, error: details?.error ?? "non-json response" });
      return NextResponse.json({ error: "Unable to create payment order", provider: "razorpay", providerStatus: razorResponse.status, providerCode: details?.error?.code ?? null, providerReason: details?.error?.description ?? details?.error?.reason ?? null }, { status: 502 });
    }
    const razorOrder = await razorResponse.json();
    const { error: paymentError } = await service.from("payments").insert({ order_id: order.id, provider: "razorpay", provider_order_id: razorOrder.id, status: "pending", amount: grandTotal, currency: "INR" });
    if (paymentError) throw paymentError;
    if (couponCode) await service.rpc("increment_coupon_usage", { p_code: couponCode });
    return NextResponse.json({ orderId: order.id, orderNumber: number, razorpayOrderId: razorOrder.id, keyId: razorpayKeyId, amount: Math.round(grandTotal * 100), currency: "INR", subtotal, discount, total: grandTotal });
  } catch (error) { console.error("GJC checkout create", error); return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 }); }
}
