"use client";

import { type CSSProperties, type ImgHTMLAttributes, useState } from "react";
import { isStoredBreweryLogo } from "@/lib/logo-layout";

export default function AutoLogoFrame({
  src, alt = "", size = 28, padding = 2, className = "", style, onError, referrerPolicy,
}: {
  src: string;
  alt?: string;
  size?: number;
  padding?: number;
  className?: string;
  style?: CSSProperties;
  onError?: ImgHTMLAttributes<HTMLImageElement>["onError"];
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>["referrerPolicy"];
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const normalized = failedSource !== src &&
    isStoredBreweryLogo(src, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  return (
    <span className={["taste-brewery-logo-frame", "taste-auto-logo-frame", className].filter(Boolean).join(" ")}
      data-logo-normalized={normalized || undefined}
      style={{ width: size, height: size, flexShrink: 0, display: "inline-flex", alignItems: "center",
        justifyContent: "center", overflow: "hidden", borderRadius: "50%", boxSizing: "border-box",
        border: "1px solid rgba(235,174,75,.42)", background: "#17130f",
        boxShadow: "0 2px 8px rgba(0,0,0,.36), inset 0 1px rgba(255,221,162,.08)",
        padding: normalized ? 0 : padding, ...style }}>
      <img src={normalized ? `/api/brewery-logo.webp?src=${encodeURIComponent(src)}` : src}
        alt={alt} decoding="async" referrerPolicy={referrerPolicy}
        onError={event => { if (normalized) setFailedSource(src); else onError?.(event); }}
        style={{ display: "block", width: "100%", height: "100%", minWidth: 0, minHeight: 0,
          maxWidth: "100%", maxHeight: "100%", objectFit: "contain", objectPosition: "center" }} />
    </span>
  );
}
