"use client";

import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
  itemHrefPrefix?: string
) {
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
  subtitle,
  icon,
  items,
  itemHrefPrefix,
  tone = "gold",
  anchorId,
  disableItemLinks = false,
  personalItemIds = [],
}: RankingCardClientProps) {
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
          subtitle={subtitle}
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
            tone={cardTone}
            disableItemLinks={disableItemLinks}
            personalItemIds={personalItemIds}
          />
        )}

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
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
                  subtitle={`${subtitle} · ${items.length} položek`}
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
                  tone={cardTone}
                  disableItemLinks={disableItemLinks}
                  personalItemIds={personalItemIds}
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
  subtitle,
  icon,
  tone,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone: RankingToneStyle;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "3px",
        }}
      >
        <div
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

      <div
        style={{
          marginLeft: "44px",
          marginBottom: "18px",
          color: "var(--taste-text-muted)",
          fontSize: "10px",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function RankingItemLabel({ item }: { item: RankingItem }) {
  return (
    <span
      style={{
        minWidth: 0,
        maxWidth: "100%",
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
      }}
    >
      {item.logoUrl ? (
        <span
          style={{
            width: "24px",
            height: "18px",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "5px",
            background: "rgba(255,255,255,0.035)",
          }}
        >
          <img
            src={item.logoUrl}
            alt=""
            aria-hidden="true"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              padding: "2px",
            }}
          />
        </span>
      ) : item.flag ? (
        <span style={{ flexShrink: 0 }}>{item.flag}</span>
      ) : null}

      <span
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
  tone,
  disableItemLinks = false,
  personalItemIds,
}: {
  title: string;
  items: RankingItem[];
  maximum: number;
  itemHrefPrefix?: string;
  tone: RankingToneStyle;
  disableItemLinks?: boolean;
  personalItemIds: Array<string | number>;
}) {
  const personalIds = new Set(personalItemIds.map(String));

  return (
    <div
      style={{
        display: "grid",
        gap: "13px",
      }}
    >
      {items.map((item, index) => {
        const isPersonal = personalIds.has(String(item.id));
        const percentage =
          maximum > 0
            ? Math.max(
                5,
                (item.count / maximum) * 100
              )
            : 0;

        const href = disableItemLinks
          ? null
          : getItemHref(
              title,
              item,
              itemHrefPrefix
            );

        const nameStyle = {
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const,
          color:
            isPersonal
              ? tone.accent
              : index === 0
              ? "var(--taste-text)"
              : "var(--taste-text-soft)",
          fontSize: "12px",
          fontWeight: isPersonal ? 800 : index === 0 ? 700 : 550,
        };

        return (
          <div key={item.id}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "25px minmax(0,1fr) 20px auto",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  color:
                    index === 0
                      ? tone.accent
                      : "var(--taste-text-muted)",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {index + 1}.
              </div>

              {href ? (
                <Link
                  href={href}
                  title={item.name}
                  style={{
                    ...nameStyle,
                    textDecoration: "none",
                    width: "fit-content",
                    maxWidth: "100%",
                  }}
                >
                  <RankingItemLabel item={item} />
                </Link>
              ) : (
                <div title={item.name} style={nameStyle}>
                  <RankingItemLabel item={item} />
                </div>
              )}

              <span
                title={isPersonal ? "Máš ve své evidenci" : undefined}
                aria-label={isPersonal ? "Máš ve své evidenci" : undefined}
                aria-hidden={isPersonal ? undefined : true}
                style={{
                  color: tone.accent,
                  fontSize: "13px",
                  lineHeight: 1,
                  textAlign: "center",
                  filter: "saturate(0.88)",
                }}
              >
                {isPersonal ? "🍺" : ""}
              </span>

              <div
                style={{
                  color: tone.accent,
                  fontSize: "11px",
                  fontWeight: 750,
                }}
              >
                {item.count}×
              </div>
            </div>

            <div
              style={{
                marginLeft: "33px",
                height: "4px",
                overflow: "hidden",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.045)",
              }}
            >
              <div
                style={{
                  width: `${percentage}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background:
                    index === 0
                      ? tone.accent
                      : tone.bar,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
