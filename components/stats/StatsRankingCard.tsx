import Link from "next/link";
import type { ReactNode } from "react";

import type { RankingItem } from "@/lib/stats";
import AppIcon from "@/components/ui/AppIcon";

type StatsRankingCardProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
  items: RankingItem[];
  packagingItems?: RankingItem[];
  getItemHref?: (
    item: RankingItem
  ) => string;
};

export default function StatsRankingCard(
  props: StatsRankingCardProps
) {
  if (
    props.title ===
    "Nejčastější pivovary"
  ) {
    return (
      <BreweryRankingCardView
        {...props}
      />
    );
  }

  if (props.title !== "Pivní styly") {
    return <RankingCardView {...props} />;
  }

  return (
    <>
      <BeerStyleRankingCardView
        {...props}
      />

      <RankingCardView
        title="Způsob podání"
        subtitle="Čepované, lahvové a plechovky"
        icon={<AppIcon name="package" size={20} />}
        accent="#b77a36"
        items={props.packagingItems ?? []}
        getItemHref={(item) =>
          `/stats/packaging/${item.id}`
        }
      />
    </>
  );
}

function getBeerGlassKind(
  styleName: string
) {
  const normalized =
    styleName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  if (
    normalized.includes("pils") ||
    normalized.includes("lezak") ||
    normalized.includes("lager")
  ) {
    return "pilsner";
  }

  if (
    normalized.includes("ipa") ||
    normalized.includes("pale ale") ||
    normalized.includes("apa")
  ) {
    return "tulip";
  }

  if (
    normalized.includes("stout") ||
    normalized.includes("porter")
  ) {
    return "pint";
  }

  if (
    normalized.includes("weizen") ||
    normalized.includes("wheat") ||
    normalized.includes("psenic")
  ) {
    return "weizen";
  }

  if (
    normalized.includes("sour") ||
    normalized.includes("lambic") ||
    normalized.includes("gose") ||
    normalized.includes("belg")
  ) {
    return "goblet";
  }

  return "snifter";
}

