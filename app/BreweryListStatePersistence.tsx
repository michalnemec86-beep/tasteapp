"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "tasteapp:breweries:list-state:v2";

const SELECTORS = {
  search: 'input[aria-label="Hledat v katalogu pivovarů"]',
  user: 'select[aria-label="Filtrovat podle uživatele"]',
  country: 'select[aria-label="Filtrovat podle státu"]',
  city: 'select[aria-label="Filtrovat podle města"]',
} as const;

type StoredState = {
  search: string;
  user: string;
  country: string;
  city: string;
};

function readCurrentState(): StoredState {
  const read = (selector: string) =>
    document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.value ?? "";

  return {
    search: read(SELECTORS.search),
    user: read(SELECTORS.user),
    country: read(SELECTORS.country),
    city: read(SELECTORS.city),
  };
}

function readUrlState(params: URLSearchParams): StoredState {
  return {
    search: params.get("q") ?? "",
    user: params.get("user") ?? "",
    country: params.get("country") ?? "",
    city: params.get("city") ?? "",
  };
}

function hasState(state: StoredState) {
  return Boolean(state.search || state.user || state.country || state.city);
}

function dispatchControlledValue(
  selector: string,
  value: string,
  eventName: "input" | "change"
) {
  const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (!element) return false;

  if (element instanceof HTMLSelectElement && value) {
    const optionExists = Array.from(element.options).some((option) => option.value === value);
    if (!optionExists) return false;
  }

  const prototype = element instanceof HTMLInputElement
    ? HTMLInputElement.prototype
    : HTMLSelectElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event(eventName, { bubbles: true }));
  return true;
}

export default function BreweryListStatePersistence() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/breweries") return;

    let restoring = true;
    const restoreTimers: number[] = [];
    const entryParams = new URLSearchParams(window.location.search);
    const entryPage = entryParams.get("page");

    const syncUrl = (state: StoredState, page: string | null = null) => {
      const params = new URLSearchParams(window.location.search);
      const values: Array<[string, string]> = [
        ["q", state.search],
        ["user", state.user],
        ["country", state.country],
        ["city", state.city],
      ];

      for (const [key, value] of values) {
        if (value) params.set(key, value);
        else params.delete(key);
      }

      if (page && page !== "1") params.set("page", page);
      else params.delete("page");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    try {
      const urlState = readUrlState(entryParams);
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as Partial<StoredState>) : null;
      const storedState: StoredState = {
        search: stored?.search ?? "",
        user: stored?.user ?? "",
        country: stored?.country ?? "",
        city: stored?.city ?? "",
      };
      const stateToRestore = hasState(urlState) ? urlState : storedState;

      if (hasState(stateToRestore)) {
        const schedule = (delay: number, callback: () => void) => {
          const timer = window.setTimeout(callback, delay);
          restoreTimers.push(timer);
        };

        schedule(0, () => {
          dispatchControlledValue(SELECTORS.user, stateToRestore.user, "change");
          dispatchControlledValue(SELECTORS.search, stateToRestore.search, "input");
        });

        schedule(90, () => {
          dispatchControlledValue(SELECTORS.country, stateToRestore.country, "change");
        });

        schedule(180, () => {
          dispatchControlledValue(SELECTORS.city, stateToRestore.city, "change");
        });

        schedule(340, () => {
          const restored = readCurrentState();
          restoring = false;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
          syncUrl(restored, entryPage);
        });
      } else {
        restoring = false;
      }
    } catch {
      restoring = false;
    }

    const persist = (resetPage = false) => {
      if (restoring) return;

      try {
        const state = readCurrentState();
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        syncUrl(state, resetPage ? null : new URLSearchParams(window.location.search).get("page"));
      } catch {
        // Restricted/private browsing can disable storage. Filtering still works normally.
      }
    };

    const handleFieldEvent = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

      const isTracked = Object.values(SELECTORS).some((selector) => target.matches(selector));
      if (!isTracked) return;

      window.setTimeout(() => persist(true), 0);
    };

    document.addEventListener("input", handleFieldEvent, true);
    document.addEventListener("change", handleFieldEvent, true);
    window.addEventListener("pagehide", () => persist(false));

    return () => {
      restoreTimers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener("input", handleFieldEvent, true);
      document.removeEventListener("change", handleFieldEvent, true);
    };
  }, [pathname, router]);

  return null;
}
