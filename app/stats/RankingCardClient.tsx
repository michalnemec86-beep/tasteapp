"use client";

import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

type RankingItem = {
  id: string | number;
  name: string;
  count: number;
};

type RankingCardClientProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  items: RankingItem[];
  itemHrefPrefix?: string;
};

const PREVIEW_LIMIT = 10;

export default function RankingCardClient({
  title,
  subtitle,
  icon,
  items,
  itemHrefPrefix,
}: RankingCardClientProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const maximum =
    items.length > 0
      ? Math.max(
          ...items.map(
            (item) => item.count
          )
        )
      : 1;

  const previewItems =
    items.slice(
      0,
      PREVIEW_LIMIT
    );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen]);

  return (
    <>
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "20px",
          border:
            "1px solid var(--taste-border)",
          borderRadius:
            "var(--taste-radius-lg)",
          background: `
            radial-gradient(
              circle at 100% 0%,
              rgba(231,166,47,0.055),
              transparent 13rem
            ),
            var(--taste-surface)
          `,
          boxShadow:
            "var(--taste-shadow-soft)",
        }}
      >
        <RankingHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
        />

        {items.length === 0 ? (
          <div
            style={{
              padding: "18px 0",
              color:
                "var(--taste-text-muted)",
              fontSize: "12px",
            }}
          >
            Zatím nejsou žádná data.
          </div>
        ) : (
          <RankingList
            items={previewItems}
            maximum={maximum}
            itemHrefPrefix={
              itemHrefPrefix
            }
          />
        )}

        {items.length >
        0 ? (
          <button
            type="button"
            onClick={() =>
              setIsOpen(true)
            }
            style={{
              width: "100%",
              marginTop: "18px",
              padding: "11px 13px",
              border:
                "1px solid rgba(231,166,47,0.18)",
              borderRadius: "10px",
              background:
                "rgba(231,166,47,0.055)",
              color:
                "var(--taste-amber-bright)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Zobrazit celý žebříček
            <span
              style={{
                marginLeft: "7px",
                color:
                  "var(--taste-text-muted)",
                fontWeight: 550,
              }}
            >
              · {items.length} položek
            </span>
          </button>
        ) : (
          items.length > 0 && (
            <div
              style={{
                marginTop: "18px",
                paddingTop: "11px",
                borderTop:
                  "1px solid rgba(231,166,47,0.08)",
                color:
                  "var(--taste-text-muted)",
                fontSize: "9px",
              }}
            >
              Celkem položek:{" "}
              {items.length}
            </div>
          )
        )}
      </section>

      {isOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} – celý žebříček`}
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setIsOpen(false);
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 4000,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              padding: "18px",
              background:
                "rgba(8,5,3,0.82)",
              backdropFilter:
                "blur(8px)",
            }}
          >
            <section
              style={{
                width:
                  "min(760px, 100%)",
                maxHeight:
                  "calc(100vh - 36px)",
                display: "flex",
                flexDirection:
                  "column",
                overflow: "hidden",
                border:
                  "1px solid rgba(231,166,47,0.24)",
                borderRadius:
                  "var(--taste-radius-xl)",
                background:
                  "var(--taste-surface)",
                boxShadow:
                  "0 24px 80px rgba(0,0,0,0.55)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  gap: "18px",
                  padding:
                    "22px 24px 18px",
                  borderBottom:
                    "1px solid rgba(231,166,47,0.10)",
                }}
              >
                <RankingHeader
                  title={title}
                  subtitle={`${subtitle} · ${items.length} položek`}
                  icon={icon}
                />

                <button
                  type="button"
                  onClick={() =>
                    setIsOpen(false)
                  }
                  aria-label="Zavřít"
                  style={{
                    width: "34px",
                    height: "34px",
                    flexShrink: 0,
                    border:
                      "1px solid var(--taste-border)",
                    borderRadius:
                      "10px",
                    background:
                      "rgba(255,255,255,0.025)",
                    color:
                      "var(--taste-text-soft)",
                    fontSize: "20px",
                    lineHeight: 1,
                    cursor:
                      "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  overflowY: "auto",
                  padding:
                    "20px 24px 26px",
                }}
              >
                <RankingList
                  items={items}
                  maximum={maximum}
                  itemHrefPrefix={
                    itemHrefPrefix
                  }
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
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
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
            alignItems:
              "center",
            justifyContent:
              "center",
            flexShrink: 0,
            border:
              "1px solid rgba(231,166,47,0.18)",
            borderRadius: "10px",
            background:
              "rgba(231,166,47,0.055)",
            color:
              "var(--taste-amber-bright)",
            fontSize: "15px",
          }}
        >
          {icon}
        </div>

        <h3
          style={{
            margin: 0,
            color:
              "var(--taste-text)",
            fontSize: "17px",
            fontWeight: 750,
            letterSpacing:
              "-0.015em",
          }}
        >
          {title}
        </h3>
      </div>

      <div
        style={{
          marginLeft: "44px",
          marginBottom: "18px",
          color:
            "var(--taste-text-muted)",
          fontSize: "10px",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function RankingList({
  items,
  maximum,
  itemHrefPrefix,
}: {
  items: RankingItem[];
  maximum: number;
  itemHrefPrefix?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: "13px",
      }}
    >
      {items.map(
        (item, index) => {
          const percentage =
            maximum > 0
              ? Math.max(
                  5,
                  (item.count /
                    maximum) *
                    100
                )
              : 0;

          const href =
            itemHrefPrefix
              ? `${itemHrefPrefix}/${item.id}`
              : null;

          const nameStyle = {
            minWidth: 0,
            overflow: "hidden",
            textOverflow:
              "ellipsis",
            whiteSpace:
              "nowrap" as const,
            color:
              index === 0
                ? "var(--taste-text)"
                : "var(--taste-text-soft)",
            fontSize: "12px",
            fontWeight:
              index === 0
                ? 700
                : 550,
          };

          return (
            <div key={item.id}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "25px minmax(0,1fr) auto",
                  alignItems:
                    "center",
                  gap: "8px",
                  marginBottom:
                    "6px",
                }}
              >
                <div
                  style={{
                    color:
                      index === 0
                        ? "var(--taste-amber)"
                        : "var(--taste-text-muted)",
                    fontSize:
                      "10px",
                    fontWeight:
                      700,
                  }}
                >
                  {index + 1}.
                </div>

                {href ? (
                  <Link
                    href={href}
                    title={
                      item.name
                    }
                    style={{
                      ...nameStyle,
                      textDecoration:
                        "none",
                    }}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <div
                    title={
                      item.name
                    }
                    style={
                      nameStyle
                    }
                  >
                    {item.name}
                  </div>
                )}

                <div
                  style={{
                    color:
                      "var(--taste-amber-bright)",
                    fontSize:
                      "11px",
                    fontWeight:
                      750,
                  }}
                >
                  {item.count}×
                </div>
              </div>

              <div
                style={{
                  marginLeft:
                    "33px",
                  height: "4px",
                  overflow:
                    "hidden",
                  borderRadius:
                    "999px",
                  background:
                    "rgba(255,255,255,0.045)",
                }}
              >
                <div
                  style={{
                    width: `${percentage}%`,
                    height: "100%",
                    borderRadius:
                      "999px",
                    background:
                      index === 0
                        ? "var(--taste-amber-bright)"
                        : "rgba(231,166,47,0.62)",
                  }}
                />
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
