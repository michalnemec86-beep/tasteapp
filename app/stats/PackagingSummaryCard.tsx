import Link from "next/link";

import AppIcon from "@/components/ui/AppIcon";
import type { RankingItem } from "@/lib/stats";

type PackagingSummaryCardProps = {
  items: RankingItem[];
  contextParams?: Record<string, string | undefined>;
  comparisonItems?: RankingItem[];
  comparisonLabel?: string;
};

type PackagingTone = {
  icon: "beer" | "bottle" | "can" | "pet" | "package";
  accent: string;
  border: string;
  wash: string;
};

const PACKAGING_TONES: Record<string, PackagingTone> = {
  draft: {
    icon: "beer",
    accent: "#f2b63f",
    border: "rgba(242,182,63,0.38)",
    wash: "rgba(242,182,63,0.10)",
  },
  bottle: {
    icon: "bottle",
    accent: "#e88835",
    border: "rgba(232,136,53,0.38)",
    wash: "rgba(232,136,53,0.10)",
  },
  can: {
    icon: "can",
    accent: "#d65b42",
    border: "rgba(214,91,66,0.38)",
    wash: "rgba(214,91,66,0.10)",
  },
  pet: {
    icon: "pet",
    accent: "#9cad47",
    border: "rgba(156,173,71,0.38)",
    wash: "rgba(156,173,71,0.10)",
  },
  other: {
    icon: "package",
    accent: "#b77a36",
    border: "rgba(183,122,54,0.38)",
    wash: "rgba(183,122,54,0.10)",
  },
};

const FALLBACK_TONE: PackagingTone = PACKAGING_TONES.other;

export default function PackagingSummaryCard({
  items,
  contextParams = {},
  comparisonItems = [],
  comparisonLabel = "moje",
}: PackagingSummaryCardProps) {
  const total = items.reduce(
    (sum, item) => sum + item.count,
    0
  );
  const comparisonCounts = new Map(
    comparisonItems.map((item) => [String(item.id), item.count])
  );

  return (
    <section style={{ marginBottom: "28px" }}>
      <div style={{ marginBottom: "14px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "24px",
            lineHeight: 1.1,
            fontWeight: 750,
            letterSpacing: "-0.025em",
          }}
        >
          Čepované, láhev nebo plechovka
        </h2>
      </div>

      <article
        className="taste-card"
        style={{
          padding: "18px",
          border: "1px solid rgba(183,122,54,0.34)",
          background: `
            radial-gradient(circle at 92% 0%, rgba(183,122,54,0.12), transparent 18rem),
            var(--taste-surface)
          `,
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              padding: "12px 4px",
              color: "var(--taste-text-muted)",
              fontSize: "12px",
            }}
          >
            Zatím nejsou žádná data o způsobu podání.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "10px",
            }}
          >
            {items.map((item) => {
              const comparisonCount =
                comparisonCounts.get(String(item.id)) ?? 0;
              const tone =
                PACKAGING_TONES[String(item.id)] ?? FALLBACK_TONE;
              const percentage =
                total > 0 ? (item.count / total) * 100 : 0;
              const params = new URLSearchParams();

              for (const [key, value] of Object.entries(contextParams)) {
                if (value) {
                  params.set(key, value);
                }
              }

              params.set("packaging", String(item.id));

              return (
                <Link
                  key={item.id}
                  href={`/stats?${params.toString()}`}
                  style={{
                    display: "block",
                    padding: "14px",
                    border: `1px solid ${tone.border}`,
                    borderRadius: "13px",
                    background: `linear-gradient(145deg, ${tone.wash}, transparent 76%)`,
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "9px",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          width: "34px",
                          height: "34px",
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "10px",
                          border: `1px solid ${tone.border}`,
                          background: tone.wash,
                          color: tone.accent,
                        }}
                      >
                        <AppIcon name={tone.icon} size={19} />
                      </span>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: "var(--taste-text)",
                            fontSize: "13px",
                            fontWeight: 800,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            marginTop: "2px",
                            color: "var(--taste-text-muted)",
                            fontSize: "9px",
                          }}
                        >
                          {percentage.toLocaleString("cs-CZ", {
                            maximumFractionDigits: 1,
                          })}
                          % všech započítaných piv
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "5px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <strong
                        style={{
                          color: tone.accent,
                          fontSize: "20px",
                          lineHeight: 1,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {item.count}
                      </strong>
                      <span
                        style={{
                          color: "var(--taste-text-muted)",
                          fontSize: "9px",
                          fontWeight: 650,
                        }}
                      >
                        ({comparisonLabel} {comparisonCount})
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      height: "4px",
                      marginTop: "11px",
                      overflow: "hidden",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: "100%",
                        borderRadius: "999px",
                        background: tone.accent,
                        opacity: 0.82,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
