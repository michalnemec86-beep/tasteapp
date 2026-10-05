"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useMemo, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { breweryBrowseHref, getBreweryNeighbours, readBreweryBrowse, saveBreweryBrowse } from "@/lib/brewery-browse";

type BrowseContext = { ids: number[]; ownerId: string; label: string; returnHref?: string };
const Context = createContext<BrowseContext | null>(null);
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function BreweryBrowseProvider({ children, ...list }: BrowseContext & { children: ReactNode }) {
  return <Context.Provider value={list}>{children}</Context.Provider>;
}

export function BreweryBrowseLink({ href, onNavigate, ...props }: ComponentProps<typeof Link>) {
  const list = useContext(Context);
  const router = useRouter();
  return <Link {...props} href={href} prefetch={false} onNavigate={event => {
    onNavigate?.(event);
    const match = typeof href === "string" ? /^\/breweries\/([1-9]\d*)$/.exec(href) : null;
    if (!list || !match || !list.ids.includes(Number(match[1]))) return;
    try {
      const token = crypto.randomUUID();
      const currentHref = window.location.pathname + window.location.search + window.location.hash;
      const returnHref = list.returnHref ?? currentHref;
      if (!saveBreweryBrowse(window.sessionStorage, token, { ...list, returnHref })) return;
      // Restore catalogue/personal filters when browser Back returns to the source.
      if (returnHref !== currentHref) window.history.replaceState(null, "", returnHref);
      event.preventDefault();
      router.push(breweryBrowseHref(Number(match[1]), token));
    } catch { /* Storage restrictions retain the ordinary link. */ }
  }} />;
}

export function BreweryBrowseNavigation({ breweryId, ownerId }: { breweryId: number; ownerId: string }) {
  const params = useSearchParams();
  const token = params.get("browse") ?? "";
  const isClient = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const list = useMemo(() => {
    if (!isClient || !token) return null;
    try { return readBreweryBrowse(window.sessionStorage, token, ownerId); } catch { return null; }
  }, [isClient, token, ownerId]);
  const neighbours = list && getBreweryNeighbours(list, breweryId);
  if (!list || !neighbours || neighbours.total < 2) return null;
  return <nav className="taste-brewery-browse" aria-label="Procházení pivovarů ve vybraném seznamu">
    {neighbours.previous ? <Link prefetch={false} href={breweryBrowseHref(neighbours.previous, token)} className="taste-brewery-browse-arrow" aria-label="Předchozí pivovar" title="Předchozí pivovar">←</Link> : <button type="button" disabled className="taste-brewery-browse-arrow" aria-label="Předchozí pivovar">←</button>}
    <Link prefetch={false} href={list.returnHref} className="taste-brewery-browse-list" title="Zpět na seznam"><span>{list.label}</span><small>{neighbours.index + 1} / {neighbours.total} · Zpět na seznam</small></Link>
    {neighbours.next ? <Link prefetch={false} href={breweryBrowseHref(neighbours.next, token)} className="taste-brewery-browse-arrow" aria-label="Další pivovar" title="Další pivovar">→</Link> : <button type="button" disabled className="taste-brewery-browse-arrow" aria-label="Další pivovar">→</button>}
  </nav>;
}
