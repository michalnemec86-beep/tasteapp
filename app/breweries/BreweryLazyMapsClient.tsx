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
        gap: "18px",
        marginTop: "30px",
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
            minHeight: "190px",
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
              minHeight: "190px",
              padding: "22px 24px",
              background:
                "linear-gradient(to top, rgba(12,9,6,0.92), rgba(12,9,6,0.18) 68%, rgba(12,9,6,0.04))",
            }}
          >
            <div>
              <div
                className="taste-label"
                style={{
                  marginBottom: "5px",
                }}
              >
                {eyebrow}
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  lineHeight: 1.1,
                  fontWeight: 780,
                  letterSpacing: "-0.025em",
                }}
              >
                {title}
              </h2>

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
            </div>

            <span
              className="taste-button-secondary"
              aria-hidden="true"
              style={{
                flexShrink: 0,
                minWidth: "92px",
                textAlign: "center",
                fontSize: "11px",
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
        opacity: 0.56,
      }}
    >
      <defs>
        <pattern
          id="czech-grid"
          width="36"
          height="36"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 36 0 L 0 0 0 36"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect width="800" height="260" fill="url(#czech-grid)" />

      <path
        d="M136 131 L184 102 L245 105 L284 80 L344 89 L378 68 L440 83 L476 69 L542 92 L604 91 L656 117 L637 145 L586 156 L555 187 L497 183 L453 204 L399 187 L349 204 L292 181 L237 186 L206 163 L151 157 Z"
        fill="rgba(231,166,47,0.15)"
        stroke="rgba(242,182,63,0.72)"
        strokeWidth="3"
      />

      {[
        [240, 132],
        [321, 114],
        [389, 145],
        [468, 112],
        [544, 133],
        [603, 119],
      ].map(([cx, cy], index) => (
        <circle
          key={index}
          cx={cx}
          cy={cy}
          r={index === 2 ? 8 : 5}
          fill={
            index === 2
              ? "#ffd36f"
              : "#e7a62f"
          }
          opacity={0.9}
        />
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
