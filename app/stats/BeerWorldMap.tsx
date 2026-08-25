"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import dynamic from "next/dynamic";

import type {
  CountryContext,
  Data,
  ISOCode,
} from "react-svg-worldmap";

const WorldMap = dynamic(
  () =>
    import("react-svg-worldmap").then(
      (module) => module.default
    ),
  {
    ssr: false,
  }
);

import countries from "i18n-iso-countries";
import csLocale from "i18n-iso-countries/langs/cs.json";

countries.registerLocale(
  csLocale
);

type CountryRankingItem = {
  id: string | number;
  name: string;
  count: number;
};

type BeerWorldMapProps = {
  items: CountryRankingItem[];
};

// ==================================================
// ALIASY ZEMÍ
// ==================================================

const COUNTRY_ALIASES: Record<
  string,
  string
> = {
  cesko: "CZ",
  "ceska republika": "CZ",

  usa: "US",
  "spojene staty": "US",
  "spojene staty americke":
    "US",

  "velka britanie": "GB",
  britanie: "GB",
  anglie: "GB",

  "jizni korea": "KR",
  "korejska republika": "KR",

  "severni korea": "KP",

  rusko: "RU",

  vietnam: "VN",
};

// ==================================================
// NORMALIZACE
// ==================================================

function normalizeCountryName(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

// ==================================================
// KÓD ZEMĚ
// ==================================================

function getCountryCode(
  countryName: string
) {
  const normalized =
    normalizeCountryName(
      countryName
    );

  const alias =
    COUNTRY_ALIASES[
      normalized
    ];

  if (alias) {
    return alias;
  }

  return (
    countries.getAlpha2Code(
      countryName,
      "cs"
    ) ??
    countries.getSimpleAlpha2Code(
      countryName,
      "cs"
    )
  );
}

// ==================================================
// KOMPONENTA
// ==================================================

export default function BeerWorldMap({
  items,
}: BeerWorldMapProps) {
  const mapStageRef =
    useRef<HTMLDivElement>(
      null
    );

  const [
    mapSize,
    setMapSize,
  ] =
    useState(900);

  // ==================================================
  // VELIKOST MAPY PODLE RÁMEČKU
  // ==================================================

  useEffect(() => {
    const element =
      mapStageRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      const width =
        element.clientWidth;

      const nextSize =
        Math.max(
          240,
          Math.min(
            1050,
            Math.floor(
              width - 8
            )
          )
        );

      setMapSize(
        nextSize
      );
    };

    updateSize();

    const observer =
      new ResizeObserver(
        updateSize
      );

    observer.observe(
      element
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  // ==================================================
  // DATA MAPY
  // ==================================================

  const mappedCountries =
    items
      .map((item) => {
        const code =
          getCountryCode(
            item.name
          );

        if (!code) {
          return null;
        }

        return {
          ...item,
          code:
            code.toUpperCase(),
        };
      })
      .filter(
        (
          item
        ): item is CountryRankingItem & {
          code: string;
        } => item !== null
      );

  const unmappedCountries =
    items.filter(
      (item) =>
        !getCountryCode(
          item.name
        )
    );

  const data: Data =
    mappedCountries.map(
      (item) => ({
        country:
          item.code as ISOCode,

        value:
          item.count,
      })
    );

  const nameByCode =
    new Map(
      mappedCountries.map(
        (item) => [
          item.code,
          item.name,
        ]
      )
    );

  const countByCode =
    new Map(
      mappedCountries.map(
        (item) => [
          item.code,
          item.count,
        ]
      )
    );

  const maximum =
    mappedCountries.length >
    0
      ? Math.max(
          ...mappedCountries.map(
            (item) =>
              item.count
          )
        )
      : 0;

  // ==================================================
  // STYL ZEMÍ
  // ==================================================

  function styleCountry({
    countryValue,
    minValue,
    maxValue,
    color,
  }: CountryContext<string | number>): CSSProperties {
    const value =
      typeof countryValue ===
      "number"
        ? countryValue
        : Number(
            countryValue
          );

    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {
      return {
        fill:
          "#24211c",

        fillOpacity:
          1,

        stroke:
          "#4b4439",

        strokeWidth:
          0.55,

        strokeOpacity:
          0.55,

        cursor:
          "default",
      };
    }

    const range =
      maxValue -
      minValue;

    const ratio =
      range <= 0
        ? 1
        : Math.max(
            0,
            Math.min(
              1,
              (value -
                minValue) /
                range
            )
          );

    const opacity =
      0.28 +
      ratio * 0.72;

    return {
      fill:
        color,

      fillOpacity:
        opacity,

      stroke:
        "#9b773b",

      strokeWidth:
        0.65,

      strokeOpacity:
        0.78,

      cursor:
        "pointer",
    };
  }

  // ==================================================
  // TOOLTIP
  // ==================================================

  function tooltipText({
    countryCode,
    countryName,
    countryValue,
  }: CountryContext<string | number>) {
    const code =
      String(
        countryCode
      ).toUpperCase();

    const czechName =
      nameByCode.get(
        code
      ) ??
      countryName;

    const value =
      countByCode.get(
        code
      ) ??
      (typeof countryValue ===
      "number"
        ? countryValue
        : Number(
            countryValue
          ));

    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {
      return czechName;
    }

    return `${czechName}: ${value}×`;
  }

  // ==================================================
  // VÝSTUP
  // ==================================================

  return (
    <section
      style={{
        position:
          "relative",

        overflow:
          "hidden",

        padding:
          "22px 24px 18px",

        border:
          "1px solid var(--taste-border)",

        borderRadius:
          "var(--taste-radius-xl)",

        background: `
          radial-gradient(
            circle at 50% 15%,
            rgba(231,166,47,0.08),
            transparent 25rem
          ),
          linear-gradient(
            145deg,
            rgba(231,166,47,0.025),
            transparent 45%
          ),
          var(--taste-surface)
        `,

        boxShadow:
          "var(--taste-shadow-soft)",
      }}
    >
      {/* ==================================================
          HLAVIČKA
      ================================================== */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "flex-end",

          gap:
            "16px",

          flexWrap:
            "wrap",

          marginBottom:
            "8px",
        }}
      >
        <div>
          <div
            className="taste-label"
            style={{
              marginBottom:
                "5px",
            }}
          >
            Pivní svět
          </div>

          <h2
            style={{
              margin: 0,

              fontSize:
                "22px",

              lineHeight:
                1.1,

              fontWeight:
                750,

              letterSpacing:
                "-0.025em",
            }}
          >
            Mapa ochutnaných zemí
          </h2>
        </div>

        <div
          style={{
            textAlign:
              "right",
          }}
        >
          <div
            style={{
              color:
                "var(--taste-amber-bright)",

              fontSize:
                "22px",

              lineHeight:
                1,

              fontWeight:
                800,

              letterSpacing:
                "-0.03em",
            }}
          >
            {
              mappedCountries.length
            }
          </div>

          <div
            style={{
              marginTop:
                "4px",

              color:
                "var(--taste-text-muted)",

              fontSize:
                "10px",
            }}
          >
            ochutnaných zemí
          </div>
        </div>
      </div>

      {/* ==================================================
          MAPA
      ================================================== */}

      <div
        ref={
          mapStageRef
        }
        style={{
          width:
            "100%",

          minHeight:
            "310px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          overflow:
            "hidden",
        }}
      >
        {data.length > 0 ? (
          <div
            style={{
              display:
                "flex",

              justifyContent:
                "center",

              alignItems:
                "center",

              width:
                `${mapSize}px`,

              maxWidth:
                "100%",

              margin:
                "0 auto",
            }}
          >
            <WorldMap
              title=""

              data={
                data
              }

              size={
                mapSize
              }

              color="#e7a62f"

              backgroundColor="transparent"

              borderColor="#4b4439"

              frame={
                false
              }

              richInteraction={
                false
              }

              tooltipBgColor="#17130d"

              tooltipTextColor="#f2ede3"

              styleFunction={
                styleCountry
              }

              tooltipTextFunction={
                tooltipText
              }
            />
          </div>
        ) : (
          <div
            style={{
              padding:
                "55px 20px",

              textAlign:
                "center",

              color:
                "var(--taste-text-muted)",

              fontSize:
                "12px",
            }}
          >
            Pro tento výběr
            zatím není co
            zakreslit.
          </div>
        )}
      </div>

      {/* ==================================================
          LEGENDA
      ================================================== */}

      {data.length > 0 && (
        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap:
              "14px",

            flexWrap:
              "wrap",

            marginTop:
              "2px",

            paddingTop:
              "13px",

            borderTop:
              "1px solid rgba(231,166,47,0.09)",
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

              color:
                "var(--taste-text-muted)",

              fontSize:
                "10px",
            }}
          >
            <span>
              méně
            </span>

            <div
              style={{
                display:
                  "flex",

                gap:
                  "3px",
              }}
            >
              {[
                0.28,
                0.45,
                0.65,
                0.82,
                1,
              ].map(
                (
                  opacity
                ) => (
                  <span
                    key={
                      opacity
                    }
                    style={{
                      width:
                        "19px",

                      height:
                        "7px",

                      borderRadius:
                        "999px",

                      background:
                        `rgba(231,166,47,${opacity})`,
                    }}
                  />
                )
              )}
            </div>

            <span>
              více
            </span>
          </div>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "16px",

              color:
                "var(--taste-text-muted)",

              fontSize:
                "10px",
            }}
          >
            <span>
              maximum:{" "}
              <strong
                style={{
                  color:
                    "var(--taste-text-soft)",
                }}
              >
                {
                  maximum
                }
                ×
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* ==================================================
          NEROZPOZNANÉ ZEMĚ
      ================================================== */}

      {unmappedCountries.length >
        0 && (
        <div
          style={{
            marginTop:
              "12px",

            padding:
              "9px 11px",

            border:
              "1px solid rgba(231,166,47,0.12)",

            borderRadius:
              "9px",

            background:
              "rgba(231,166,47,0.035)",

            color:
              "var(--taste-text-muted)",

            fontSize:
              "10px",

            lineHeight:
              1.5,
          }}
        >
          Nepodařilo se přiřadit
          na mapu:{" "}
          {unmappedCountries
            .map(
              (item) =>
                item.name
            )
            .join(", ")}
        </div>
      )}
    </section>
  );
}