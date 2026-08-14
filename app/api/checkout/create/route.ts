import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function orderNumber() { return `GJC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }

export async function POST(request: Request) {
  let service: any = null;
  let createdOrderId: string | null = null;
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const address = body.address;
    const paymentMethod = body.paymentMethod === "cod" ? "cod" : "razorpay";
    const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim().toUpperCase() : "";
    const email = typeof address?.email === "string" ? address.email.trim().toLowerCase() : "";
    const name = typeof address?.recipientName === "string" ? address.recipientName.trim() : "";
    const phone = typeof address?.phone === "string" ? address.phone.replace(/\D/g, "") : "";
    const line1 = typeof address?.line1 === "string" ? address.line1.trim() : "";
    const city = typeof address?.city === "string" ? address.city.trim() : "";
    const state = typeof address?.state === "string" ? address.state.trim() : "";
    const postalCode = typeof address?.postalCode === "string" ? address.postalCode.trim() : "";

    if (!items.length) return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    if (!/^[A-Za-z][A-Za-z .'-]{2,}$/.test(name)) return NextResponse.json({ error: "A valid full name is required" }, { status: 400 });
    if (!/^\d{10}$/.test(phone)) return NextResponse.json({ error: "A valid 10 digit mobile number is required" }, { status: 400 });
    if (line1.length < 4 || city.length < 2 || state.length < 2) return NextResponse.json({ error: "A complete delivery address is required" }, { status: 400 });
    if (!/^\d{6}$/.test(postalCode)) return NextResponse.json({ error: "A valid 6 digit PIN code is required" }, { status: 400 });

    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!adminKey) return NextResponse.json({ error: "Checkout is not configured yet" }, { status: 503 });
    if (paymentMethod === "razorpay" && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)) {
      return NextResponse.json({ error: "Online payment is not configured yet. Please choose Cash on Delivery." }, { status: 503 });
    }

    const supabase = await createClient();
    const variantIds = items.map((i: any) => i.variantId).filter(Boolean);
    if (variantIds.length !== items.length || new Set(variantIds).size !== variantIds.length) return NextResponse.json({ error: "Invalid cart items" }, { status: 400 });
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

    service = (await import("@supabase/supabase-js")).createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey, { auth: { persistSession: false } });
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
    const shippingAddress = { email, recipientName: name, phone, line1, line2: typeof address?.line2 === "string" ? address.line2.trim() : "", city, state, postalCode, country: "IN" };
    const { data: order, error: orderError } = await service.from("orders").insert({ order_number: number, user_id: user?.id ?? null, subtotal, discount_total: discount, grand_total: grandTotal, shipping_address: shippingAddress, notes: [couponCode ? `Coupon: ${couponCode}` : "", paymentMethod === "cod" ? "Payment: Cash on Delivery" : ""].filter(Boolean).join(" | ") || null }).select("id,order_number,grand_total").single();
    if (orderError) throw orderError;
    createdOrderId = order.id;

    const { error: itemError } = await service.from("order_items").insert(orderItems.map(i => ({ ...i, order_id: order.id })));
    if (itemError) throw itemError;

    if (paymentMethod === "cod") {
      const { error: inventoryError } = await service.rpc("deduct_order_inventory", { p_order_id: order.id });
      if (inventoryError) throw inventoryError;
      const { error: paymentError } = await service.from("payments").insert({ order_id: order.id, provider: "cod", status: "pending", amount: grandTotal, currency: "INR", raw_response: { method: "cash_on_delivery" } });
      if (paymentError) throw paymentError;
      if (couponCode) {
        const { error: couponUsageError } = await service.rpc("increment_coupon_usage", { p_code: couponCode });
        if (couponUsageError) throw couponUsageError;
      }
      return NextResponse.json({ orderId: order.id, orderNumber: number, paymentMethod: "cod", subtotal, discount, total: grandTotal });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID!;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET!;
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
    if (couponCode) {
      const { error: couponUsageError } = await service.rpc("increment_coupon_usage", { p_code: couponCode });
      if (couponUsageError) throw couponUsageError;
    }
    return NextResponse.json({ orderId: order.id, orderNumber: number, razorpayOrderId: razorOrder.id, keyId: razorpayKeyId, amount: Math.round(grandTotal * 100), currency: "INR", subtotal, discount, total: grandTotal });
  } catch (error) {
    if (service && createdOrderId) await service.from("orders").update({ status: "cancelled" }).eq("id", createdOrderId).in("status", ["pending", "confirmed"]);
    console.error("GJC checkout create", error);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
