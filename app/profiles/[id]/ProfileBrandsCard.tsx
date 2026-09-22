import Link from "next/link";

import type { RankingItem } from "@/lib/stats";

type Props = {
  items: RankingItem[];
  comparisonItems?: RankingItem[];
  profileId: string;
};

const tones = [
  ["#f0ad3d", "rgba(240,173,61,0.40)", "rgba(240,173,61,0.13)"],
  ["#d98a43", "rgba(217,138,67,0.40)", "rgba(217,138,67,0.12)"],
  ["#bd673b", "rgba(189,103,59,0.40)", "rgba(189,103,59,0.11)"],
  ["#9b7438", "rgba(155,116,56,0.40)", "rgba(155,116,56,0.11)"],
] as const;

export default function ProfileBrandsCard({
  items,
  comparisonItems = [],
  profileId,
}: Props) {
  const visible = items.slice(0, 8);
  const max = visible[0]?.count ?? 1;
  const comparisonCounts = new Map(
    comparisonItems.map((item) => [String(item.id), item.count])
  );

  return (
    <section style={{ marginBottom: "38px" }}>
      <div style={{ marginBottom: "14px" }}>
        <div className="taste-label" style={{ marginBottom: "5px" }}>
          Značkové preference
        </div>
        <h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "-0.025em" }}>
          Nejčastější značky
        </h2>
        <p style={{ maxWidth: "650px", margin: "6px 0 0", color: "var(--taste-text-muted)", fontSize: "11px", lineHeight: 1.55 }}>
          Značky jsou vedené odděleně od výrobních pivovarů a zůstávají
          souvislé i při historické změně výrobce.
        </p>
      </div>

      <article className="taste-card taste-glow-honey" style={{ padding: "18px" }}>
        {visible.length === 0 ? (
          <div style={{ padding: "24px", color: "var(--taste-text-muted)", textAlign: "center", fontSize: "11px" }}>
            Zatím bez dat
          </div>
        ) : (
          <div style={{ display: "grid", gap: "11px" }}>
            {visible.map((item, index) => {
              const [accent, border, wash] = tones[index % tones.length];
              const width = max > 0 ? Math.max(4, (item.count / max) * 100) : 0;

              return (
                <div key={item.id} style={{ padding: "11px 12px", border: `1px solid ${border}`, borderRadius: "12px", background: `linear-gradient(90deg, ${wash}, transparent 74%), rgba(18,12,8,0.22)` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "26px minmax(0,1fr) auto", gap: "8px", alignItems: "center" }}>
                    <span style={{ color: accent, fontSize: "10px", fontWeight: 850 }}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Link href={`/stats?user=${profileId}&locked=1&brand=${item.id}`} className="taste-entity-link" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--taste-text)", fontSize: "12px", fontWeight: 750 }}>
                      {item.name}
                    </Link>
                    <span style={{ color: accent, fontSize: "11px", fontWeight: 850, whiteSpace: "nowrap" }}>
                      {item.count}×
                      <span style={{ marginLeft: "4px", color: "var(--taste-text-muted)", fontSize: "9px", fontWeight: 600 }}>
                        (celkem {comparisonCounts.get(String(item.id)) ?? 0}×)
                      </span>
                    </span>
                  </div>
                  <div style={{ height: "4px", margin: "7px 0 0 34px", overflow: "hidden", borderRadius: "999px", background: "rgba(255,255,255,0.045)" }}>
                    <div style={{ width: `${width}%`, height: "100%", borderRadius: "999px", background: accent, boxShadow: `0 0 12px ${accent}44` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
