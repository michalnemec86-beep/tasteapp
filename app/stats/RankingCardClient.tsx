"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import AutoLogoFrame from "@/components/ui/AutoLogoFrame";
import HomeStatIcon from "@/components/home/HomeStatIcon";
import { getCountryEvidenceHref } from "@/lib/country-flags";

type RankingItem = {
  id: string | number;
  name: string;
  count: number;
  flag?: string;
  logoUrl?: string;
};

type RankingTone =
  | "gold"
  | "honey"
  | "amber"
  | "copper"
  | "malt"
  | "bronze";

type RankingToneStyle = {
  accent: string;
  border: string;
  softBorder: string;
  tint: string;
  bar: string;
  glow: string;
};

type RankingCardClientProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  items: RankingItem[];
  itemHrefPrefix?: string;
  tone?: RankingTone;
  anchorId?: string;
  disableItemLinks?: boolean;
  personalItemIds?: Array<string | number>;
  comparisonItems?: RankingItem[];
  comparisonLabel?: string;
  lockedContext?: boolean;
};

const PREVIEW_LIMIT = 10;

const TONE_STYLES: Record<RankingTone, RankingToneStyle> = {
  gold: {
    accent: "var(--taste-yellow)",
    border: "rgba(242,182,63,0.34)",
    softBorder: "rgba(242,182,63,0.22)",
    tint: "rgba(242,182,63,0.085)",
    bar: "rgba(242,182,63,0.62)",
    glow:
      "radial-gradient(circle at 100% 0%, rgba(242,182,63,0.14), transparent 13rem)",
  },
  honey: {
    accent: "var(--taste-gold)",
    border: "rgba(245,193,109,0.34)",
    softBorder: "rgba(245,193,109,0.22)",
    tint: "rgba(245,193,109,0.08)",
    bar: "rgba(245,193,109,0.60)",
    glow:
      "radial-gradient(circle at 88% 8%, rgba(245,193,109,0.13), transparent 14rem)",
  },
  amber: {
    accent: "var(--taste-orange)",
    border: "rgba(232,136,53,0.34)",
    softBorder: "rgba(232,136,53,0.22)",
    tint: "rgba(232,136,53,0.08)",
    bar: "rgba(232,136,53,0.62)",
    glow:
      "radial-gradient(circle at 72% -8%, rgba(232,136,53,0.14), transparent 14rem)",
  },
  copper: {
    accent: "var(--taste-red)",
    border: "rgba(214,91,66,0.34)",
    softBorder: "rgba(214,91,66,0.22)",
    tint: "rgba(214,91,66,0.08)",
    bar: "rgba(214,91,66,0.60)",
    glow:
      "radial-gradient(circle at 100% 22%, rgba(214,91,66,0.13), transparent 14rem)",
  },
  malt: {
    accent: "var(--taste-green)",
    border: "rgba(156,173,71,0.34)",
    softBorder: "rgba(156,173,71,0.22)",
    tint: "rgba(156,173,71,0.08)",
    bar: "rgba(156,173,71,0.60)",
    glow:
      "radial-gradient(circle at 82% 0%, rgba(156,173,71,0.13), transparent 13rem)",
  },
  bronze: {
    accent: "var(--taste-copper)",
    border: "rgba(168,98,33,0.38)",
    softBorder: "rgba(168,98,33,0.24)",
    tint: "rgba(168,98,33,0.09)",
    bar: "rgba(168,98,33,0.64)",
    glow:
      "radial-gradient(circle at 96% 12%, rgba(168,98,33,0.15), transparent 15rem)",
  },
};