function BeerStyleGlassIcon({
  styleName,
}: {
  styleName: string;
}) {
  const kind =
    getBeerGlassKind(
      styleName
    );

  const common = {
    width: 24,
    height: 24,
    viewBox:
      "0 0 24 24",
    fill: "none",
    stroke:
      "currentColor",
    strokeWidth: 1.55,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
    "aria-hidden":
      true as const,
  };

  if (kind === "pilsner") {
    return (
      <svg {...common}>
        <path d="M8 3h8l-1.1 15.5A2.7 2.7 0 0 1 12.2 21h-.4a2.7 2.7 0 0 1-2.7-2.5L8 3Z" />
        <path d="M9.3 8.2h5.4" />
        <path d="M9 5.5h6" />
      </svg>
    );
  }

  if (kind === "tulip") {
    return (
      <svg {...common}>
        <path d="M7.7 3.5h8.6c.2 2.7-.3 5-1.4 6.5-.8 1.1-1.8 1.7-2.9 1.7s-2.1-.6-2.9-1.7c-1.1-1.5-1.6-3.8-1.4-6.5Z" />
        <path d="M12 11.7v5.5" />
        <path d="M9.2 20.5h5.6" />
        <path d="M10.2 17.2h3.6" />
      </svg>
    );
  }

  if (kind === "pint") {
    return (
      <svg {...common}>
        <path d="M7.4 3.5h9.2l-.8 15.1A2.6 2.6 0 0 1 13.2 21h-2.4a2.6 2.6 0 0 1-2.6-2.4L7.4 3.5Z" />
        <path d="M8.1 8.7h7.8" />
        <path d="M8.5 14.5h7" />
      </svg>
    );
  }

  if (kind === "weizen") {
    return (
      <svg {...common}>
        <path d="M8.6 3h6.8l.8 4.5-.9 10.8A2.8 2.8 0 0 1 12.5 21h-1A2.8 2.8 0 0 1 8.7 18.3L7.8 7.5 8.6 3Z" />
        <path d="M8.2 7.5h7.6" />
        <path d="M9.1 14.5h5.8" />
      </svg>
    );
  }

  if (kind === "goblet") {
    return (
      <svg {...common}>
        <path d="M6.8 4h10.4c-.1 4.9-2 7.7-5.2 7.7S6.9 8.9 6.8 4Z" />
        <path d="M12 11.7v5.2" />
        <path d="M8.8 20.5h6.4" />
        <path d="M9.7 16.9h4.6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M7 4h10c-.4 4.1-1.7 6.5-5 7.5-3.3-1-4.6-3.4-5-7.5Z" />
      <path d="M12 11.5v5.2" />
      <path d="M9 20.5h6" />
      <path d="M10 16.7h4" />
    </svg>
  );
}

function BeerStyleRankingCardView({
  title,
  items,
  getItemHref,
  accent,
}: StatsRankingCardProps) {
  const topItems =
    items.slice(0, 5);

  const maximum =
    topItems[0]?.count ??
    1;

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
      <h3
        style={{
          margin: 0,
          color:
            "var(--taste-amber-bright)",
          fontSize:
            "14px",
          lineHeight:
            1.15,
          fontWeight:
            800,
          letterSpacing:
            "0.01em",
        }}
      >
        {title}
      </h3>

      {topItems.length ===
        0 && (
        <div
          style={{
            padding:
              "18px 0 8px",
            color:
              "#fff",
            fontSize:
              "11px",
          }}
        >
          Zatím nejsou žádná data.
        </div>
      )}

      <div
        style={{
          display:
            "grid",
          gap:
            "11px",
          marginTop:
            "13px",
        }}
      >
        {topItems.map(
          (item) => {
            const percentage =
              maximum > 0
                ? Math.max(
                    8,
                    (item.count /
                      maximum) *
                      100
                  )
                : 0;

            const row = (
              <>
                <span
                  style={{
                    width:
                      "30px",
                    height:
                      "30px",
                    flexShrink:
                      0,
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRadius:
                      "8px",
                    color:
                      "#f2b63f",
                    background:
                      "linear-gradient(145deg, rgba(242,182,63,.12), rgba(78,45,20,.18))",
                    border:
                      "1px solid rgba(242,182,63,.20)",
                    boxShadow:
                      "inset 0 1px rgba(255,235,190,.08), 0 3px 9px rgba(0,0,0,.18)",
                  }}
                >
                  <BeerStyleGlassIcon
                    styleName={
                      item.name
                    }
                  />
                </span>

                <span
                  style={{
                    minWidth:
                      0,
                    flex: 1,
                    display:
                      "grid",
                    gridTemplateColumns:
                      "minmax(0,auto) minmax(34px,1fr) auto",
                    alignItems:
                      "center",
                    gap:
                      "8px",
                  }}
                >
                  <span
                    title={
                      item.name
                    }
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
                        "12px",
                      lineHeight:
                        1.2,
                      fontWeight:
                        700,
                    }}
                  >
                    {item.name}
                  </span>

                  <span
                    aria-hidden="true"
                    style={{
                      position:
                        "relative",
                      height:
                        "4px",
                      minWidth:
                        "34px",
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
                    style={{
                      color:
                        "#f2b63f",
                      fontSize:
                        "11px",
                      lineHeight:
                        1,
                      fontWeight:
                        800,
                      fontVariantNumeric:
                        "tabular-nums",
                    }}
                  >
                    {item.count}
                  </span>
                </span>
              </>
            );

            return getItemHref ? (
              <Link
                key={
                  item.id
                }
                href={
                  getItemHref(
                    item
                  )
                }
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "9px",
                  minWidth:
                    0,
                  color:
                    "inherit",
                  textDecoration:
                    "none",
                }}
              >
                {row}
              </Link>
            ) : (
              <div
                key={
                  item.id
                }
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "9px",
                  minWidth:
                    0,
                }}
              >
                {row}
              </div>
            );
          }
        )}
      </div>

      <div
        style={{
          marginTop:
            "14px",
          paddingTop:
            "9px",
          borderTop:
            "1px solid rgba(231,166,47,0.11)",
        }}
      >
        <Link
          href="/stats#styly"
          aria-label="Zobrazit všechny pivní styly ve statistikách"
          style={{
            color:
              "#fff",
            textDecoration:
              "none",
            fontSize:
              "10.5px",
            fontWeight:
              650,
          }}
        >
          Zobrazit všechny
        </Link>
      </div>
    </section>
  );
}

