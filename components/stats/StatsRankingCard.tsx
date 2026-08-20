import Link from "next/link";
import type { ReactNode } from "react";

import type { RankingItem } from "@/lib/stats";

type StatsRankingCardProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
  items: RankingItem[];
};

export default function StatsRankingCard({
  title,
  subtitle,
  icon,
  accent,
  items,
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
        padding: "18px",

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
          right: "-25px",
          top: "-25px",
          width: "90px",
          height: "90px",
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
          gap: "11px",
          alignItems: "center",

          marginBottom: "5px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            flexShrink: 0,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            borderRadius: "11px",

            border:
              `1px solid ${accent}30`,

            background:
              `${accent}12`,

            fontSize: "18px",
          }}
        >
          {icon}
        </div>

        <div
          style={{
            minWidth: 0,
          }}
        >
          <h3
            style={{
              margin: 0,

              color:
                "var(--taste-text)",

              fontSize: "15px",
              lineHeight: 1.2,
              fontWeight: 750,

              letterSpacing:
                "-0.015em",
            }}
          >
            {title}
          </h3>

          <div
            style={{
              marginTop: "3px",

              color:
                "var(--taste-text-muted)",

              fontSize: "11px",
              lineHeight: 1.35,
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
              "22px 2px 12px",

            color:
              "var(--taste-text-muted)",

            fontSize: "12px",
          }}
        >
          Zatím nejsou žádná data.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: "15px",
          marginTop: "20px",
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
              <div
                key={item.id}
              >
                <div
                  style={{
                    display: "grid",

                    gridTemplateColumns:
                      "26px minmax(0,1fr) auto",

                    alignItems: "center",
                    gap: "8px",

                    marginBottom: "7px",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",

                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",

                      borderRadius: "8px",

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

                      fontSize: "10px",
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

                      fontSize: "12px",

                      fontWeight:
                        isFirst
                          ? 700
                          : 600,
                    }}
                  >
                    {item.name}
                  </div>

                  <div
                    style={{
                      color:
                        isFirst
                          ? accent
                          : "var(--taste-text-soft)",

                      fontSize: "11px",
                      fontWeight: 750,
                    }}
                  >
                    {item.count}×
                  </div>
                </div>

                <div
                  style={{
                    marginLeft:
                      "34px",

                    height: "4px",

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
                          ? `0 0 10px ${accent}35`
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
          marginTop: "20px",
          paddingTop: "13px",

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

            gap: "10px",

            color:
              "var(--taste-text-muted)",

            textDecoration:
              "none",

            fontSize: "11px",
            fontWeight: 650,
          }}
        >
          <span>
            Kompletní statistiky
          </span>

          <span
            style={{
              color: accent,
              fontSize: "14px",
            }}
          >
            →
          </span>
        </Link>
      </div>
    </section>
  );
}