function getItemHref(
  title: string,
  item: RankingItem,
  itemHrefPrefix?: string,
  lockedContext = false,
  currentQuery = ""
) {
  if (lockedContext) {
    const params = new URLSearchParams(currentQuery);
    params.set("locked", "1");
    params.delete("focus");
    params.delete("metric");

    const paramByTitle: Record<string, string> = {
      Piva: "beer",
      Značky: "brand",
      Pivovary: "brewery",
      "Pivní styly": "style",
      Státy: "country",
      Chmely: "hop",
    };

    const param = paramByTitle[title];

    if (!param) {
      return null;
    }

    params.set(
      param,
      title === "Státy" ? item.name : String(item.id)
    );

    return `/stats?${params.toString()}`;
  }

  if (itemHrefPrefix) {
    return `${itemHrefPrefix}/${item.id}`;
  }

  switch (title) {
    case "Piva":
      return `/beers/${item.id}`;
    case "Značky":
      return `/brands/${item.id}`;
    case "Pivní styly":
      return `/styles/${item.id}`;
    case "Státy":
      return getCountryEvidenceHref(item.name);
    case "Chmely":
      return `/stats?hop=${encodeURIComponent(String(item.id))}`;
    default:
      return null;
  }
}

export default function RankingCardClient({
  title,
  icon,
  items,
  itemHrefPrefix,
  tone = "gold",
  anchorId,
  disableItemLinks = false,
  personalItemIds = [],
  comparisonItems = [],
  comparisonLabel = "moje",
  lockedContext = false,
}: RankingCardClientProps) {
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const [isOpen, setIsOpen] = useState(false);

  const maximum =
    items.length > 0
      ? Math.max(...items.map((item) => item.count))
      : 1;

  const previewItems = items.slice(0, PREVIEW_LIMIT);
  const cardTone = TONE_STYLES[tone];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <section
        id={anchorId}
        className="taste-ranking-card"
        style={{
          scrollMarginTop: "88px",
          position: "relative",
          overflow: "hidden",
          padding: "20px",
          border: `1px solid ${cardTone.border}`,
          borderRadius: "var(--taste-radius-lg)",
          background: `${cardTone.glow}, var(--taste-surface)`,
          boxShadow: "var(--taste-shadow-soft)",
        }}
      >
        <RankingHeader
          title={title}
          icon={icon}
          tone={cardTone}
        />

        {items.length === 0 ? (
          <div
            style={{
              padding: "18px 0",
              color: "var(--taste-text-muted)",
              fontSize: "12px",
            }}
          >
            Zatím nejsou žádná data.
          </div>
        ) : (
          <RankingList
            title={title}
            items={previewItems}
            maximum={maximum}
            itemHrefPrefix={itemHrefPrefix}
            disableItemLinks={disableItemLinks}
            personalItemIds={personalItemIds}
            comparisonItems={comparisonItems}
            comparisonLabel={comparisonLabel}
            lockedContext={lockedContext}
            currentQuery={currentQuery}
          />
        )}

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="taste-ranking-more"
            style={{
              width: "100%",
              marginTop: "18px",
              padding: "11px 13px",
              border: `1px solid ${cardTone.softBorder}`,
              borderRadius: "10px",
              background: cardTone.tint,
              color: cardTone.accent,
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Zobrazit celý žebříček
            <span
              style={{
                marginLeft: "7px",
                color: "var(--taste-text-muted)",
                fontWeight: 550,
              }}
            >
              · {items.length} položek
            </span>
          </button>
        )}
      </section>

      {isOpen &&
        createPortal(
          <div
            role="dialog"
            className="taste-ranking-modal-overlay"
            aria-modal="true"
            aria-label={`${title} – celý žebříček`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsOpen(false);
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 4000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
              background: "rgba(8,5,3,0.82)",
              backdropFilter: "blur(8px)",
            }}
          >
            <section
              className="taste-ranking-modal-panel"
              style={{
                width: "min(760px, 100%)",
                maxHeight: "calc(100vh - 36px)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: `1px solid ${cardTone.border}`,
                borderRadius: "var(--taste-radius-xl)",
                background: `${cardTone.glow}, var(--taste-surface)`,
                boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "18px",
                  padding: "22px 24px 18px",
                  borderBottom: `1px solid ${cardTone.softBorder}`,
                }}
              >
                <RankingHeader
                  title={title}
                  icon={icon}
                  tone={cardTone}
                />

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Zavřít"
                  style={{
                    width: "34px",
                    height: "34px",
                    flexShrink: 0,
                    border: `1px solid ${cardTone.softBorder}`,
                    borderRadius: "10px",
                    background: cardTone.tint,
                    color: cardTone.accent,
                    fontSize: "20px",
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  overflowY: "auto",
                  padding: "20px 24px 26px",
                }}
              >
                <RankingList
                  title={title}
                  items={items}
                  maximum={maximum}
                  itemHrefPrefix={itemHrefPrefix}
                  disableItemLinks={disableItemLinks}
                  personalItemIds={personalItemIds}
                  comparisonItems={comparisonItems}
                  comparisonLabel={comparisonLabel}
                  lockedContext={lockedContext}
                  currentQuery={currentQuery}
                />
              </div>
            </section>
          </div>,
          document.body
        )}
    </>
  );
}

