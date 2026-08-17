import { NextResponse } from "next/server";

export async function GET() {
  try {
    const service = (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await service
      .from("store_settings")
      .select("shipping_charge,free_shipping_threshold")
      .eq("id", true)
      .single();
    if (error) throw error;
    return NextResponse.json({
      shippingCharge: Number(data.shipping_charge),
      freeShippingThreshold: Number(data.free_shipping_threshold),
    });
  } catch (error) {
    console.error("GJC shipping settings", error);
    return NextResponse.json({ shippingCharge: 69, freeShippingThreshold: 499 });
  }
}
