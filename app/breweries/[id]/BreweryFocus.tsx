"use client";

import { useEffect } from "react";

export default function BreweryFocus({ target }: { target: string | null }) {
  useEffect(() => {
    if (!target) return;
    const element = document.getElementById(target);
    if (!element) return;
    element.scrollIntoView({ block: "start", behavior: "instant" });
    element.focus({ preventScroll: true });
  }, [target]);
  return null;
}
