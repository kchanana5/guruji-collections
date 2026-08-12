import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const awb = new URL(request.url).searchParams.get("awb");
    if (!awb) return NextResponse.json({ error: "awb is required" }, { status: 400 });
    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;
    if (!email || !password) return NextResponse.json({ error: "Shipping is not configured" }, { status: 503 });
    const login = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), cache: "no-store" });
    if (!login.ok) return NextResponse.json({ error: "Shipping provider authentication failed" }, { status: 502 });
    const { token } = await login.json();
    const res = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${encodeURIComponent(awb)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: "Unable to retrieve tracking" }, { status: 502 });
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("GJC tracking", error);
    return NextResponse.json({ error: "Unable to retrieve tracking" }, { status: 500 });
  }
}
