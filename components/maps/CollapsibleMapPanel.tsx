"use client";

import type { ReactNode } from "react";

export default function CollapsibleMapPanel({
  className,
  title,
  eyebrow,
  description,
  open,
  onToggle,
  preview,
  children,
  variant = "default",
}: {
  className?: string;
  title: string;
  eyebrow: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  preview: ReactNode;
  children: ReactNode;
  variant?: "default" | "map";
}) {
  return (
    <section
      className={["taste-card", className].filter(Boolean).join(" ")}
      data-open={open ? "true" : "false"}
      style={{
        overflow: "hidden",
        padding: 0,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          padding: 0,
          border: 0,
          background: "transparent",
          color: "inherit",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            position: "relative",
            minHeight: open ? "164px" : "122px",
            overflow: "hidden",
            borderBottom: open
              ? "1px solid var(--taste-border)"
              : undefined,
            background:
              variant === "map"
                ? "linear-gradient(135deg, #17140f 0%, #1c1812 48%, #211b13 100%)"
                : "linear-gradient(145deg, rgba(231,166,47,0.08), transparent 54%), rgba(255,255,255,0.015)",
          }}
        >
          {preview}

          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "18px",
              minHeight: open ? "164px" : "122px",
              padding: open ? "20px 22px" : "14px 18px",
              background:
                variant === "map"
                  ? "linear-gradient(90deg, rgba(18,14,9,0.96) 0%, rgba(18,14,9,0.88) 33%, rgba(18,14,9,0.34) 58%, rgba(18,14,9,0.08) 100%)"
                  : "linear-gradient(to top, rgba(12,9,6,0.92), rgba(12,9,6,0.18) 68%, rgba(12,9,6,0.04))",
            }}
          >
            <div>
              <div
                className="taste-label"
                style={{
                  marginBottom: open ? "5px" : "3px",
                }}
              >
                {eyebrow}
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: open ? "21px" : "18px",
                  lineHeight: 1.1,
                  fontWeight: 780,
                  letterSpacing: "-0.025em",
                  color:
                    variant === "map"
                      ? "#f5e2ad"
                      : undefined,
                }}
              >
                {title}
              </h2>

              {open && (
                <div
                  style={{
                    marginTop: "7px",
                    maxWidth: "560px",
                    color: "var(--taste-text-muted)",
                    fontSize: "11px",
                    lineHeight: 1.45,
                  }}
                >
                  {description}
                </div>
              )}
            </div>

            <span
              className="taste-button-secondary"
              aria-hidden="true"
              style={{
                flexShrink: 0,
                minWidth: open ? "92px" : "88px",
                padding: open ? undefined : "8px 11px",
                textAlign: "center",
                fontSize: open ? "11px" : "10px",
                fontWeight: 800,
                color: open
                  ? undefined
                  : "#241708",
                background: open
                  ? undefined
                  : "linear-gradient(180deg, #f2c45f 0%, #e7a62f 100%)",
                borderColor: open
                  ? undefined
                  : "rgba(255,224,149,0.72)",
                boxShadow: open
                  ? undefined
                  : "0 4px 14px rgba(231,166,47,0.22)",
                textShadow: open
                  ? undefined
                  : "0 1px 0 rgba(255,255,255,0.22)",
              }}
            >
              {open ? "Sbalit ↑" : "Rozbalit ↓"}
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div
          style={{
            padding: "14px",
          }}
        >
          {children}
        </div>
      )}
    </section>
  );
}

export function CzechMapPreview() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          'url("/images/brewery-czech-preview.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

export function WorldMapPreview() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          'url("/images/brewery-world-preview.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
