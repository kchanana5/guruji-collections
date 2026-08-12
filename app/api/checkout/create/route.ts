import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function orderNumber() { return `GJC-${Date.now().toString(36).toUpperCase()}`; }

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const address = body.address;
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
    let subtotal = 0;
    const orderItems: any[] = [];
    for (const requested of items) {
      const v: any = byId.get(requested.variantId);
      const qty = Number(requested.quantity);
      if (!v || !Number.isInteger(qty) || qty < 1 || qty > v.stock_quantity) return NextResponse.json({ error: "One or more items are unavailable or out of stock" }, { status: 409 });
      const unit = Number(v.price || 0);
      subtotal += unit * qty;
      orderItems.push({ product_id: v.product_id, variant_id: v.id, product_name: v.products.name, sku: v.sku, size: v.size, color: v.color, unit_price: unit, quantity: qty, line_total: unit * qty });
    }

    const service = (await import("@supabase/supabase-js")).createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey, { auth: { persistSession: false } });
    const { data: { user } } = await supabase.auth.getUser();
    const number = orderNumber();
    const { data: order, error: orderError } = await service.from("orders").insert({ order_number: number, user_id: user?.id ?? null, subtotal, grand_total: subtotal, shipping_address: { ...address, country: "IN" } }).select("id,order_number,grand_total").single();
    if (orderError) throw orderError;
    const { error: itemError } = await service.from("order_items").insert(orderItems.map(i => ({ ...i, order_id: order.id })));
    if (itemError) throw itemError;

    const razorResponse = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString("base64")}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.round(subtotal * 100), currency: "INR", receipt: number, notes: { gjc_order_id: order.id } }) });
    if (!razorResponse.ok) { await service.from("orders").update({ status: "cancelled" }).eq("id", order.id); return NextResponse.json({ error: "Unable to create payment order" }, { status: 502 }); }
    const razorOrder = await razorResponse.json();
    const { error: paymentError } = await service.from("payments").insert({ order_id: order.id, provider: "razorpay", provider_order_id: razorOrder.id, status: "pending", amount: subtotal, currency: "INR" });
    if (paymentError) throw paymentError;
    return NextResponse.json({ orderId: order.id, orderNumber: number, razorpayOrderId: razorOrder.id, keyId: razorpayKeyId, amount: Math.round(subtotal * 100), currency: "INR" });
  } catch (error) { console.error("GJC checkout create", error); return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 }); }
}