function BreweryRankingCardView({
  title,
  items,
  getItemHref,
}: StatsRankingCardProps) {
  const topItems =
    items.slice(0, 5);

  const tastingLabel = (
    count: number
  ) => {
    if (count === 1) {
      return "1 ochutnávka";
    }

    if (
      count >= 2 &&
      count <= 4
    ) {
      return `${count} ochutnávky`;
    }

    return `${count} ochutnávek`;
  };

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
      <h3
        style={{
          margin: 0,
          color:
            "var(--taste-amber-bright)",
          fontSize: "14px",
          lineHeight: 1.15,
          fontWeight: 800,
          letterSpacing:
            "0.01em",
        }}
      >
        {title}
      </h3>

      {topItems.length ===
        0 && (
        <div
          style={{
            padding:
              "18px 0 8px",
            color: "#fff",
            fontSize: "11px",
          }}
        >
          Zatím nejsou žádná data.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: "10px",
          marginTop: "13px",
        }}
      >
        {topItems.map(
          (item) => {
            const content = (
              <>
                <span
                  className="taste-brewery-logo-frame"
                  style={{
                    width: "42px",
                    height: "42px",
                    flexShrink: 0,
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    overflow:
                      "hidden",
                    borderRadius:
                      "50%",
                    border:
                      "1px solid rgba(235,174,75,.45)",
                    background:
                      item.logoUrl
                        ? "rgba(255,255,255,.94)"
                        : "rgba(255,255,255,.035)",
                    boxShadow:
                      "0 3px 10px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.04)",
                    boxSizing:
                      "border-box",
                    // Přepisuje globální procentní padding logových dlaždic.
                    // U malého kruhu by 7 % rodiče prakticky sežralo celý obsah.
                    padding: "3px",
                  }}
                >
                  {item.logoUrl ? (
                    <img
                      src={
                        item.logoUrl
                      }
                      alt=""
                      aria-hidden="true"
                      style={{
                        display:
                          "block",
                        width: "100%",
                        height:
                          "100%",
                        minWidth: 0,
                        minHeight: 0,
                        maxWidth:
                          "100%",
                        maxHeight:
                          "100%",
                        objectFit:
                          "contain",
                        borderRadius:
                          "50%",
                      }}
                    />
                  ) : null}
                </span>

                <span
                  style={{
                    minWidth: 0,
                    display:
                      "grid",
                    gap: "2px",
                  }}
                >
                  <span
                    title={
                      item.name
                    }
                    style={{
                      overflow:
                        "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                      color:
                        "#fff",
                      fontSize:
                        "13px",
                      lineHeight:
                        1.2,
                      fontWeight:
                        750,
                    }}
                  >
                    {item.name}
                  </span>

                  <span
                    style={{
                      color:
                        "#fff",
                      fontSize:
                        "10.5px",
                      lineHeight:
                        1.25,
                      fontWeight:
                        500,
                      opacity:
                        0.82,
                    }}
                  >
                    {tastingLabel(
                      item.count
                    )}
                  </span>
                </span>
              </>
            );

            return getItemHref ? (
              <Link
                key={item.id}
                href={getItemHref(
                  item
                )}
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  minWidth: 0,
                  color:
                    "inherit",
                  textDecoration:
                    "none",
                }}
              >
                {content}
              </Link>
            ) : (
              <div
                key={item.id}
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  minWidth: 0,
                }}
              >
                {content}
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
          href="/stats#pivovary"
          aria-label="Zobrazit všechny pivovary ve statistikách"
          style={{
            color: "#fff",
            textDecoration:
              "none",
            fontSize: "10.5px",
            fontWeight: 650,
          }}
        >
          Zobrazit všechny
        </Link>
      </div>
    </section>
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
        gap: "6px",
      }}
    >
      {item.logoUrl ? (
        <span
          className="taste-brewery-logo-frame"
          style={{
            width: "22px",
            height: "16px",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",

          }}
        >
          <img
            src={item.logoUrl}
            alt=""
            aria-hidden="true"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
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

function RankingCardView({
  title,
  subtitle,
  icon,
  accent,
  items,
  getItemHref,
}: StatsRankingCardProps) {
  const topItems = items.slice(0, 5);
  const maximum = topItems[0]?.count ?? 1;

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "14px",
        border: "1px solid var(--taste-border)",
        borderRadius: "var(--taste-radius-lg)",
        background: `
          linear-gradient(
            145deg,
            rgba(231,166,47,0.035),
            transparent 42%
          ),
          var(--taste-surface)
        `,
        boxShadow: "var(--taste-shadow-soft)",
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
            border: `1px solid ${accent}30`,
            background: `${accent}12`,
            fontSize: "15px",
          }}
        >
          {icon}
        </div>

        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              color: "var(--taste-text)",
              fontSize: "14px",
              lineHeight: 1.15,
              fontWeight: 750,
              letterSpacing: "-0.015em",
            }}
          >
            {title}
          </h3>

          <div
            style={{
              marginTop: "2px",
              color: "var(--taste-text-muted)",
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
            padding: "16px 2px 8px",
            color: "var(--taste-text-muted)",
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
        {topItems.map((item, index) => {
          const percentage =
            maximum > 0
              ? Math.max(
                  7,
                  (item.count / maximum) * 100
                )
              : 0;

          const isFirst = index === 0;

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
                    justifyContent: "center",
                    borderRadius: "7px",
                    border: isFirst
                      ? `1px solid ${accent}45`
                      : "1px solid rgba(255,255,255,0.045)",
                    background: isFirst
                      ? `${accent}12`
                      : "rgba(255,255,255,0.018)",
                    color: isFirst
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
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: isFirst
                      ? "var(--taste-text)"
                      : "var(--taste-text-soft)",
                    fontSize: "11px",
                    fontWeight: isFirst ? 700 : 600,
                  }}
                >
                  {getItemHref ? (
                    <Link
                      href={getItemHref(item)}
                      style={{
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      <RankingItemLabel item={item} />
                    </Link>
                  ) : (
                    <>
                      <RankingItemLabel item={item} />
                    </>
                  )}
                </div>

                <div
                  style={{
                    color: isFirst
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
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.045)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${percentage}%`,
                    borderRadius: "999px",
                    background: isFirst
                      ? `linear-gradient(
                          90deg,
                          ${accent},
                          ${accent}aa
                        )`
                      : `${accent}85`,
                    boxShadow: isFirst
                      ? `0 0 8px ${accent}35`
                      : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "14px",
          paddingTop: "9px",
          borderTop: "1px solid rgba(231,166,47,0.11)",
        }}
      >
        <Link
          href="/stats"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            color: "var(--taste-text-muted)",
            textDecoration: "none",
            fontSize: "10px",
            fontWeight: 650,
          }}
        >
          <span>Kompletní statistiky</span>

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

