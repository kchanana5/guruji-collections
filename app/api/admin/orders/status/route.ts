import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const transitions: Record<string, string[]> = {
  pending: ["cancelled", "confirmed"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    const nextStatus = typeof body?.status === "string" ? body.status : "";
    if (!id || !Object.prototype.hasOwnProperty.call(transitions, nextStatus)) {
      return NextResponse.json({ error: "Invalid order or status" }, { status: 400 });
    }

    const { data: order, error: lookupError } = await supabase.from("orders").select("id,status").eq("id", id).single();
    if (lookupError || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!transitions[order.status]?.includes(nextStatus)) {
      return NextResponse.json({ error: `Cannot move order from ${order.status} to ${nextStatus}` }, { status: 409 });
    }

    const { error } = await supabase.from("orders").update({ status: nextStatus }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update order" }, { status: 500 });
  }
}
