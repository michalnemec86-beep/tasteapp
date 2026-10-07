"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import CollapsibleMapPanel, {
  CzechMapPreview,
  WorldMapPreview,
} from "@/components/maps/CollapsibleMapPanel";
import TasteLoader from "@/components/ui/TasteLoader";
import type { BreweryMapItem } from "@/app/breweries/BreweryCzechMap";
import type { RankingItem } from "@/lib/stats";

const BreweryCzechMapClient = dynamic(
  () => import("@/app/breweries/BreweryCzechMapClient"),
  {
    ssr: false,
    loading: () => <MapLoading label="Načítám českou mapu" />,
  }
);

const BeerWorldMap = dynamic(
  () => import("@/app/stats/BeerWorldMap"),
  {
    ssr: false,
    loading: () => <MapLoading label="Načítám světovou mapu" />,
  }
);

export default function ProfileMapsClient({
  worldItems,
  czechItems,
  profileId,
}: {
  worldItems: RankingItem[];
  czechItems: BreweryMapItem[];
  profileId: string;
}) {
  const [czechOpen, setCzechOpen] = useState(false);
  const [worldOpen, setWorldOpen] = useState(false);

  return (
    <section
      className="taste-profile-maps"
      style={{
        display: "grid",
        gap: "12px",
        marginBottom: "38px",
      }}
    >
      <CollapsibleMapPanel
        title="Mapa ochutnaných pivovarů v Česku"
        eyebrow="Česká pivní mapa"
        description="Pivovary z českých ochutnávek tohoto profilu. Interaktivní mapa se načte až po rozbalení."
        open={czechOpen}
        onToggle={() => setCzechOpen((value) => !value)}
        preview={<CzechMapPreview />}
        variant="map"
      >
        {czechItems.length > 0 ? (
          <BreweryCzechMapClient items={czechItems} />
        ) : (
          <MapEmpty text="V profilu zatím není český pivovar se souřadnicemi." />
        )}
      </CollapsibleMapPanel>

      <CollapsibleMapPanel
        title="Mapa ochutnaných zemí"
        eyebrow="Pivní mapa světa"
        description="Země původu pivovarů v tomto profilu. Interaktivní mapa se načte až po rozbalení."
        open={worldOpen}
        onToggle={() => setWorldOpen((value) => !value)}
        preview={<WorldMapPreview />}
        variant="map"
      >
        {worldItems.length > 0 ? (
          <BeerWorldMap
            items={worldItems}
            title="Mapa pivního původu"
            countLabel="zemí v profilu"
            statsContextUserId={profileId}
            lockStatsContext
          />
        ) : (
          <MapEmpty text="V profilu zatím nejsou žádné země k zobrazení." />
        )}
      </CollapsibleMapPanel>
    </section>
  );
}

function MapLoading({ label }: { label: string }) {
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
      <TasteLoader label={label} compact />
    </div>
  );
}

function MapEmpty({ text }: { text: string }) {
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
