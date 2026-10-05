"use client";
import { getNavigationNews as acknowledgeNews } from "./actions";
import type { NavigationNews, NewsSection } from "@/lib/navigation-news";

export async function getNavigationNews(section: NewsSection | null = null, seenThrough: string | null = null): Promise<NavigationNews | null> {
  if (section) return acknowledgeNews(section, seenThrough);
  const response = await fetch("/api/navigation-news", { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (response.status === 401 || response.redirected) return null;
  if (!response.ok) throw new Error("Novinky se nepodařilo načíst.");
  return response.json();
}
