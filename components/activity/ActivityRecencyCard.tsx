import Link from "next/link";
import type {
  ReactNode,
} from "react";

import AutoLogoFrame from "@/components/ui/AutoLogoFrame";
import HomeStatIcon from "@/components/home/HomeStatIcon";
import { BeerStyleGlassIcon } from "@/components/stats/StatsRankingCard";
import {
  activityItemDisplayName,
  activityItemFlag,
  activityItemHref,
  activityOverviewHref,
  type ActivityRecencyItem,
  type ActivityViewKey,
} from "@/lib/activity-recency";

type Props = {
  view: ActivityViewKey;
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
  items: ActivityRecencyItem[];
  variant?:
    | "recent"
    | "news";
};

function formatDate(
  value: string
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}. ${month}.`;
}

export default function ActivityRecencyCard({
  view,
  title,
  subtitle,
  icon,
  accent,
  items,
  variant = "recent",
}: Props) {
  const news =
    variant === "news";
  const maximumCount =
    Math.max(
      1,
      ...items.map(
        (item) =>
          item.count ?? 1
      )
    );

  return (
    <section
      style={{
        position:
          "relative",
        overflow:
          "hidden",
        padding:
          "14px",
        border:
          news
            ? `1px solid ${accent}55`
            : "1px solid var(--taste-border)",
        borderRadius:
          "var(--taste-radius-lg)",
        background:
          news
            ? `
              radial-gradient(
                circle at 88% 5%,
                ${accent}26,
                transparent 31%
              ),
              linear-gradient(
                150deg,
                rgba(75,43,22,.56),
                rgba(24,18,14,.97) 62%
              )
            `
            : `
              radial-gradient(
                circle at 92% 6%,
                ${accent}18,
                transparent 28%
              ),
              linear-gradient(
                150deg,
                rgba(231,166,47,.035),
                transparent 44%
              ),
              var(--taste-surface)
            `,
        boxShadow:
          news
            ? `0 10px 28px rgba(0,0,0,.28), 0 0 18px ${accent}14, inset 0 1px rgba(255,225,174,.08)`
            : "var(--taste-shadow-soft)",
      }}
    >
      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          gap:
            "9px",
        }}
      >
        <div
          style={{
            width:
              "32px",
            height:
              "32px",
            flexShrink:
              0,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            border:
              `1px solid ${accent}38`,
            borderRadius:
              "9px",
            background:
              `${accent}14`,
            color:
              accent,
          }}
        >
          {icon}
        </div>

        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "6px",
            }}
          >
            <h3
              style={{
                margin: 0,
                minWidth: 0,
                color:
                  news
                    ? "#fff0d2"
                    : "var(--taste-text)",
                fontSize:
                  "14px",
                lineHeight:
                  1.15,
                fontWeight:
                  800,
                letterSpacing:
                  "-0.015em",
              }}
            >
              {title}
            </h3>

            {news && (
              <span
                style={{
                  flexShrink:
                    0,
                  padding:
                    "2px 5px",
                  border:
                    `1px solid ${accent}55`,
                  borderRadius:
                    "999px",
                  background:
                    `${accent}18`,
                  color:
                    accent,
                  fontSize:
                    "7px",
                  fontWeight:
                    900,
                  letterSpacing:
                    ".08em",
                }}
              >
                NEW
              </span>
            )}
          </div>

          {news && (
            <div
              style={{
                marginTop:
                  "2px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "9.5px",
                lineHeight:
                  1.25,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {items.length ===
        0 && (
        <div
          style={{
            padding:
              "18px 2px 8px",
            color:
              "var(--taste-text-muted)",
            fontSize:
              "11px",
          }}
        >
          Zatím tu není
          žádná položka.
        </div>
      )}

      <div
        style={{
          display:
            "grid",
          gap:
            "8px",
          marginTop:
            "13px",
        }}
      >
        {items
          .slice(0, 5)
          .map(
            (
              item,
              index
            ) => {
              const flag =
                activityItemFlag(
                  view,
                  item
                );

              const content = (
                <>
                  {view === "recent-styles" ? (
                    <span
                      aria-hidden="true"
                      style={{
                        width:
                          "34px",
                        height:
                          "34px",
                        flexShrink:
                          0,
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                      }}
                    >
                      <BeerStyleGlassIcon
                        styleName={
                          item.name
                        }
                      />
                    </span>
                  ) : view === "recent-packaging" ? (
                    <span
                      aria-hidden="true"
                      style={{
                        width:
                          "34px",
                        height:
                          "34px",
                        flexShrink:
                          0,
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                      }}
                    >
                      <HomeStatIcon
                        kind={
                          item.id === "draft"
                            ? "mug"
                            : item.id === "bottle"
                              ? "bottle"
                              : item.id === "can"
                                ? "can"
                                : item.id === "pet"
                                  ? "pet"
                                  : "package"
                        }
                      />
                    </span>
                  ) : item.logoUrl ? (
                    <AutoLogoFrame
                      src={
                        item.logoUrl
                      }
                      size={34}
                      padding={2}
                    />
                  ) : flag ? (
                    <span
                      aria-hidden="true"
                      style={{
                        width:
                          "34px",
                        height:
                          "34px",
                        flexShrink:
                          0,
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        border:
                          "1px solid rgba(255,255,255,.08)",
                        borderRadius:
                          "9px",
                        background:
                          "rgba(255,255,255,.025)",
                        fontSize:
                          "18px",
                      }}
                    >
                      {flag}
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      style={{
                        width:
                          "34px",
                        height:
                          "34px",
                        flexShrink:
                          0,
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        border:
                          `1px solid ${accent}35`,
                        borderRadius:
                          "9px",
                        background:
                          `${accent}10`,
                        color:
                          accent,
                        fontSize:
                          "9px",
                        fontWeight:
                          850,
                      }}
                    >
                      {news
                        ? "N"
                        : index +
                          1}
                    </span>
                  )}

                  <span
                    style={{
                      minWidth:
                        0,
                      display:
                        "grid",
                      gap:
                        news
                          ? 0
                          : "4px",
                    }}
                  >
                    <span
                      style={{
                        minWidth:
                          0,
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                        color:
                          "#fff",
                        fontSize:
                          "11.5px",
                        fontWeight:
                          index === 0
                            ? 750
                            : 650,
                      }}
                    >
                      {activityItemDisplayName(
                        view,
                        item
                      )}
                    </span>

                    {!news && (
                      <span
                        aria-label={
                          `Počet ochutnávek: ${item.count ?? 1}`
                        }
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "minmax(0,1fr) auto",
                          alignItems:
                            "center",
                          gap:
                            "7px",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            position:
                              "relative",
                            height:
                              "4px",
                            overflow:
                              "hidden",
                            borderRadius:
                              "999px",
                            background:
                              "rgba(255,255,255,.07)",
                          }}
                        >
                          <span
                            style={{
                              position:
                                "absolute",
                              inset:
                                "0 auto 0 0",
                              width:
                                `${Math.max(
                                  8,
                                  ((item.count ?? 1) /
                                    maximumCount) *
                                    100
                                )}%`,
                              borderRadius:
                                "999px",
                              background:
                                `linear-gradient(90deg, ${accent}9a, ${accent})`,
                              boxShadow:
                                `0 0 8px ${accent}45`,
                            }}
                          />
                        </span>

                        <span
                          style={{
                            color:
                              item.count &&
                              item.count > 1
                                ? accent
                                : "var(--taste-text-muted)",
                            fontSize:
                              "8.5px",
                            lineHeight:
                              1,
                            fontWeight:
                              800,
                            fontVariantNumeric:
                              "tabular-nums",
                          }}
                        >
                          {item.count ?? 1}×
                        </span>
                      </span>
                    )}
                  </span>

                  <time
                    dateTime={
                      item.date
                    }
                    style={{
                      flexShrink:
                        0,
                      color:
                        index ===
                        0
                          ? accent
                          : "var(--taste-text-muted)",
                      fontSize:
                        "9.5px",
                      fontWeight:
                        750,
                      fontVariantNumeric:
                        "tabular-nums",
                    }}
                  >
                    {formatDate(
                      item.date
                    )}
                  </time>
                </>
              );

              return (
                <Link
                  key={
                    item.id
                  }
                  prefetch={
                    false
                  }
                  href={activityItemHref(
                    view,
                    item
                  )}
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "34px minmax(0,1fr) auto",
                    alignItems:
                      "center",
                    gap:
                      "8px",
                    color:
                      "inherit",
                    textDecoration:
                      "none",
                  }}
                >
                  {content}
                </Link>
              );
            }
          )}
      </div>

      <div
        style={{
          marginTop:
            "13px",
          paddingTop:
            "9px",
          borderTop:
            news
              ? `1px solid ${accent}22`
              : "1px solid rgba(231,166,47,.11)",
        }}
      >
        <Link
          href={activityOverviewHref(
            view
          )}
          style={{
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap:
              "8px",
            color:
              "var(--taste-text-muted)",
            textDecoration:
              "none",
            fontSize:
              "10px",
            fontWeight:
              650,
          }}
        >
          <span>
            Zobrazit celý
            přehled
          </span>

          <span
            style={{
              color:
                accent,
              fontSize:
                "12px",
            }}
          >
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
