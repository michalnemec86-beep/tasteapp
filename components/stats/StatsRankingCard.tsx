import Link from "next/link";
import type { ReactNode } from "react";

import type { RankingItem } from "@/lib/stats";

type StatsRankingCardProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
  items: RankingItem[];
  getItemHref?: (
    item: RankingItem
  ) => string;
};

export default function StatsRankingCard({
  title,
  subtitle,
  icon,
  accent,
  items,
  getItemHref,
}: StatsRankingCardProps) {
  const topItems =
    items.slice(0, 5);

  const maximum =
    topItems[0]?.count ?? 1;

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "14px",
        border:
          "1px solid var(--taste-border)",
        borderRadius:
          "var(--taste-radius-lg)",
        background: `
          linear-gradient(
            145deg,
            rgba(231,166,47,0.035),
            transparent 42%
          ),
          var(--taste-surface)
        `,
        boxShadow:
          "var(--taste-shadow-soft)",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-22px",
          top: "-22px",
          width: "76px",
          height: "76px",
          borderRadius: "50%",
          background: `radial-gradient(
            circle,
            ${accent}18 0%,
            transparent 70%
          )`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          gap: "9px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9px",
            border:
              `1px solid ${accent}30`,
            background:
              `${accent}12`,
            fontSize: "15px",
          }}
        >
          {icon}
        </div>

        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              color:
                "var(--taste-text)",
              fontSize: "14px",
              lineHeight: 1.15,
              fontWeight: 750,
              letterSpacing:
                "-0.015em",
            }}
          >
            {title}
          </h3>

          <div
            style={{
              marginTop: "2px",
              color:
                "var(--taste-text-muted)",
              fontSize: "10px",
              lineHeight: 1.25,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      {topItems.length === 0 && (
        <div
          style={{
            padding:
              "16px 2px 8px",
            color:
              "var(--taste-text-muted)",
            fontSize: "11px",
          }}
        >
          Zatím nejsou žádná data.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: "9px",
          marginTop: "14px",
        }}
      >
        {topItems.map(
          (item, index) => {
            const percentage =
              maximum > 0
                ? Math.max(
                    7,
                    (item.count /
                      maximum) *
                      100
                  )
                : 0;

            const isFirst =
              index === 0;

            return (
              <div key={item.id}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "22px minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: "7px",
                    marginBottom: "4px",
                  }}
                >
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      borderRadius: "7px",
                      border: isFirst
                        ? `1px solid ${accent}45`
                        : "1px solid rgba(255,255,255,0.045)",
                      background:
                        isFirst
                          ? `${accent}12`
                          : "rgba(255,255,255,0.018)",
                      color:
                        isFirst
                          ? accent
                          : "var(--taste-text-muted)",
                      fontSize: "9px",
                      fontWeight: 800,
                    }}
                  >
                    {index + 1}
                  </div>

                  <div
                    title={item.name}
                    style={{
                      minWidth: 0,
                      overflow:
                        "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                      color:
                        isFirst
                          ? "var(--taste-text)"
                          : "var(--taste-text-soft)",
                      fontSize: "11px",
                      fontWeight:
                        isFirst
                          ? 700
                          : 600,
                    }}
                  >
                    {getItemHref ? (
                      <Link
                        href={getItemHref(item)}
                        style={{
                          color: "inherit",
                          textDecoration: "none",
                          borderBottom:
                            "1px solid rgba(231,166,47,0.28)",
                        }}
                      >
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </div>

                  <div
                    style={{
                      color:
                        isFirst
                          ? accent
                          : "var(--taste-text-soft)",
                      fontSize: "10px",
                      fontWeight: 750,
                    }}
                  >
                    {item.count}×
                  </div>
                </div>

                <div
                  style={{
                    marginLeft: "29px",
                    height: "3px",
                    borderRadius:
                      "999px",
                    background:
                      "rgba(255,255,255,0.045)",
                    overflow:
                      "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width:
                        `${percentage}%`,
                      borderRadius:
                        "999px",
                      background:
                        isFirst
                          ? `linear-gradient(
                              90deg,
                              ${accent},
                              ${accent}aa
                            )`
                          : `${accent}85`,
                      boxShadow:
                        isFirst
                          ? `0 0 8px ${accent}35`
                          : "none",
                    }}
                  />
                </div>
              </div>
            );
          }
        )}
      </div>

      <div
        style={{
          marginTop: "14px",
          paddingTop: "9px",
          borderTop:
            "1px solid rgba(231,166,47,0.11)",
        }}
      >
        <Link
          href="/stats"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: "8px",
            color:
              "var(--taste-text-muted)",
            textDecoration:
              "none",
            fontSize: "10px",
            fontWeight: 650,
          }}
        >
          <span>
            Kompletní statistiky
          </span>

          <span
            style={{
              color: accent,
              fontSize: "12px",
            }}
          >
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
