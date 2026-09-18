"use server";

import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const CATALOG_ADMIN_USER_ID =
  "17be5dc3-a3f9-4fd2-ae90-dee7692034fc";

const LOGO_BUCKET = "brewery-logos";
const LOGO_OBJECT_NAME = "logo";
const MAX_HTML_BYTES = 1_000_000;
const MAX_IMAGE_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 4;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

export type BreweryLogoCandidate = {
  url: string;
  source: "logo" | "brand" | "social" | "icon";
  label: string;
  score: number;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Uživatel není přihlášen.");
  }

  if (user.id !== CATALOG_ADMIN_USER_ID) {
    throw new Error("Logo pivovaru může měnit pouze administrátor.");
  }

  return { supabase, user };
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  ) {
    return true;
  }

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1]) : false;
}

function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

async function assertSafeExternalUrl(input: string | URL) {
  const url = input instanceof URL ? input : new URL(input);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Logo musí být dostupné přes HTTP nebo HTTPS.");
  }

  if (url.username || url.password) {
    throw new Error("URL s přihlašovacími údaji není povolena.");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Interní adresa není povolena.");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Privátní IP adresa není povolena.");
    }
    return url;
  }

  const resolved = await lookup(hostname, {
    all: true,
    verbatim: true,
  });

  if (
    resolved.length === 0 ||
    resolved.some((entry) => isPrivateAddress(entry.address))
  ) {
    throw new Error("Doména směřuje na nepovolenou síťovou adresu.");
  }

  return url;
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Pivovar nemá uložený web.");
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return new URL(withProtocol);
}

async function fetchWithTimeout(
  url: URL,
  init: RequestInit = {}
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    return await fetch(url, {
      ...init,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "TasteApp BreweryLogoBot/1.0 (+logo discovery for brewery catalogue)",
        Accept: "*/*",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function safeFetch(
  input: string | URL,
  init: RequestInit = {}
) {
  let current =
    input instanceof URL
      ? new URL(input)
      : new URL(input);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertSafeExternalUrl(current);

    const response = await fetchWithTimeout(current, init);

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get("location")
    ) {
      if (redirectCount === MAX_REDIRECTS) {
        throw new Error("Web má příliš mnoho přesměrování.");
      }

      current = new URL(
        response.headers.get("location")!,
        current
      );
      continue;
    }

    return {
      response,
      finalUrl: current,
    };
  }

  throw new Error("Web se nepodařilo načíst.");
}

function readAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  const pattern =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+))/g;

  for (const match of tag.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] =
      match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attributes;
}

