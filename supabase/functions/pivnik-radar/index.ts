import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminId = "17be5dc3-a3f9-4fd2-ae90-dee7692034fc";
const publicClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const agent = "PivnikRadar/0.1 (catalogue-change-monitor; low-frequency)";
const MAX_BYTES = 1_000_000;
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
type Source = { id: number; brewery_id: number; url: string; extraction_mode: "change_only" | "headings" | "woocommerce" | "news"; last_hash: string | null; failure_count: number };
const robotsCache = new Map<string, string | null>();

function cleanHtml(s: string): string {
  return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|thinsp);/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'").replace(/&deg;/gi, "°")
    .replace(/&#(\d+);/g, (_, x) => String.fromCodePoint(Number(x)))
    .replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x, 16)))
    .replace(/\s+/g, " ").trim();
}
function canonical(s: string) {
  return s.replace(/\s*[–—-]\s*(?:KEG\s*)?\d+(?:[,.]\d+)?\s*(?:l|litru|litry|ml)\b.*$/iu, "")
    .replace(/\s+\d+(?:[,.]\d+)?\s*(?:l|ml)\b\s*$/iu, "")
    .replace(/\s*\([^)]*(?:ocenění|award|20\d\d)[^)]*\)/giu, "")
    .replace(/\s+0[,.][2345]\s*$/iu, "") // glass portion, not a beer variant
    .replace(/\s+/g, " ").trim();
}
function norm(s: string) {
  return canonical(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("cs")
    .replace(/[°º]/g, " stupnu ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
function isBeer(s: string, mode: Source["extraction_mode"]) {
  if (s.length < 4 || s.length > 150 || /^[^\p{L}\p{N}]*(?:Nealko|Piva|Pivo)\s*$/iu.test(s)) return false;
  if (/dárkov|poukaz|merch|set\b|sklenic|tričko|čepic|vratná|kauce|výčep|košík|cena|kontakt|festival|hodnocení|čtěte více|novinky|menu|naše piva|otevírací/i.test(s)) return false;
  if (mode === "news") return /novinka na čepu:\s*.+/i.test(s);
  return /(?:\d{1,2}(?:[,.]\d+)?\s*°|\b(?:IPA|NEIPA|ALE|STOUT|PORTER|LEŽÁK|LAGER|PILS|SOUR|NEALKO|MUFLON|ŠTUDÁK|KRAVAŤÁK|ŠTRAMÁK|KYSELÁK|R\.I\.P\.A\.K)\b)/iu.test(s);
}
function namesFrom(html: string, mode: Source["extraction_mode"]) {
  if (mode === "change_only") return [];
  const headings = [...html.matchAll(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/gi)].map(x => cleanHtml(x[1]));
  const results: string[] = [];
  for (const raw of headings) {
    if (!isBeer(raw, mode)) continue;
    const value = canonical(mode === "news" ? raw.replace(/^.*?novinka na čepu:\s*/i, "") : raw);
    if (value.length >= 4 && value.length <= 150 && !results.some(x => norm(x) === norm(value))) results.push(value);
    if (results.length >= 20) break;
  }
  return results;
}
function target(source: string): URL {
  const u = new URL(source);
  if (u.protocol !== "https:" || u.username || u.password || u.port || !/^[a-z0-9.-]+$/i.test(u.hostname) ||
    u.hostname === "localhost" || /^\d+(?:\.\d+){3}$/.test(u.hostname) ||
    u.hostname.endsWith(".local") || u.hostname.endsWith(".internal")) throw new Error("Unsafe source URL");
  return u;
}
async function robotsAllowed(u: URL) {
  const origin = u.origin;
  if (!robotsCache.has(origin)) {
    try {
      const r = await fetch(origin + "/robots.txt", { signal: AbortSignal.timeout(7000), headers: { "User-Agent": agent } });
      if (r.status === 404 || r.status === 410) robotsCache.set(origin, "");
      else if (!r.ok) robotsCache.set(origin, null);
      else {
        const t = await r.text();
        robotsCache.set(origin, t.slice(0, 200000));
      }
    } catch { robotsCache.set(origin, null); }
  }
  const file = robotsCache.get(origin);
  if (file === null || file === undefined) return false; // fail closed
  let applies = false;
  const rules: { kind: "allow" | "disallow"; path: string }[] = [];
  for (const raw of file.split(/\r?\n/)) {
    const m = raw.replace(/#.*$/, "").trim().match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), value = m[2].trim();
    if (key === "user-agent") { applies = value === "*" || value.toLowerCase().includes("pivnikradar"); continue; }
    if (applies && (key === "allow" || key === "disallow") && value) rules.push({ kind: key, path: value });
  }
  let best = { size: -1, allowed: true };
  for (const r of rules) {
    const path = r.path.replace(/\*.*$/, "").replace(/\$$/, "");
    if (u.pathname.startsWith(path) && (path.length > best.size || (path.length === best.size && r.kind === "allow"))) best = { size: path.length, allowed: r.kind === "allow" };
  }
  return best.allowed;
}
async function fetchBounded(u: URL) {
  let current = u;
  for (let i = 0; i < 3; i++) {
    const res = await fetch(current.href, { redirect: "manual", signal: AbortSignal.timeout(12000), headers: { "User-Agent": agent, Accept: "text/html" } });
    if ([301,302,303,307,308].includes(res.status)) {
      const loc = res.headers.get("location"); if (!loc) throw new Error("Redirect without location");
      const next = target(new URL(loc, current).href);
      if (next.origin !== u.origin || !(await robotsAllowed(next))) throw new Error("Redirect not allowed");
      current = next; continue;
    }
    if (!res.ok) throw new Error("HTTP " + res.status);
    if (!(res.headers.get("content-type") ?? "").includes("text/html")) throw new Error("Source is not HTML");
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("Source too large");
    const reader = res.body?.getReader(); if (!reader) throw new Error("Empty response");
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength; if (total > MAX_BYTES) { await reader.cancel(); throw new Error("Source exceeds 1 MB"); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total); let n = 0; for (const c of chunks) { bytes.set(c,n); n += c.length; }
    return { html: new TextDecoder().decode(bytes), status: res.status };
  }
  throw new Error("Too many redirects");
}
async function hash(text: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes)).map(x => x.toString(16).padStart(2,"0")).join("");
}
async function authorize(req: Request) {
  const token = req.headers.get("x-radar-cron-token");
  if (token) {
    const { data, error } = await publicClient.rpc("radar_authorize_cron", { p_token: token });
    return !error && data === true ? "cron" : null;
  }
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) return null;
  const { data, error } = await publicClient.auth.getUser(bearer);
  return !error && data.user?.id === adminId ? "admin" : null;
}
Deno.serve(async req => {
  if (req.method !== "POST") return reply({ error: "POST required" },405);
  const kind = await authorize(req);
  if (!kind) return reply({ error: "Forbidden" },403);
  const { data: claimed, error: claimError } = await db.rpc("radar_claim_sources", { p_limit: 2 });
  if (claimError) return reply({ error: "Claim failed" },500);
  const sources = (claimed ?? []) as Source[];
  const { data: run, error: runError } = await db.from("radar_runs").insert({ trigger_kind: kind }).select("id").single();
  if (runError || !run) return reply({ error: "Run log failed" },500);
  const stats = { sources_checked: 0, sources_changed: 0, sources_failed: 0, candidates_created: 0 };
  const failures: string[] = [];
  for (const source of sources) {
    try {
      const u = target(source.url);
      if (!(await robotsAllowed(u))) throw new Error("robots.txt unavailable or disallows crawling");
      const { html, status } = await fetchBounded(u);
      const fingerprint = await hash(cleanHtml(html));
      const changed = source.last_hash !== fingerprint;
      if (changed) stats.sources_changed++;
      if (changed && source.extraction_mode !== "change_only") {
        const proposed = namesFrom(html, source.extraction_mode);
        const { data: catalog, error: cError } = await db.rpc("radar_catalog_names", { p_brewery_id: source.brewery_id });
        if (cError) throw new Error("Catalog lookup failed");
        const known = (catalog ?? []) as { beer_id: number; beer_name: string }[];
        for (const name of proposed) {
          const normalized_name = norm(name);
          if (normalized_name.length < 2) continue;
          const { data: existing, error: eError } = await db.from("radar_candidates").select("id").eq("brewery_id",source.brewery_id).eq("normalized_name",normalized_name).maybeSingle();
          if (eError) throw new Error("Candidate lookup failed");
          if (existing) { await db.from("radar_candidates").update({last_seen_at:new Date().toISOString()}).eq("id",existing.id); continue; }
          const similar = known.find(b => norm(b.beer_name) === normalized_name)
            ?? known.find(b => norm(b.beer_name).includes(normalized_name) || normalized_name.includes(norm(b.beer_name)))
            ?? (normalized_name.startsWith("nealko") ? known.find(b => norm(b.beer_name).startsWith("nealko")) : undefined);
          const { error } = await db.from("radar_candidates").insert({
            brewery_id: source.brewery_id, source_id: source.id, source_url:source.url,
            name, normalized_name, status: similar ? "possible_match" : "new",
            matched_beer_id: similar?.beer_id ?? null
          });
          if (!error) stats.candidates_created++;
          else if (error.code !== "23505") throw new Error("Candidate save failed");
        }
      }
      const { data: rb } = await db.from("radar_breweries").select("priority").eq("brewery_id",source.brewery_id).single();
      const hours = rb?.priority === "A" ? 24 : rb?.priority === "B" ? 84 : rb?.priority === "C" ? 168 : 720;
      const { error: saveError } = await db.from("radar_sources").update({
        last_hash:fingerprint,last_http_status:status,last_error:null,failure_count:0,last_checked_at:new Date().toISOString(),
        next_check_at:new Date(Date.now()+hours*3600000).toISOString()
      }).eq("id",source.id);
      if (saveError) throw new Error("Source result save failed");
      stats.sources_checked++;
    } catch (err) {
      stats.sources_failed++;
      const message = err instanceof Error ? err.message : "Unknown scan error";
      failures.push("#"+source.id+": "+message.slice(0,120));
      const retryHours = Math.min(24, Math.pow(2, Math.min(source.failure_count,4)));
      await db.from("radar_sources").update({last_checked_at:new Date().toISOString(),last_error:message.slice(0,200),failure_count:source.failure_count+1,
        next_check_at:new Date(Date.now()+retryHours*3600000).toISOString()}).eq("id",source.id);
    }
  }
  const result = stats.sources_failed ? (stats.sources_checked ? "partial" : "failed") : "completed";
  await db.from("radar_runs").update({ ...stats, result, finished_at:new Date().toISOString(), error_summary:failures.join("; ").slice(0,500)||null }).eq("id",run.id);
  return reply({ok:true,run_id:run.id,result,...stats});
});
