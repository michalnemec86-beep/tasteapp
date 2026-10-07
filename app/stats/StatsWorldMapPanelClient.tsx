"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import CollapsibleMapPanel, {
  WorldMapPreview,
} from "@/components/maps/CollapsibleMapPanel";
import TasteLoader from "@/components/ui/TasteLoader";
import type { BeerWorldMapProps } from "./BeerWorldMap";

const BeerWorldMap = dynamic(
  () => import("./BeerWorldMap"),
  {
    ssr: false,
    loading: () => (
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
          label="Načítám světovou mapu"
          compact
        />
      </div>
    ),
  }
);

export default function StatsWorldMapPanelClient(
  props: BeerWorldMapProps
) {
  const [open, setOpen] = useState(false);

  return (
    <CollapsibleMapPanel
      className="taste-ranking-carousel-item"
      title="Mapa ochutnaných zemí"
      eyebrow="Pivní mapa světa"
      description="Interaktivní mapa zemí z ochutnávek se načte až po rozbalení."
      open={open}
      onToggle={() => setOpen((value) => !value)}
      preview={<WorldMapPreview />}
      variant="map"
    >
      <BeerWorldMap {...props} />
    </CollapsibleMapPanel>
  );
}
