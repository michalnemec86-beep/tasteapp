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

  const id =
    `beer-style-${kind}`;

  const beerPalette = {
    pilsner: [
      "#ffe99b",
      "#e8a82e",
      "#a45b13",
    ],
    tulip: [
      "#ffd36a",
      "#d9791b",
      "#7a3412",
    ],
    pint: [
      "#8d4a21",
      "#3a1b13",
      "#160d0b",
    ],
    weizen: [
      "#ffe59a",
      "#e7a33a",
      "#b3631f",
    ],
    goblet: [
      "#ffd977",
      "#d88722",
      "#8e4314",
    ],
    snifter: [
      "#ffc65a",
      "#c96918",
      "#6c2e12",
    ],
  }[kind];

  const foamTop =
    kind === "pint"
      ? "#ead1ae"
      : "#fff6dc";

  const foamBottom =
    kind === "pint"
      ? "#b9875d"
      : "#e9d5a7";

  const common = {
    width: 30,
    height: 30,
    viewBox:
      "0 0 48 48",
    fill: "none",
    "aria-hidden":
      true as const,
    style: {
      filter:
        "drop-shadow(0 2px 2px rgba(0,0,0,.58))",
    },
  };

  const defs = (
    <defs>
      <linearGradient
        id={`${id}-beer`}
        x1="13"
        y1="8"
        x2="34"
        y2="42"
        gradientUnits="userSpaceOnUse"
      >
        <stop
          stopColor={
            beerPalette[0]
          }
        />
        <stop
          offset=".48"
          stopColor={
            beerPalette[1]
          }
        />
        <stop
          offset="1"
          stopColor={
            beerPalette[2]
          }
        />
      </linearGradient>

      <linearGradient
        id={`${id}-glass`}
        x1="10"
        y1="5"
        x2="37"
        y2="43"
        gradientUnits="userSpaceOnUse"
      >
        <stop
          stopColor="#fff4cf"
          stopOpacity=".92"
        />
        <stop
          offset=".28"
          stopColor="#d7b278"
          stopOpacity=".58"
        />
        <stop
          offset=".7"
          stopColor="#a86b32"
          stopOpacity=".54"
        />
        <stop
          offset="1"
          stopColor="#5f321c"
          stopOpacity=".9"
        />
      </linearGradient>

      <linearGradient
        id={`${id}-foam`}
        x1="14"
        y1="8"
        x2="31"
        y2="18"
        gradientUnits="userSpaceOnUse"
      >
        <stop
          stopColor={
            foamTop
          }
        />
        <stop
          offset="1"
          stopColor={
            foamBottom
          }
        />
      </linearGradient>

      <linearGradient
        id={`${id}-shine`}
        x1="0"
        y1="0"
        x2="1"
        y2="0"
      >
        <stop
          stopColor="white"
          stopOpacity=".82"
        />
        <stop
          offset="1"
          stopColor="white"
          stopOpacity="0"
        />
      </linearGradient>
    </defs>
  );

  if (kind === "pilsner") {
    return (
      <svg {...common}>
        {defs}
        <path
          d="M14 7h20l-2.7 33.2A4 4 0 0 1 27.3 44h-6.6a4 4 0 0 1-4-3.8L14 7Z"
          fill={`url(#${id}-beer)`}
          stroke={`url(#${id}-glass)`}
          strokeWidth="1.7"
        />
        <path
          d="M14.6 11c1.2-3.1 4.4-4.8 7.2-3.3 2.2-2.3 6.3-1.3 7 1 3.1-.6 5.4.7 5.6 3.1-3.4 1.7-15.9 1.8-19.8-.8Z"
          fill={`url(#${id}-foam)`}
          stroke="#f5e7c9"
          strokeWidth=".8"
        />
        <path
          d="M18 15.5 20.1 38"
          stroke={`url(#${id}-shine)`}
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity=".72"
        />
        <circle cx="27.5" cy="25" r="1" fill="#ffe8a1" opacity=".8" />
        <circle cx="24.5" cy="31" r=".7" fill="#fff3c6" opacity=".7" />
        <circle cx="29.2" cy="35" r=".6" fill="#ffe7a0" opacity=".66" />
      </svg>
    );
  }

  if (kind === "tulip") {
    return (
      <svg {...common}>
        {defs}
        <path
          d="M12.5 8.5h23c.2 7.8-2 14.2-6.6 17.1-1.6 1-3.2 1.5-4.9 1.5s-3.3-.5-4.9-1.5c-4.6-2.9-6.8-9.3-6.6-17.1Z"
          fill={`url(#${id}-beer)`}
          stroke={`url(#${id}-glass)`}
          strokeWidth="1.7"
        />
        <path
          d="M13.3 12c1.7-3.7 4.4-4.7 7.2-3.1 2.5-2.4 6-1.7 7.4.7 3-.9 5.7.5 6.5 2.7-4.1 1.9-16.7 2-21.1-.3Z"
          fill={`url(#${id}-foam)`}
          stroke="#f5e7c9"
          strokeWidth=".8"
        />
        <path
          d="M24 27.1v10"
          stroke={`url(#${id}-glass)`}
          strokeWidth="2"
        />
        <path
          d="M17.8 42h12.4M20.5 37.2h7"
          stroke={`url(#${id}-glass)`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M17.2 14.2c.7 5.8 2.2 8.6 4.4 10.1"
          stroke={`url(#${id}-shine)`}
          strokeWidth="2"
          strokeLinecap="round"
          opacity=".65"
        />
        <circle cx="28" cy="18.5" r=".9" fill="#ffe49a" opacity=".75" />
        <circle cx="25.8" cy="22.4" r=".6" fill="#fff1bd" opacity=".7" />
      </svg>
    );
  }

  if (kind === "pint") {
    return (
      <svg {...common}>
        {defs}
        <path
          d="M11.5 7.5h25l-2.1 31.2A5 5 0 0 1 29.4 43h-10.8a5 5 0 0 1-5-4.3L11.5 7.5Z"
          fill={`url(#${id}-beer)`}
          stroke={`url(#${id}-glass)`}
          strokeWidth="1.8"
        />
        <path
          d="M12 12c1.3-3.4 4.2-4.5 7.2-2.8 2.4-2.8 6.5-1.7 7.4.7 3-1.3 7 .3 9 2.8-4.7 2-18.8 2-23.6-.7Z"
          fill={`url(#${id}-foam)`}
          stroke="#d7b38d"
          strokeWidth=".9"
        />
        <path
          d="M15.8 17.2 18 36.5"
          stroke={`url(#${id}-shine)`}
          strokeWidth="2.3"
          strokeLinecap="round"
          opacity=".52"
        />
        <path
          d="M14.5 28.5h19"
          stroke="#a86937"
          strokeWidth=".75"
          opacity=".45"
        />
      </svg>
    );
  }

  if (kind === "weizen") {
    return (
      <svg {...common}>
        {defs}
        <path
          d="M16 6.5h16l2 8-1.5 24.1A5 5 0 0 1 27.5 43h-7a5 5 0 0 1-5-4.4L14 14.5l2-8Z"
          fill={`url(#${id}-beer)`}
          stroke={`url(#${id}-glass)`}
          strokeWidth="1.8"
        />
        <path
          d="M15.8 11.5c1.5-3.5 4.6-4.7 7.4-2.8 2.2-2.5 6.2-1.5 7.2.8 2.7-.7 4.8.9 4.4 3.1-4.6 1.7-14.8 1.8-19-.1Z"
          fill={`url(#${id}-foam)`}
          stroke="#f5e6c5"
          strokeWidth=".8"
        />
        <path
          d="M19 15.5 20.8 38"
          stroke={`url(#${id}-shine)`}
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity=".68"
        />
        <circle cx="27.7" cy="22" r=".8" fill="#fff2ba" opacity=".75" />
        <circle cx="25.5" cy="28.5" r=".7" fill="#fff3c4" opacity=".72" />
        <circle cx="29" cy="34" r=".55" fill="#ffe6a1" opacity=".7" />
      </svg>
    );
  }

  if (kind === "goblet") {
    return (
      <svg {...common}>
        {defs}
        <path
          d="M10.5 8h27c-.3 9.5-5.2 16.8-13.5 16.8S10.8 17.5 10.5 8Z"
          fill={`url(#${id}-beer)`}
          stroke={`url(#${id}-glass)`}
          strokeWidth="1.8"
        />
        <path
          d="M11.2 12.2c1.6-3.4 4.3-4.4 7.3-2.8 2.4-2.4 6.2-1.7 7.5.6 3.4-1 7.7.5 9.8 2.6-5.5 2.3-19.4 2.3-24.6-.4Z"
          fill={`url(#${id}-foam)`}
          stroke="#f1dfba"
          strokeWidth=".8"
        />
        <path
          d="M24 24.8v11.4"
          stroke={`url(#${id}-glass)`}
          strokeWidth="2"
        />
        <path
          d="M16.5 42h15M20 36.4h8"
          stroke={`url(#${id}-glass)`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M15.2 13.8c.7 4.5 2.1 7 4.2 8.5"
          stroke={`url(#${id}-shine)`}
          strokeWidth="2"
          strokeLinecap="round"
          opacity=".62"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      {defs}
      <path
        d="M11.5 9h25c-.4 8.6-4.5 14.7-12.5 17-8-2.3-12.1-8.4-12.5-17Z"
        fill={`url(#${id}-beer)`}
        stroke={`url(#${id}-glass)`}
        strokeWidth="1.8"
      />
      <path
        d="M12.4 13c1.6-3.4 4.6-4.2 7.2-2.7 2.4-2.2 5.9-1.7 7.2.4 3.2-1 6.5.5 8.5 2.6-5.2 2-18.2 2-22.9-.3Z"
        fill={`url(#${id}-foam)`}
        stroke="#f0dfbc"
        strokeWidth=".8"
      />
      <path
        d="M24 26v10.2"
        stroke={`url(#${id}-glass)`}
        strokeWidth="2"
      />
      <path
        d="M17 42h14M20 36.5h8"
        stroke={`url(#${id}-glass)`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.3 14.2c.7 4.2 2.1 7 4.1 8.7"
        stroke={`url(#${id}-shine)`}
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".64"
      />
      <circle cx="28.2" cy="18.4" r=".8" fill="#ffe8a4" opacity=".72" />
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
                    borderRadius:
                      "9px",
                    color:
                      "#f2b63f",
                    background:
                      "radial-gradient(circle at 35% 24%, rgba(255,220,148,.13), transparent 52%), linear-gradient(145deg, rgba(242,182,63,.10), rgba(62,35,18,.24))",
                    border:
                      "1px solid rgba(242,182,63,.24)",
                    boxShadow:
                      "inset 0 1px rgba(255,235,190,.11), inset 0 -7px 12px rgba(35,18,9,.18), 0 3px 9px rgba(0,0,0,.24)",
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