function candidateUrl(
  rawValue: string | undefined,
  baseUrl: URL
) {
  if (!rawValue) return null;

  const raw = rawValue
    .split(",")[0]
    .trim()
    .split(/\s+/)[0];

  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return null;
  }

  try {
    const url = new URL(raw, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function scoreImageCandidate(
  url: URL,
  attributes: Record<string, string>,
  baseUrl: URL
) {
  const haystack = [
    url.pathname,
    attributes.alt,
    attributes.class,
    attributes.id,
    attributes.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  let source: BreweryLogoCandidate["source"] = "brand";

  if (haystack.includes("logo")) {
    score += 95;
    source = "logo";
  }

  if (
    haystack.includes("brand") ||
    haystack.includes("identity") ||
    haystack.includes("navbar") ||
    haystack.includes("header")
  ) {
    score += 35;
  }

  if (
    haystack.includes("footer") ||
    haystack.includes("social") ||
    haystack.includes("avatar") ||
    haystack.includes("product") ||
    haystack.includes("beer")
  ) {
    score -= 25;
  }

  if (/\.(svg)(?:$|\?)/i.test(url.href)) score += 28;
  if (/\.(png|webp)(?:$|\?)/i.test(url.href)) score += 16;
  if (/\.(jpe?g|gif)(?:$|\?)/i.test(url.href)) score += 4;

  if (url.hostname === baseUrl.hostname) score += 12;

  const width = Number.parseInt(attributes.width ?? "", 10);
  const height = Number.parseInt(attributes.height ?? "", 10);

  if (
    (Number.isFinite(width) && width > 0 && width <= 64) ||
    (Number.isFinite(height) && height > 0 && height <= 64)
  ) {
    score -= 28;
  }

  return { score, source };
}

function discoverLogoCandidates(
  html: string,
  pageUrl: URL
) {
  const candidates = new Map<
    string,
    BreweryLogoCandidate
  >();

  function addCandidate(
    url: URL | null,
    score: number,
    source: BreweryLogoCandidate["source"],
    label: string
  ) {
    if (!url || score < 1) return;

    const key = url.href;
    const existing = candidates.get(key);

    if (!existing || existing.score < score) {
      candidates.set(key, {
        url: key,
        score,
        source,
        label,
      });
    }
  }

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const attributes = readAttributes(tag);
    const url = candidateUrl(
      attributes.src ||
        attributes["data-src"] ||
        attributes["data-lazy-src"] ||
        attributes.srcset,
      pageUrl
    );

    if (!url) continue;

    const ranked = scoreImageCandidate(
      url,
      attributes,
      pageUrl
    );

    addCandidate(
      url,
      ranked.score,
      ranked.source,
      ranked.source === "logo"
        ? "Logo z webu"
        : "Obrázek značky"
    );
  }

  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attributes = readAttributes(tag);
    const rel = (attributes.rel ?? "").toLowerCase();

    if (
      !rel.includes("icon") &&
      !rel.includes("apple-touch-icon")
    ) {
      continue;
    }

    const url = candidateUrl(attributes.href, pageUrl);
    const score = rel.includes("apple-touch-icon")
      ? 22
      : 14;

    addCandidate(
      url,
      score,
      "icon",
      rel.includes("apple-touch-icon")
        ? "Ikona webu"
        : "Favicon"
    );
  }

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = readAttributes(tag);
    const key = (
      attributes.property ||
      attributes.name ||
      ""
    ).toLowerCase();

    if (
      key !== "og:image" &&
      key !== "twitter:image" &&
      key !== "twitter:image:src"
    ) {
      continue;
    }

    const url = candidateUrl(
      attributes.content,
      pageUrl
    );

    if (!url) continue;

    const hasLogo =
      /logo/i.test(url.pathname);
    addCandidate(
      url,
      hasLogo ? 62 : 8,
      hasLogo ? "logo" : "social",
      hasLogo
        ? "Logo ze sociálního náhledu"
        : "Sociální náhled webu"
    );
  }

  return Array.from(candidates.values())
    .sort((a, b) =>
      b.score !== a.score
        ? b.score - a.score
        : a.url.localeCompare(b.url)
    )
    .slice(0, 5);
}

async function loadBreweryForLogo(
  breweryId: number
) {
  const { supabase } = await requireAdmin();

  if (!Number.isInteger(breweryId) || breweryId < 1) {
    throw new Error("Neplatné ID pivovaru.");
  }

  const { data: brewery, error } =
    await supabase
      .from("breweries")
      .select("id, name, website, logo_url")
      .eq("id", breweryId)
      .single();

  if (error || !brewery) {
    throw new Error(
      error?.message ||
        "Pivovar nebyl nalezen."
    );
  }

  return { supabase, brewery };
}

async function discoverForBrewery(
  breweryId: number
) {
  const { brewery } =
    await loadBreweryForLogo(breweryId);

  const websiteUrl =
    normalizeWebsiteUrl(
      brewery.website ?? ""
    );

  const { response, finalUrl } =
    await safeFetch(websiteUrl, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
    });

  if (!response.ok) {
    throw new Error(
      `Web pivovaru vrátil chybu ${response.status}.`
    );
  }

  const contentType =
    response.headers
      .get("content-type")
      ?.toLowerCase() ?? "";

  if (
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml+xml")
  ) {
    throw new Error(
      "Web pivovaru nevrátil HTML stránku."
    );
  }

  const contentLength = Number(
    response.headers.get("content-length") ?? "0"
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_HTML_BYTES
  ) {
    throw new Error(
      "Úvodní stránka webu je příliš velká pro automatické hledání loga."
    );
  }

  const html = await response.text();

  if (
    Buffer.byteLength(html, "utf8") >
    MAX_HTML_BYTES
  ) {
    throw new Error(
      "Úvodní stránka webu je příliš velká pro automatické hledání loga."
    );
  }

  return {
    brewery,
    candidates:
      discoverLogoCandidates(
        html,
        finalUrl
      ),
  };
}

