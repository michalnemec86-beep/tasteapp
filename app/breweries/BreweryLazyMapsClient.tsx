"use client";

import dynamic from "next/dynamic";
import {
  useState,
  type ReactNode,
} from "react";

import TasteLoader from "@/components/ui/TasteLoader";
import type { BreweryMapItem } from "./BreweryCzechMap";

const BreweryCzechMapClient = dynamic(
  () => import("./BreweryCzechMapClient"),
  {
    ssr: false,
    loading: () => (
      <MapLoading label="Načítám českou mapu" />
    ),
  }
);

const BeerWorldMap = dynamic(
  () => import("../stats/BeerWorldMap"),
  {
    ssr: false,
    loading: () => (
      <MapLoading label="Načítám světovou mapu" />
    ),
  }
);

type WorldItem = {
  id: string | number;
  name: string;
  count: number;
};

type PanelKind = "czech" | "world";

export default function BreweryLazyMapsClient({
  newSince,
  newUntil,
}: {
  newSince?: string;
  newUntil?: string;
}) {
  const [czechOpen, setCzechOpen] = useState(false);
  const [worldOpen, setWorldOpen] = useState(false);

  const [czechItems, setCzechItems] =
    useState<BreweryMapItem[] | null>(null);
  const [worldItems, setWorldItems] =
    useState<WorldItem[] | null>(null);

  const [czechLoading, setCzechLoading] = useState(false);
  const [worldLoading, setWorldLoading] = useState(false);

  const [czechError, setCzechError] = useState("");
  const [worldError, setWorldError] = useState("");

  async function load(kind: PanelKind) {
    const isCzech = kind === "czech";
    const hasData = isCzech
      ? czechItems != null
      : worldItems != null;

    if (hasData) {
      return;
    }

    if (isCzech) {
      setCzechLoading(true);
      setCzechError("");
    } else {
      setWorldLoading(true);
      setWorldError("");
    }

    try {
      const params = new URLSearchParams({
        type: kind,
      });

      if (newSince && newUntil) {
        params.set("newSince", newSince);
        params.set("newUntil", newUntil);
      }

      const response = await fetch(
        `/api/breweries/maps?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Map request failed with status ${response.status}`
        );
      }

      if (isCzech) {
        const data = (await response.json()) as {
          items?: BreweryMapItem[];
        };
        setCzechItems(data.items ?? []);
      } else {
        const data = (await response.json()) as {
          items?: WorldItem[];
        };
        setWorldItems(data.items ?? []);
      }
    } catch {
      if (isCzech) {
        setCzechError(
          "Českou mapu se nepodařilo načíst. Zkontroluj připojení a zkus to znovu."
        );
      } else {
        setWorldError(
          "Světovou mapu se nepodařilo načíst. Zkontroluj připojení a zkus to znovu."
        );
      }
    } finally {
      if (isCzech) {
        setCzechLoading(false);
      } else {
        setWorldLoading(false);
      }
    }
  }

  async function toggleCzech() {
    const next = !czechOpen;
    setCzechOpen(next);

    if (next) {
      await load("czech");
    }
  }

  async function toggleWorld() {
    const next = !worldOpen;
    setWorldOpen(next);

    if (next) {
      await load("world");
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        marginTop: "24px",
      }}
    >
      <MapPanel
        title="Mapa pivovarů v Česku"
        eyebrow="Česká pivní mapa"
        description="Interaktivní mapa českých pivovarů se načte až po rozbalení."
        open={czechOpen}
        onToggle={() => void toggleCzech()}
        preview={<CzechPreview />}
      >
        {czechLoading ? (
          <MapLoading label="Načítám českou mapu" />
        ) : czechError ? (
          <MapError
            message={czechError}
            onRetry={() => void load("czech")}
          />
        ) : czechItems ? (
          czechItems.length > 0 ? (
            <BreweryCzechMapClient
              items={czechItems}
            />
          ) : (
            <MapEmpty text="Zatím není zakreslený žádný český pivovar." />
          )
        ) : null}
      </MapPanel>

      <MapPanel
        title="Světová mapa pivovarů"
        eyebrow="Pivovary ve světě"
        description="Přehled států s evidovanými pivovary se načte až po rozbalení."
        open={worldOpen}
        onToggle={() => void toggleWorld()}
        preview={<WorldPreview />}
      >
        {worldLoading ? (
          <MapLoading label="Načítám světovou mapu" />
        ) : worldError ? (
          <MapError
            message={worldError}
            onRetry={() => void load("world")}
          />
        ) : worldItems ? (
          worldItems.length > 0 ? (
            <BeerWorldMap
              items={worldItems}
              title="Mapa evidovaných pivovarů"
              countLabel="států s pivovary"
              focusEurope
            />
          ) : (
            <MapEmpty text="Zatím není evidovaný žádný stát s pivovarem." />
          )
        ) : null}
      </MapPanel>
    </div>
  );
}

