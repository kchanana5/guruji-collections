import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const body = await request.json();
    const orderId = typeof body?.orderId === "string" ? body.orderId : "";
    const courierName = typeof body?.courierName === "string" ? body.courierName.trim() : "";
    const awbCode = typeof body?.awbCode === "string" ? body.awbCode.trim() : "";
    const trackingUrl = typeof body?.trackingUrl === "string" ? body.trackingUrl.trim() : "";
    if (!orderId || !awbCode) return NextResponse.json({ error: "Order and AWB are required" }, { status: 400 });

    const { data: order } = await supabase.from("orders").select("id,status").eq("id", orderId).single();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const { error } = await supabase.from("shipments").upsert({
      order_id: orderId,
      provider: "manual",
      awb_code: awbCode,
      courier_name: courierName || "Courier",
      tracking_url: trackingUrl || null,
      status: "shipped",
      updated_at: new Date().toISOString(),
    }, { onConflict: "order_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (["confirmed", "processing"].includes(order.status)) {
      await supabase.from("orders").update({ status: "shipped" }).eq("id", orderId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save shipment" }, { status: 500 });
  }
}
