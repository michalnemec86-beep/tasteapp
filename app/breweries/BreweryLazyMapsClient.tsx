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
        variant="czech"
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
  variant = "default",
}: {
  title: string;
  eyebrow: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  preview: ReactNode;
  children: ReactNode;
  variant?: "default" | "czech";
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
              variant === "czech"
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
                variant === "czech"
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
                    variant === "czech"
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

function CzechPreview() {
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

function WorldPreview() {
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
