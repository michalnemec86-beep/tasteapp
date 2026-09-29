import Link from "next/link";
import type { ReactNode } from "react";

import type { RankingItem } from "@/lib/stats";

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

type RankingCardSurface = {
  border: string;
  background: string;
  boxShadow: string;
};

const RANKING_CARD_SURFACES: Record<
  string,
  RankingCardSurface
> = {
  "Nejčastější pivovary": {
    border:
      "1px solid rgba(208,126,54,.40)",
    background:
      "radial-gradient(circle at 24% 0%, rgba(230,155,76,.13), transparent 42%), linear-gradient(0deg, #0b0806 0%, #120c08 48%, #472713 100%)",
    boxShadow:
      "0 8px 24px rgba(0,0,0,.28), 0 0 18px rgba(202,116,46,.10), inset 0 1px 0 rgba(255,212,142,.11)",
  },
  "Pivní styly": {
    border:
      "1px solid rgba(184,126,66,.38)",
    background:
      "radial-gradient(circle at 72% 0%, rgba(196,139,78,.11), transparent 44%), linear-gradient(0deg, #0b0806 0%, #120d09 50%, #3f2b19 100%)",
    boxShadow:
      "0 8px 24px rgba(0,0,0,.28), 0 0 17px rgba(171,109,54,.09), inset 0 1px 0 rgba(241,203,144,.10)",
  },
  "Způsob podání": {
    border:
      "1px solid rgba(198,105,43,.38)",
    background:
      "radial-gradient(circle at 35% 0%, rgba(219,127,55,.12), transparent 41%), linear-gradient(0deg, #0a0706 0%, #130c08 50%, #512716 100%)",
    boxShadow:
      "0 8px 24px rgba(0,0,0,.29), 0 0 18px rgba(194,89,34,.10), inset 0 1px 0 rgba(255,201,131,.10)",
  },
  "Nejčastější piva": {
    border:
      "1px solid rgba(220,151,66,.40)",
    background:
      "radial-gradient(circle at 64% 0%, rgba(238,176,83,.13), transparent 43%), linear-gradient(0deg, #0b0806 0%, #130e09 49%, #563316 100%)",
    boxShadow:
      "0 8px 24px rgba(0,0,0,.28), 0 0 19px rgba(223,145,55,.10), inset 0 1px 0 rgba(255,222,155,.12)",
  },
  "Státy": {
    border:
      "1px solid rgba(188,101,58,.38)",
    background:
      "radial-gradient(circle at 18% 0%, rgba(203,116,70,.12), transparent 43%), linear-gradient(0deg, #0a0807 0%, #120c09 50%, #47261b 100%)",
    boxShadow:
      "0 8px 24px rgba(0,0,0,.28), 0 0 18px rgba(174,83,47,.09), inset 0 1px 0 rgba(245,190,143,.10)",
  },
  "Značky": {
    border:
      "1px solid rgba(194,121,58,.39)",
    background:
      "radial-gradient(circle at 82% 0%, rgba(222,145,70,.11), transparent 42%), linear-gradient(0deg, #0b0806 0%, #130d09 49%, #4c2c17 100%)",
    boxShadow:
      "0 8px 24px rgba(0,0,0,.28), 0 0 18px rgba(194,112,44,.10), inset 0 1px 0 rgba(251,207,143,.10)",
  },
};

function getRankingCardSurface(
  title: string
): RankingCardSurface {
  return (
    RANKING_CARD_SURFACES[
      title
    ] ?? {
      border:
        "1px solid rgba(190,120,58,.34)",
      background:
        "linear-gradient(0deg, #0b0806 0%, #120d09 52%, #3f2918 100%)",
      boxShadow:
        "0 8px 24px rgba(0,0,0,.27), 0 0 16px rgba(181,109,49,.08), inset 0 1px 0 rgba(245,205,147,.08)",
    }
  );
}

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

  if (
    props.title ===
    "Nejčastější piva"
  ) {
    return (
      <BeerRankingCardView
        {...props}
      />
    );
  }

  if (
    props.title ===
    "Značky"
  ) {
    return (
      <BrandRankingCardView
        {...props}
      />
    );
  }

  if (
    props.title ===
    "Státy"
  ) {
    return (
      <CountryRankingCardView
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

      <PackagingRankingCardView
        items={props.packagingItems ?? []}
        accent="#e7a62f"
        getItemHref={(item) =>
          `/stats/packaging/${item.id}`
        }
      />
    </>
  );
}

