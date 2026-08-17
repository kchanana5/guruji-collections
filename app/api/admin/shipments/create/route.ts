import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assignExistingShiprocketAwb, createShiprocketShipment } from "@/lib/shiprocket";

function shiprocketMessage(raw: any) {
  return raw?.awb?.response?.data?.awb_assign_error
    || raw?.awb?.response?.data?.message
    || raw?.awb?.message
    || raw?.message
    || "Shiprocket created the shipment but has not assigned an AWB yet.";
}

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const service = (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: order, error } = await service
      .from("orders")
      .select("id,order_number,status,subtotal,discount_total,shipping_address,created_at,order_items(sku,product_name,quantity,unit_price,variant_id),payments(provider,status,provider_payment_id,amount)")
      .eq("id", orderId)
      .single();
    if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!["confirmed", "processing"].includes(order.status)) {
      return NextResponse.json({ error: "Only confirmed or processing orders can be shipped" }, { status: 409 });
    }

    const { data: existing } = await service.from("shipments").select("*").eq("order_id", orderId).maybeSingle();
    if (existing?.awb_code) return NextResponse.json({ shipment: existing, alreadyExists: true });

    // If Shiprocket already created the shipment but AWB assignment failed,
    // retry AWB assignment on the existing Shiprocket shipment instead of creating a duplicate order.
    if (existing?.provider === "shiprocket" && existing?.external_shipment_id) {
      const awbResult = await assignExistingShiprocketAwb(Number(existing.external_shipment_id));
      if (awbResult.awbCode) {
        const { data: shipment, error: shipmentError } = await service.from("shipments").update({
          awb_code: awbResult.awbCode,
          courier_name: awbResult.courierName,
          tracking_url: `https://shiprocket.co/tracking/${encodeURIComponent(awbResult.awbCode)}`,
          status: "AWB_ASSIGNED",
          raw_response: awbResult.raw,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id).select().single();
        if (shipmentError) throw shipmentError;
        await service.from("orders").update({ status: "shipped", updated_at: new Date().toISOString() }).eq("id", order.id);
        return NextResponse.json({ shipment, awbAssigned: true });
      }

      await service.from("shipments").update({
        status: "AWB_PENDING",
        raw_response: awbResult.raw,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
      return NextResponse.json({
        error: shiprocketMessage({ awb: awbResult.raw }),
        shipment: { ...existing, status: "AWB_PENDING" },
        awbPending: true,
      }, { status: 409 });
    }

    const address = order.shipping_address as any;
    const cod = (order.payments || []).some((p: any) => p.provider === "cod");
    const result = await createShiprocketShipment({
      orderId: order.order_number,
      orderDate: new Date(order.created_at).toISOString().slice(0, 10),
      pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION?.trim() || undefined,
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
      totalDiscount: Number(order.discount_total || 0),
      paymentMethod: cod ? "COD" : "Prepaid",
      weightKg: Number(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG || 0.5),
      lengthCm: Number(process.env.SHIPROCKET_DEFAULT_LENGTH_CM || 20),
      breadthCm: Number(process.env.SHIPROCKET_DEFAULT_BREADTH_CM || 15),
      heightCm: Number(process.env.SHIPROCKET_DEFAULT_HEIGHT_CM || 10),
    });

    const awbAssigned = Boolean(result.awbCode);
    const { data: shipment, error: shipmentError } = await service.from("shipments").upsert({
      order_id: order.id,
      provider: "shiprocket",
      external_shipment_id: String(result.shipmentId),
      awb_code: result.awbCode,
      courier_name: result.courierName,
      tracking_url: result.awbCode ? `https://shiprocket.co/tracking/${encodeURIComponent(result.awbCode)}` : null,
      status: awbAssigned ? "AWB_ASSIGNED" : "AWB_PENDING",
      raw_response: result.raw,
      updated_at: new Date().toISOString(),
    }, { onConflict: "order_id" }).select().single();
    if (shipmentError) throw shipmentError;

    if (!awbAssigned) {
      return NextResponse.json({
        error: shiprocketMessage(result.raw),
        shipment,
        awbPending: true,
      }, { status: 409 });
    }

    await service.from("orders").update({ status: "shipped", updated_at: new Date().toISOString() }).eq("id", order.id);
    return NextResponse.json({ shipment, awbAssigned: true });
  } catch (error) {
    console.error("GJC Shiprocket create", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create shipment" }, { status: 502 });
  }
}
