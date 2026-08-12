import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createShiprocketShipment } from "@/lib/shiprocket";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const service = (await import("@supabase/supabase-js")).createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data: order, error } = await service.from("orders").select("id,order_number,status,subtotal,shipping_address,created_at,order_items(sku,product_name,quantity,unit_price,variant_id)").eq("id", orderId).single();
    if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "confirmed" && order.status !== "processing") return NextResponse.json({ error: "Only paid orders can be shipped" }, { status: 409 });
    const { data: existing } = await service.from("shipments").select("*").eq("order_id", orderId).maybeSingle();
    if (existing?.awb_code) return NextResponse.json({ shipment: existing, alreadyExists: true });

    const address = order.shipping_address as any;
    const result = await createShiprocketShipment({
      orderId: order.order_number,
      orderDate: new Date(order.created_at).toISOString().slice(0, 10),
      pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION || "Home",
      customerName: address.recipientName,
      phone: address.phone,
      email: address.email,
      address: address.line1,
      address2: address.line2,
      city: address.city,
      state: address.state,
      country: "India",
      pincode: address.postalCode,
      items: order.order_items.map((i: any) => ({ sku: i.sku || `GJC-${i.variant_id}`, name: i.product_name, units: i.quantity, sellingPrice: Number(i.unit_price) })),
      subtotal: Number(order.subtotal),
      weightKg: Number(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG || 0.5),
      lengthCm: Number(process.env.SHIPROCKET_DEFAULT_LENGTH_CM || 20),
      breadthCm: Number(process.env.SHIPROCKET_DEFAULT_BREADTH_CM || 15),
      heightCm: Number(process.env.SHIPROCKET_DEFAULT_HEIGHT_CM || 10),
    });

    const { data: shipment, error: shipmentError } = await service.from("shipments").upsert({
      order_id: order.id,
      provider: "shiprocket",
      external_shipment_id: String(result.shipmentId),
      awb_code: result.awbCode,
      courier_name: result.courierName,
      tracking_url: result.awbCode ? `https://shiprocket.co/tracking/${encodeURIComponent(result.awbCode)}` : null,
      status: "AWB_ASSIGNED",
      raw_response: result.raw,
    }, { onConflict: "order_id" }).select().single();
    if (shipmentError) throw shipmentError;
    await service.from("orders").update({ status: "shipped" }).eq("id", order.id);
    return NextResponse.json({ shipment });
  } catch (error) {
    console.error("GJC Shiprocket create", error);
    return NextResponse.json({ error: "Unable to create shipment" }, { status: 502 });
  }
}
