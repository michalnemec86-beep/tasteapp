"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "tasteapp:breweries:list-state:v1";

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
    (document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.value ?? "");

  return {
    search: read(SELECTORS.search),
    user: read(SELECTORS.user),
    country: read(SELECTORS.country),
    city: read(SELECTORS.city),
  };
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

  useEffect(() => {
    if (pathname !== "/breweries") return;

    let restoring = true;
    let restoreTimers: number[] = [];

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<StoredState>) : null;

      if (saved) {
        const schedule = (delay: number, callback: () => void) => {
          const timer = window.setTimeout(callback, delay);
          restoreTimers.push(timer);
        };

        schedule(0, () => {
          dispatchControlledValue(SELECTORS.user, saved.user ?? "", "change");
          dispatchControlledValue(SELECTORS.search, saved.search ?? "", "input");
        });

        schedule(90, () => {
          dispatchControlledValue(SELECTORS.country, saved.country ?? "", "change");
        });

        schedule(180, () => {
          dispatchControlledValue(SELECTORS.city, saved.city ?? "", "change");
        });

        schedule(320, () => {
          restoring = false;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readCurrentState()));
        });
      } else {
        restoring = false;
      }
    } catch {
      restoring = false;
    }

    const persist = () => {
      if (restoring) return;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readCurrentState()));
      } catch {
        // Storage may be unavailable in private/restricted browsing. The page still works normally.
      }
    };

    const handleFieldEvent = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

      const isTracked = Object.values(SELECTORS).some((selector) => target.matches(selector));
      if (!isTracked) return;

      window.setTimeout(persist, 0);
    };

    document.addEventListener("input", handleFieldEvent, true);
    document.addEventListener("change", handleFieldEvent, true);
    window.addEventListener("pagehide", persist);

    return () => {
      restoreTimers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener("input", handleFieldEvent, true);
      document.removeEventListener("change", handleFieldEvent, true);
      window.removeEventListener("pagehide", persist);
    };
  }, [pathname]);

  return null;
}
