import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("country_heroes")
    .select("mime_type, image_base64")
    .eq("country", "Francie")
    .maybeSingle();

  if (error || !data?.image_base64) {
    return new Response(null, { status: 404 });
  }

  const image = Buffer.from(data.image_base64, "base64");

  return new Response(image, {
    headers: {
      "Content-Type": data.mime_type || "image/avif",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