export async function findBreweryLogoCandidates(
  breweryId: number
): Promise<BreweryLogoCandidate[]> {
  const { candidates } =
    await discoverForBrewery(breweryId);

  if (candidates.length === 0) {
    throw new Error(
      "Na webu se nepodařilo najít rozumného kandidáta na logo."
    );
  }

  return candidates;
}

function getImageContentType(
  response: Response
) {
  return (
    response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase() ?? ""
  );
}

export async function saveBreweryLogoCandidate(
  breweryId: number,
  candidateUrl: string
) {
  const {
    supabase,
    brewery,
    candidates,
  } = await (async () => {
    const discovered =
      await discoverForBrewery(breweryId);
    const admin =
      await requireAdmin();
    return {
      supabase: admin.supabase,
      brewery: discovered.brewery,
      candidates: discovered.candidates,
    };
  })();

  const approvedCandidate =
    candidates.find(
      (candidate) =>
        candidate.url === candidateUrl
    );

  if (!approvedCandidate) {
    throw new Error(
      "Vybraný obrázek už není mezi kandidáty nalezenými na webu."
    );
  }

  const { response } =
    await safeFetch(
      approvedCandidate.url,
      {
        headers: {
          Accept:
            "image/avif,image/webp,image/svg+xml,image/png,image/jpeg,image/gif,*/*;q=0.2",
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `Logo se nepodařilo stáhnout (HTTP ${response.status}).`
    );
  }

  const contentType =
    getImageContentType(response);

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(
      "Nalezený soubor není podporovaný obrázek."
    );
  }

  const contentLength = Number(
    response.headers.get("content-length") ?? "0"
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_IMAGE_BYTES
  ) {
    throw new Error(
      "Logo je větší než povolené 2 MB."
    );
  }

  const bytes =
    await response.arrayBuffer();

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(
      "Logo je větší než povolené 2 MB."
    );
  }

  const objectPath =
    `${breweryId}/${LOGO_OBJECT_NAME}`;

  const { error: uploadError } =
    await supabase.storage
      .from(LOGO_BUCKET)
      .upload(
        objectPath,
        bytes,
        {
          contentType,
          cacheControl: "86400",
          upsert: true,
        }
      );

  if (uploadError) {
    throw new Error(
      uploadError.message
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from(LOGO_BUCKET)
    .getPublicUrl(objectPath);

  const logoUrl =
    `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } =
    await supabase
      .from("breweries")
      .update({
        logo_url: logoUrl,
      })
      .eq("id", breweryId);

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  revalidateLogoSurfaces(
    breweryId
  );

  return {
    logoUrl,
    breweryName: brewery.name,
  };
}

export async function removeBreweryLogo(
  breweryId: number
) {
  const { supabase } =
    await loadBreweryForLogo(
      breweryId
    );

  const objectPath =
    `${breweryId}/${LOGO_OBJECT_NAME}`;

  const { error: storageError } =
    await supabase.storage
      .from(LOGO_BUCKET)
      .remove([objectPath]);

  if (storageError) {
    throw new Error(
      storageError.message
    );
  }

  const { error: updateError } =
    await supabase
      .from("breweries")
      .update({ logo_url: null })
      .eq("id", breweryId);

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  revalidateLogoSurfaces(
    breweryId
  );

  return { success: true };
}

function revalidateLogoSurfaces(
  breweryId: number
) {
  revalidatePath(
    `/breweries/${breweryId}`
  );
  revalidatePath("/breweries");
  revalidatePath("/stats");
  revalidatePath("/timeline");
  revalidatePath("/");
}