function RankingHeader({
  title,
  icon,
  tone,
}: {
  title: string;
  icon: ReactNode;
  tone: RankingToneStyle;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "16px",
      }}
    >
      <div
        className="taste-ranking-header-icon"
        style={{
          width: "34px",
          height: "34px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: `1px solid ${tone.softBorder}`,
          borderRadius: "10px",
          background: tone.tint,
          color: tone.accent,
          fontSize: "15px",
          boxShadow: `inset 0 1px 0 ${tone.softBorder}`,
        }}
      >
        {icon}
      </div>

      <h3
        className="taste-ranking-title"
        style={{
          margin: 0,
          color: tone.accent,
          fontSize: "17px",
          fontWeight: 750,
          letterSpacing: "-0.015em",
        }}
      >
        {title}
      </h3>
    </div>
  );
}

function RankingItemLabel({
  item,
  title,
}: {
  item: RankingItem;
  title: string;
}) {
  const isCountry =
    title === "Státy";

  return (
    <span
      className="taste-ranking-item-label"
      style={{
        minWidth: 0,
        maxWidth: "100%",
        display: "inline-flex",
        alignItems: "center",
        gap: isCountry
          ? "9px"
          : "7px",
      }}
    >
      {isCountry ? (
        <span
          aria-hidden="true"
          className="taste-ranking-country-flag"
          style={{
            width: "30px",
            height: "30px",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "50%",
            border:
              "1px solid rgba(235,174,75,.42)",
            background:
              "rgba(255,255,255,.04)",
            boxShadow:
              "0 2px 7px rgba(0,0,0,.27), inset 0 0 0 1px rgba(255,255,255,.04)",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "28px",
              lineHeight: 1,
              transform:
                "scale(1.34)",
              transformOrigin:
                "center",
            }}
          >
            {item.flag ??
              "🌍"}
          </span>
        </span>
      ) : item.logoUrl ? (
        <AutoLogoFrame
          src={item.logoUrl}
          alt={`Logo ${item.name}`}
          size={24}
          padding={2}
        />
      ) : title === "Značky" || title === "Pivovary" ? (
        <span className="taste-ranking-logo-placeholder" aria-hidden="true">
          <HomeStatIcon kind={title === "Značky" ? "crest" : "brewery"} />
        </span>
      ) : null}

      <span
        className="taste-ranking-item-text"
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.name}
      </span>
    </span>
  );
}

