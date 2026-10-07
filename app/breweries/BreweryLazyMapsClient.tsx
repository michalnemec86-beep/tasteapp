"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import TasteLoader from "@/components/ui/TasteLoader";
import CollapsibleMapPanel, {
  WorldMapPreview,
} from "@/components/maps/CollapsibleMapPanel";
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
      <CollapsibleMapPanel
        title="Mapa pivovarů v Česku"
        eyebrow="Česká pivní mapa"
        description="Interaktivní mapa českých pivovarů se načte až po rozbalení."
        open={czechOpen}
        onToggle={() => void toggleCzech()}
        preview={<CzechPreview />}
        variant="map"
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
      </CollapsibleMapPanel>

      <CollapsibleMapPanel
        title="Světová mapa pivovarů"
        eyebrow="Pivovary ve světě"
        description="Přehled států s evidovanými pivovary se načte až po rozbalení."
        open={worldOpen}
        onToggle={() => void toggleWorld()}
        preview={<WorldMapPreview />}
        variant="map"
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
      </CollapsibleMapPanel>
    </div>
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
