import { unstable_cache } from "next/cache";
import { isStoredBreweryLogo } from "@/lib/logo-layout";
import { normalizeLogo } from "@/lib/normalize-logo";

export const runtime = "nodejs";
const MAX_BYTES = 2_000_000;
const pending = new Map<string, Promise<string>>();

const getNormalizedLogo = unstable_cache(async (src: string) => {
  const response = await fetch(src, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok || Number(response.headers.get("content-length")) > MAX_BYTES || !response.body) {
    throw new Error("Logo unavailable");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) throw new Error("Logo too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return (await normalizeLogo(Buffer.concat(chunks))).toString("base64");
}, ["brewery-logo-normalization-v1"], { revalidate: 86400 });

/** Serves only already-public logos, never private data or arbitrary URLs. */
export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src") ?? "";
  if (!isStoredBreweryLogo(src, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) {
    return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    let job = pending.get(src);
    if (!job) {
      job = getNormalizedLogo(src).finally(() => pending.delete(src));
      pending.set(src, job);
    }
    const bytes = Buffer.from(await job, "base64");
    return new Response(bytes, { headers: {
      "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    } });
  } catch {
    return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
