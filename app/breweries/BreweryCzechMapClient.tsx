"use client";

import dynamic from "next/dynamic";

import type {
  BreweryMapItem,
} from "./BreweryCzechMap";

const BreweryCzechMap = dynamic(
  () => import("./BreweryCzechMap"),
  {
    ssr: false,
    loading: () => (
      <div
        className="taste-card"
        style={{
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--taste-text-muted)",
          fontSize: "12px",
        }}
      >
        Načítám mapu pivovarů…
      </div>
    ),
  }
);

export default function BreweryCzechMapClient({
  items,
}: {
  items: BreweryMapItem[];
}) {
  return (
    <BreweryCzechMap
      items={items}
    />
  );
}