function MapPanel({
  title,
  eyebrow,
  description,
  open,
  onToggle,
  preview,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  preview: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="taste-card"
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
              "linear-gradient(145deg, rgba(231,166,47,0.08), transparent 54%), rgba(255,255,255,0.015)",
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
                "linear-gradient(to top, rgba(12,9,6,0.92), rgba(12,9,6,0.18) 68%, rgba(12,9,6,0.04))",
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
                minWidth: open ? "92px" : "82px",
                padding: open ? undefined : "7px 9px",
                textAlign: "center",
                fontSize: open ? "11px" : "10px",
                fontWeight: 750,
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

function CzechPreview() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 800 260"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.62,
      }}
    >
      <defs>
        <pattern
          id="czech-grid"
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 32 0 L 0 0 0 32"
            fill="none"
            stroke="rgba(255,255,255,0.055)"
            strokeWidth="1"
          />
        </pattern>

        <linearGradient
          id="czech-fill"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="rgba(231,166,47,0.10)"
          />
          <stop
            offset="100%"
            stopColor="rgba(231,166,47,0.22)"
          />
        </linearGradient>
      </defs>

      <rect
        width="800"
        height="260"
        fill="url(#czech-grid)"
      />

      <path
        d="M118 136
           C128 119 145 109 168 107
           C181 91 202 83 226 86
           C246 75 270 74 289 84
           C307 75 327 67 350 70
           C367 61 389 62 407 72
           C425 68 443 71 458 82
           C477 75 499 78 512 91
           C530 88 548 92 560 105
           C581 102 605 109 620 124
           C641 126 659 137 666 151
           C652 160 638 166 622 166
           C610 181 594 190 573 191
           C559 204 541 211 520 207
           C505 218 484 222 465 214
           C449 221 428 220 412 211
           C394 219 372 220 355 210
           C335 216 312 213 297 201
           C276 205 255 198 244 185
           C222 188 202 180 192 166
           C169 169 146 162 136 149
           C126 148 119 143 118 136
           Z"
        fill="url(#czech-fill)"
        stroke="rgba(255,211,111,0.82)"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      <path
        d="M284 96 C310 113 330 131 342 153"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.2"
      />
      <path
        d="M415 85 C432 112 446 143 451 188"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.2"
      />
      <path
        d="M515 103 C506 128 510 154 532 185"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.2"
      />

      {[
        { x: 300, y: 134, label: "Praha", r: 7 },
        { x: 470, y: 165, label: "Brno", r: 5 },
        { x: 582, y: 124, label: "Ostrava", r: 5 },
      ].map((city) => (
        <g key={city.label}>
          <circle
            cx={city.x}
            cy={city.y}
            r={city.r}
            fill="#ffd36f"
            stroke="rgba(58,37,19,0.85)"
            strokeWidth="2"
          />
          <text
            x={city.x + 11}
            y={city.y + 4}
            fill="rgba(255,241,194,0.78)"
            fontSize="12"
            fontWeight="700"
          >
            {city.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function WorldPreview() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 800 260"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.48,
      }}
    >
      <defs>
        <pattern
          id="world-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect width="800" height="260" fill="url(#world-grid)" />

      <ellipse
        cx="400"
        cy="130"
        rx="315"
        ry="105"
        fill="rgba(231,166,47,0.035)"
        stroke="rgba(242,182,63,0.32)"
        strokeWidth="2"
      />

      <path
        d="M136 88 L190 66 L246 73 L269 98 L243 119 L219 144 L178 140 L151 121 Z"
        fill="rgba(231,166,47,0.18)"
      />
      <path
        d="M269 151 L302 144 L327 161 L315 205 L289 226 L276 192 Z"
        fill="rgba(231,166,47,0.18)"
      />
      <path
        d="M356 77 L401 64 L444 73 L463 93 L446 105 L415 104 L404 127 L373 122 L358 102 Z"
        fill="rgba(231,166,47,0.18)"
      />
      <path
        d="M423 126 L460 118 L492 142 L484 187 L451 211 L428 181 Z"
        fill="rgba(231,166,47,0.18)"
      />
      <path
        d="M469 82 L534 66 L609 78 L653 104 L617 124 L568 119 L535 136 L501 116 Z"
        fill="rgba(231,166,47,0.18)"
      />
      <path
        d="M612 171 L649 160 L684 177 L673 202 L636 207 Z"
        fill="rgba(231,166,47,0.18)"
      />
    </svg>
  );
}

function MapLoading({
  label,
}: {
  label: string;
}) {
  return (
    <div
      className="taste-card"
      style={{
        minHeight: "260px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--taste-text-muted)",
      }}
    >
      <TasteLoader
        label={label}
        compact
      />
    </div>
  );
}

function MapError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="taste-card"
      style={{
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          color: "var(--taste-text-muted)",
          fontSize: "12px",
          lineHeight: 1.45,
        }}
      >
        {message}
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="taste-button-secondary"
        style={{
          marginTop: "12px",
        }}
      >
        Zkusit znovu
      </button>
    </div>
  );
}

function MapEmpty({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className="taste-card"
      style={{
        padding: "28px",
        textAlign: "center",
        color: "var(--taste-text-muted)",
        fontSize: "12px",
      }}
    >
      {text}
    </div>
  );
}
