import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { serverSupabase } from "@/lib/supabase/server";
import { aiDraftSchema, AI_INSTRUCTIONS, aiError, imageMime } from "@/lib/ai";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });
export async function POST(request: NextRequest) {
  // Cookie-authenticated POSTs must originate from our own site.
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return json("Invalid request origin.", 403);
  const db = await serverSupabase();
  if (!db)
    return json(
      "AI requires a connected Supabase account. You can create a manual draft below.",
      503,
    );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return json("Sign in to analyse photos. Your draft will stay here.", 401);
  if (!process.env.OPENAI_API_KEY)
    return json(
      "AI isn’t configured yet. Your photo is saved in this form — finish manually.",
      503,
    );
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4_000_000)
    return json("Please choose an image under 3 MB after compression.", 413);
  // Read with a hard ceiling even when content-length is absent/untrusted.
  let total = 0;
  const chunks: Uint8Array[] = [];
  const reader = request.body?.getReader();
  if (!reader) return json("Please attach a photograph.", 400);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 4_000_000) {
      await reader.cancel();
      return json("Image request is too large.", 413);
    }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    return json("Invalid photo upload.", 400);
  }
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0 || file.size > 3_000_000)
    return json("Choose a JPEG, PNG or WebP photo under 3 MB.", 400);
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = imageMime(bytes);
  if (!mime || mime !== file.type)
    return json(
      "Unsupported image. Use JPEG, PNG or WebP; convert HEIC using your device first.",
      415,
    );
  const { data: allowed, error: quotaError } = await db.rpc("consume_ai_quota");
  if (quotaError)
    return json(
      "Photo analysis is unavailable. Check database setup or continue manually.",
      503,
    );
  if (!allowed)
    return json(
      "You’ve reached 8 photo analyses this hour. You can still publish manually.",
      429,
    );
  try {
    const api = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 45000,
      maxRetries: 0,
    });
    const response = await api.responses.parse({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      store: false,
      max_output_tokens: 1200,
      instructions: AI_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Draft a useful listing for the main object or food in this photograph.",
            },
            {
              type: "input_image",
              image_url: `data:${mime};base64,${bytes.toString("base64")}`,
              detail: "auto",
            },
          ],
        },
      ],
      text: { format: zodTextFormat(aiDraftSchema, "listing_draft") },
    });
    if (!response.output_parsed)
      return json(
        "AI couldn’t make a reliable draft from this photo. Try a clearer picture or finish manually.",
        422,
      );
    const parsed = aiDraftSchema.safeParse(response.output_parsed);
    if (!parsed.success)
      return json(
        "AI returned an incomplete draft. Please finish manually or retry.",
        422,
      );
    return NextResponse.json(
      { draft: parsed.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Do not log provider payloads: they can include image data or credentials.
    const result = aiError(
      error instanceof OpenAI.APIError ? error.status : undefined,
    );
    return json(result.message, result.status);
  }
}
