import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OpenAI is not configured on this environment." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image : "";
  const price = Number(body?.price);
  const brand = typeof body?.brand === "string" && body.brand.trim() ? body.brand.trim() : "GJC";

  if (!image.startsWith("data:image/") || image.length > 8_000_000) {
    return NextResponse.json({ error: "Please provide a valid image under 6 MB." }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Please provide a valid INR price." }, { status: 400 });
  }

  const prompt = `You are the catalog assistant for Guruji Collections (GJC), an Indian clothing store.
First classify the supplied image. It must clearly show a sellable fashion/clothing product such as a shirt, t-shirt, top, dress, saree, kurta, jeans, trousers, jacket, coat, ethnic wear, footwear, handbag, or another clearly identifiable fashion item.
If it is not a fashion product, return ONLY valid JSON in this exact shape: {"is_fashion_product":false,"rejection_reason":"This image does not appear to show a clothing or fashion product. Please upload a clear product photo."}.
If it is a fashion product, return ONLY valid JSON with these keys: is_fashion_product, name, short_description, description, category, tags, seo_title, seo_description, suggested_sizes, suggested_colors, material, fit, care_instructions. Set is_fashion_product to true. Do not invent exact fabric composition if it cannot be seen; use cautious wording. Price is INR ${price}. Brand is ${brand}. Make the copy premium, concise and suitable for an Indian fashion storefront.`;

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: [{ role: "user", content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: image, detail: "high" },
        ] }],
        max_output_tokens: 1200,
      }),
    });
  } catch (error) {
    console.error("OpenAI request could not be sent", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "GJC could not reach the AI provider. Please try again.", code: "AI_NETWORK_ERROR" }, { status: 502 });
  }

  if (!openaiResponse.ok) {
    const raw = await openaiResponse.text();
    let providerCode = "unknown";
    let providerType = "unknown";
    let providerMessage = "The AI provider rejected the request.";
    try {
      const parsed = JSON.parse(raw);
      providerCode = typeof parsed?.error?.code === "string" ? parsed.error.code : providerCode;
      providerType = typeof parsed?.error?.type === "string" ? parsed.error.type : providerType;
      providerMessage = typeof parsed?.error?.message === "string" ? parsed.error.message : providerMessage;
    } catch {
      // Keep the safe generic provider message if the response is not JSON.
    }
    console.error("OpenAI catalog generation failed", { status: openaiResponse.status, code: providerCode, type: providerType, message: providerMessage });
    return NextResponse.json({ error: `AI provider error (${openaiResponse.status}): ${providerMessage}`, code: providerCode, type: providerType }, { status: 502 });
  }

  const payload = await openaiResponse.json();
  const text = typeof payload.output_text === "string"
    ? payload.output_text
    : payload.output?.flatMap((item: any) => item.content || []).map((item: any) => item.text || "").join("\n") || "";

  const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const generated = JSON.parse(cleaned);
    if (generated?.is_fashion_product === false) {
      return NextResponse.json({ error: generated.rejection_reason || "This image does not appear to show a clothing or fashion product. Please upload a clear product photo.", code: "NOT_FASHION_PRODUCT" }, { status: 422 });
    }
    if (generated?.is_fashion_product !== true) {
      return NextResponse.json({ error: "AI could not confirm that this is a fashion product. Please upload a clearer clothing product photo.", code: "UNCERTAIN_PRODUCT" }, { status: 422 });
    }
    await supabase.from("ai_generation_jobs").insert({ user_id: user.id, input_data: { price, brand }, output_data: generated, status: "completed", completed_at: new Date().toISOString() });
    return NextResponse.json(generated);
  } catch {
    console.error("AI returned non-JSON catalog data", text.slice(0, 1000));
    return NextResponse.json({ error: "AI returned an unexpected response. Please try again.", code: "INVALID_AI_JSON" }, { status: 502 });
  }
}
