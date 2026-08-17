import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { supabase, error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  return { supabase, error: null };
}

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { data, error: settingsError } = await supabase
    .from("store_settings")
    .select("shipping_charge,free_shipping_threshold")
    .eq("id", true)
    .single();
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });
  return NextResponse.json({ shippingCharge: Number(data.shipping_charge), freeShippingThreshold: Number(data.free_shipping_threshold) });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await request.json();
    const shippingCharge = Number(body?.shippingCharge);
    if (!Number.isFinite(shippingCharge) || shippingCharge < 0 || shippingCharge > 100000) {
      return NextResponse.json({ error: "Shipping charge must be a valid non-negative amount." }, { status: 400 });
    }
    const { data, error: settingsError } = await supabase
      .from("store_settings")
      .update({ shipping_charge: Math.round(shippingCharge * 100) / 100, updated_at: new Date().toISOString() })
      .eq("id", true)
      .select("shipping_charge,free_shipping_threshold")
      .single();
    if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });
    return NextResponse.json({ ok: true, shippingCharge: Number(data.shipping_charge), freeShippingThreshold: Number(data.free_shipping_threshold) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save shipping settings" }, { status: 500 });
  }
}