function RankingList({
  title,
  items,
  maximum,
  itemHrefPrefix,
  disableItemLinks = false,
  personalItemIds,
  comparisonItems,
  comparisonLabel,
  lockedContext,
  currentQuery,
}: {
  title: string;
  items: RankingItem[];
  maximum: number;
  itemHrefPrefix?: string;
  disableItemLinks?: boolean;
  personalItemIds: Array<string | number>;
  comparisonItems: RankingItem[];
  comparisonLabel: string;
  lockedContext: boolean;
  currentQuery: string;
}) {
  const personalIds =
    new Set(
      personalItemIds.map(
        String
      )
    );

  const comparisonCounts =
    new Map(
      comparisonItems.map(
        (item) => [
          String(
            item.id
          ),
          item.count,
        ]
      )
    );

  return (
    <div
      className="taste-ranking-list"
      style={{
        display: "grid",
        gap: "11px",
      }}
    >
      {items.map(
        (item) => {
          const isPersonal =
            personalIds.has(
              String(
                item.id
              )
            );

          const percentage =
            maximum > 0
              ? Math.max(
                  8,
                  (item.count /
                    maximum) *
                    100
                )
              : 0;

          const href =
            disableItemLinks
              ? null
              : getItemHref(
                  title,
                  item,
                  itemHrefPrefix,
                  lockedContext,
                  currentQuery
                );

          const comparisonCount =
            comparisonCounts.get(
              String(
                item.id
              )
            ) ?? 0;

          const label = (
            <span
              className="taste-ranking-name"
              title={
                item.name
              }
              style={{
                minWidth: 0,
                overflow:
                  "hidden",
                textOverflow:
                  "ellipsis",
                whiteSpace:
                  "nowrap",
                color: "#fff",
                fontSize:
                  "12px",
                lineHeight:
                  1.2,
                fontWeight:
                  700,
              }}
            >
              <RankingItemLabel
                item={
                  item
                }
                title={
                  title
                }
              />
            </span>
          );

          return (
            <div
              key={
                item.id
              }
              className="taste-ranking-row"
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "minmax(0,auto) 18px minmax(38px,1fr) max-content",
                alignItems:
                  "center",
                gap: "8px",
                minWidth: 0,
              }}
            >
              {href ? (
                <Link
                  href={
                    href
                  }
                  style={{
                    minWidth:
                      0,
                    color:
                      "inherit",
                    textDecoration:
                      "none",
                  }}
                >
                  {label}
                </Link>
              ) : (
                label
              )}

              <span
                title={
                  isPersonal
                    ? "Máš ve své evidenci"
                    : undefined
                }
                aria-label={
                  isPersonal
                    ? "Máš ve své evidenci"
                    : undefined
                }
                aria-hidden={
                  isPersonal
                    ? undefined
                    : true
                }
                className="taste-ranking-personal-mark"
                style={{
                  color:
                    "#f2b63f",
                  fontSize:
                    "13px",
                  lineHeight:
                    1,
                  textAlign:
                    "center",
                  filter:
                    "saturate(.88)",
                }}
              >
                {isPersonal && <HomeStatIcon kind="mug" />}
              </span>

              <span
                aria-hidden="true"
                className="taste-ranking-progress-track"
                style={{
                  position:
                    "relative",
                  height:
                    "4px",
                  minWidth:
                    "38px",
                  overflow:
                    "hidden",
                  borderRadius:
                    "999px",
                  background:
                    "rgba(255,255,255,.045)",
                  boxShadow:
                    "inset 0 1px 1px rgba(0,0,0,.45)",
                }}
              >
                <span
                  className="taste-ranking-progress-fill"
                  style={{
                    position:
                      "absolute",
                    inset:
                      "0 auto 0 0",
                    width:
                      `${percentage}%`,
                    borderRadius:
                      "999px",
                    background:
                      "linear-gradient(90deg, rgba(181,111,28,.72), #f2b63f 58%, #ffe075 100%)",
                    boxShadow:
                      "0 0 9px rgba(242,182,63,.45), inset 0 1px rgba(255,255,255,.32)",
                  }}
                />
              </span>

              <span
                className="taste-ranking-count"
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "baseline",
                  justifyContent:
                    "flex-end",
                  gap: "5px",
                  whiteSpace:
                    "nowrap",
                  fontVariantNumeric:
                    "tabular-nums",
                }}
              >
                <strong
                  style={{
                    color:
                      "#f2b63f",
                    fontSize:
                      "11px",
                    lineHeight:
                      1,
                    fontWeight:
                      800,
                  }}
                >
                  {item.count}×
                </strong>

                <span
                  className="taste-ranking-comparison"
                  style={{
                    color:
                      "#fff",
                    fontSize:
                      "9px",
                    lineHeight:
                      1,
                    fontWeight:
                      400,
                    opacity:
                      .88,
                  }}
                >
                  (
                  {
                    comparisonLabel
                  }{" "}
                  {
                    comparisonCount
                  }
                  ×)
                </span>
              </span>
            </div>
          );
        }
      )}
    </div>
  );
}