function BeerRankingCardView({
  title,
  items,
  getItemHref,
  accent,
}: StatsRankingCardProps) {
  const topItems =
    items.slice(0, 5);

  const maximum =
    Math.max(
      1,
      ...topItems.map(
        (item) =>
          item.count
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
        borderRadius:
          "var(--taste-radius-lg)",
        ...getRankingCardSurface(
          title
        ),
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
          (item, index) => {
            const percentage =
              maximum > 0
                ? Math.max(
                    8,
                    (
                      item.count /
                      maximum
                    ) *
                      100
                  )
                : 0;

            const row = (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    width:
                      "24px",
                    height:
                      "24px",
                    flexShrink:
                      0,
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRadius:
                      "7px",
                    border:
                      "1px solid rgba(242,182,63,.28)",
                    background:
                      "linear-gradient(145deg, rgba(242,182,63,.13), rgba(71,40,20,.24))",
                    color:
                      "#f2b63f",
                    boxShadow:
                      "inset 0 1px rgba(255,235,190,.08), 0 2px 7px rgba(0,0,0,.22)",
                    fontSize:
                      "10.5px",
                    lineHeight:
                      1,
                    fontWeight:
                      850,
                    fontVariantNumeric:
                      "tabular-nums",
                  }}
                >
                  {index + 1}
                </span>

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
                      accent,
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
                    "grid",
                  gridTemplateColumns:
                    "24px minmax(0,auto) minmax(34px,1fr) auto",
                  alignItems:
                    "center",
                  gap:
                    "8px",
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
                    "grid",
                  gridTemplateColumns:
                    "24px minmax(0,auto) minmax(34px,1fr) auto",
                  alignItems:
                    "center",
                  gap:
                    "8px",
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
          href="/stats#piva"
          aria-label="Zobrazit všechna piva ve statistikách"
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

function BrandRankingCardView({
  title,
  items,
  getItemHref,
}: StatsRankingCardProps) {
  const topItems =
    items.slice(0, 5);

  const maximum =
    Math.max(
      1,
      ...topItems.map(
        (item) =>
          item.count
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
        borderRadius:
          "var(--taste-radius-lg)",
        ...getRankingCardSurface(
          title
        ),
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
                    (
                      item.count /
                      maximum
                    ) *
                      100
                  )
                : 0;

            const row = (
              <>
                <span
                  className="taste-brewery-logo-frame"
                  aria-hidden="true"
                  style={{
                    width:
                      "28px",
                    height:
                      "28px",
                    flexShrink:
                      0,
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
                      "1px solid rgba(235,174,75,.42)",
                    background:
                      item.logoUrl
                        ? "rgba(255,255,255,.94)"
                        : "rgba(255,255,255,.035)",
                    boxShadow:
                      "0 2px 7px rgba(0,0,0,.27), inset 0 0 0 1px rgba(255,255,255,.04)",
                    boxSizing:
                      "border-box",
                    padding:
                      "2px",
                  }}
                >
                  {item.logoUrl ? (
                    <img
                      src={
                        item.logoUrl
                      }
                      alt=""
                      style={{
                        display:
                          "block",
                        width:
                          "100%",
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
                    "grid",
                  gridTemplateColumns:
                    "28px minmax(0,auto) minmax(34px,1fr) auto",
                  alignItems:
                    "center",
                  gap:
                    "8px",
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
                    "grid",
                  gridTemplateColumns:
                    "28px minmax(0,auto) minmax(34px,1fr) auto",
                  alignItems:
                    "center",
                  gap:
                    "8px",
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
          href="/stats#znacky"
          aria-label="Zobrazit všechny značky ve statistikách"
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

function CountryRankingCardView({
  title,
  items,
  getItemHref,
}: StatsRankingCardProps) {
  const topItems =
    items.slice(0, 5);

  return (
    <section
      style={{
        position:
          "relative",
        overflow:
          "hidden",
        padding:
          "14px",
        borderRadius:
          "var(--taste-radius-lg)",
        ...getRankingCardSurface(
          title
        ),
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
            "9px",
          marginTop:
            "13px",
        }}
      >
        {topItems.map(
          (item) => {
            const row = (
              <>
                <span
                  aria-hidden="true"
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
                    overflow:
                      "hidden",
                    borderRadius:
                      "50%",
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
                      display:
                        "block",
                      fontSize:
                        "28px",
                      lineHeight:
                        1,
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
                  style={{
                    color:
                      "#fff",
                    fontSize:
                      "11px",
                    lineHeight:
                      1,
                    fontWeight:
                      750,
                    fontVariantNumeric:
                      "tabular-nums",
                    opacity:
                      .92,
                  }}
                >
                  {item.count}
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
                    "grid",
                  gridTemplateColumns:
                    "30px minmax(0,1fr) auto",
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
                    "grid",
                  gridTemplateColumns:
                    "30px minmax(0,1fr) auto",
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
          href="/stats#staty"
          aria-label="Zobrazit všechny státy ve statistikách"
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

function PackagingRankingCardView({
  items,
  accent,
  getItemHref,
}: {
  items: RankingItem[];
  accent: string;
  getItemHref?: (
    item: RankingItem
  ) => string;
}) {
  const title =
    "Způsob podání";

  const topItems =
    items
      .slice(0, 5)
      .sort((a, b) => {
        if (a.count !== b.count) {
          return a.count - b.count;
        }

        return a.name.localeCompare(
          b.name,
          "cs"
        );
      });

  const maximum =
    Math.max(
      1,
      ...topItems.map(
        (item) =>
          item.count
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
        borderRadius:
          "var(--taste-radius-lg)",
        ...getRankingCardSurface(
          title
        ),
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

      {topItems.length >
        0 && (
        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "minmax(92px, .78fr) minmax(150px, 1.22fr)",
            gap:
              "14px",
            alignItems:
              "stretch",
            marginTop:
              "13px",
          }}
        >
          <div
            style={{
              display:
                "grid",
              gap:
                "9px",
              alignContent:
                "center",
              minWidth:
                0,
            }}
          >
            {topItems.map(
              (item) => {
                const content = (
                  <span
                    style={{
                      display:
                        "grid",
                      gap:
                        "2px",
                      minWidth:
                        0,
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
                          "11.5px",
                        lineHeight:
                          1.18,
                        fontWeight:
                          700,
                      }}
                    >
                      {item.name}
                    </span>

                    <span
                      style={{
                        color:
                          accent,
                        fontSize:
                          "10px",
                        lineHeight:
                          1.2,
                        fontWeight:
                          800,
                        fontVariantNumeric:
                          "tabular-nums",
                      }}
                    >
                      {item.count}×
                    </span>
                  </span>
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
                      color:
                        "inherit",
                      textDecoration:
                        "none",
                      minWidth:
                        0,
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={
                      item.id
                    }
                    style={{
                      minWidth:
                        0,
                    }}
                  >
                    {content}
                  </div>
                );
              }
            )}
          </div>

          <div
            aria-label="Sloupcový graf způsobu podání"
            role="img"
            style={{
              position:
                "relative",
              minHeight:
                "142px",
              display:
                "grid",
              gridTemplateColumns:
                `repeat(${topItems.length}, minmax(0, 1fr))`,
              gap:
                "8px",
              alignItems:
                "end",
              padding:
                "12px 8px 2px 10px",
              borderLeft:
                "1px solid rgba(231,166,47,.16)",
              borderBottom:
                "1px solid rgba(231,166,47,.18)",
              background:
                "repeating-linear-gradient(180deg, rgba(255,255,255,.035) 0 1px, transparent 1px 34px)",
            }}
          >
            {topItems.map(
              (item) => {
                const height =
                  Math.max(
                    1.5,
                    (
                      item.count /
                      maximum
                    ) *
                      100
                  );

                const bar = (
                  <span
                    style={{
                      position:
                        "relative",
                      display:
                        "block",
                      width:
                        "24px",
                      maxWidth:
                        "68%",
                      height:
                        `${height}%`,
                      minHeight:
                        "2px",
                      overflow:
                        "hidden",
                      border:
                        "1px solid rgba(255,218,139,.28)",
                      borderRadius:
                        "7px 7px 3px 3px",
                      background:
                        "linear-gradient(180deg, #ffe6a4 0%, #f4bd4b 14%, #dc8b27 48%, #a65319 78%, #703315 100%)",
                      boxShadow:
                        "inset 1px 0 rgba(255,246,211,.35), inset -1px 0 rgba(84,39,13,.32), inset 0 -8px 14px rgba(68,27,10,.20), 0 0 12px rgba(231,166,47,.20), 0 6px 10px rgba(0,0,0,.28)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position:
                          "absolute",
                        left:
                          "12%",
                        right:
                          "12%",
                        top:
                          "2px",
                        height:
                          "28%",
                        borderRadius:
                          "6px 6px 50% 50%",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,.06))",
                        opacity:
                          .72,
                      }}
                    />

                    <span
                      aria-hidden="true"
                      style={{
                        position:
                          "absolute",
                        top:
                          "8%",
                        bottom:
                          "12%",
                        left:
                          "14%",
                        width:
                          "14%",
                        borderRadius:
                          "999px",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,0))",
                        opacity:
                          .48,
                      }}
                    />
                  </span>
                );

                return (
                  <span
                    key={
                      item.id
                    }
                    title={
                      `${item.name}: ${item.count}×`
                    }
                    style={{
                      height:
                        "100%",
                      display:
                        "flex",
                      alignItems:
                        "flex-end",
                      justifyContent:
                        "center",
                      minWidth:
                        0,
                    }}
                  >
                    {getItemHref ? (
                      <Link
                        href={
                          getItemHref(
                            item
                          )
                        }
                        aria-label={
                          `${item.name}: ${item.count}×`
                        }
                        style={{
                          width:
                            "100%",
                          height:
                            "100%",
                          display:
                            "flex",
                          alignItems:
                            "flex-end",
                          justifyContent:
                            "center",
                          textDecoration:
                            "none",
                        }}
                      >
                        {bar}
                      </Link>
                    ) : (
                      bar
                    )}
                  </span>
                );
              }
            )}
          </div>
        </div>
      )}

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
          href="/stats"
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
        borderRadius:
          "var(--taste-radius-lg)",
        ...getRankingCardSurface(
          title
        ),
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
        borderRadius:
          "var(--taste-radius-lg)",
        ...getRankingCardSurface(
          title
        ),
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

