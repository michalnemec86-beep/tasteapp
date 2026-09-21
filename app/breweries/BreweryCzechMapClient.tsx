"use client";

import dynamic from "next/dynamic";
import TasteLoader from "@/components/ui/TasteLoader";

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
        <TasteLoader label="Načítám mapu pivovarů" compact />
      </div>
    ),
  }
);

export default function BreweryCzechMapClient({
  items,
  variant = "overview",
}: {
  items: BreweryMapItem[];
  variant?: "overview" | "single";
}) {
  return (
    <BreweryCzechMap
      items={items}
      variant={variant}
    />
  );
}
