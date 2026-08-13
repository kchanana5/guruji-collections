import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini is not configured on this environment." }, { status: 503 });

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

  // Avoid regex dotAll (/s) because the project's TypeScript target does not enable ES2018 regex flags.
  const commaIndex = image.indexOf(",");
  const header = commaIndex >= 0 ? image.slice(0, commaIndex) : "";
  const base64Data = commaIndex >= 0 ? image.slice(commaIndex + 1) : "";
  const mimeStart = "data:".length;
  const mimeEnd = header.indexOf(";base64");
  const mimeType = mimeEnd > mimeStart ? header.slice(mimeStart, mimeEnd) : "";

  if (!mimeType.startsWith("image/") || !base64Data) {
    return NextResponse.json({ error: "Invalid image data." }, { status: 400 });
  }

  const prompt = `You are the catalog assistant for Guruji Collections (GJC), an Indian clothing store.
First classify the supplied image. It must clearly show a sellable fashion/clothing product such as a shirt, t-shirt, top, dress, saree, kurta, jeans, trousers, jacket, coat, ethnic wear, footwear, handbag, or another clearly identifiable fashion item.
If it is not a fashion product, return JSON with is_fashion_product false and rejection_reason explaining that the user should upload a clear clothing or fashion product photo.
If it is a fashion product, return JSON with these keys: is_fashion_product, name, short_description, description, category, tags, seo_title, seo_description, suggested_sizes, suggested_colors, material, fit, care_instructions.
Set is_fashion_product to true. Do not invent exact fabric composition if it cannot be seen; use cautious wording. Price is INR ${price}. Brand is ${brand}. Make the copy premium, concise and suitable for an Indian fashion storefront.`;

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200,
            responseMimeType: "application/json",
          },
        }),
      },
    );
  } catch (error) {
    console.error("Gemini request could not be sent", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "GJC could not reach the AI provider. Please try again.", code: "AI_NETWORK_ERROR" }, { status: 502 });
  }

  if (!geminiResponse.ok) {
    const raw = await geminiResponse.text();
    let providerMessage = "The AI provider rejected the request.";
    try {
      const parsed = JSON.parse(raw);
      providerMessage = typeof parsed?.error?.message === "string" ? parsed.error.message : providerMessage;
    } catch {
      // Keep the safe generic provider message if the response is not JSON.
    }
    console.error("Gemini catalog generation failed", { status: geminiResponse.status, message: providerMessage });
    return NextResponse.json({ error: `AI provider error (${geminiResponse.status}): ${providerMessage}`, code: "GEMINI_PROVIDER_ERROR" }, { status: 502 });
  }

  const payload = await geminiResponse.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n") || "";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    const generated = JSON.parse(cleaned);
    if (generated?.is_fashion_product === false) {
      return NextResponse.json({
        error: generated.rejection_reason || "This image does not appear to show a clothing or fashion product. Please upload a clear product photo.",
        code: "NOT_FASHION_PRODUCT",
      }, { status: 422 });
    }
    if (generated?.is_fashion_product !== true) {
      return NextResponse.json({ error: "AI could not confirm that this is a fashion product. Please upload a clearer clothing product photo.", code: "UNCERTAIN_PRODUCT" }, { status: 422 });
    }

    const { error: jobError } = await supabase.from("ai_generation_jobs").insert({
      user_id: user.id,
      input_data: { price, brand },
      output_data: generated,
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    if (jobError) console.error("AI generation job could not be saved", jobError.message);

    return NextResponse.json(generated);
  } catch {
    console.error("Gemini returned non-JSON catalog data", text.slice(0, 1000));
    return NextResponse.json({ error: "AI returned an unexpected response. Please try again.", code: "INVALID_AI_JSON" }, { status: 502 });
  }
}
