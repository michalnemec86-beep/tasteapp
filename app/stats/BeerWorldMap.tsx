"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import type {
  CountryContext,
  Data,
  ISOCode,
} from "react-svg-worldmap";

import countries from "i18n-iso-countries";
import csLocale from "i18n-iso-countries/langs/cs.json";

const WorldMap = dynamic(
  () =>
    import("react-svg-worldmap").then(
      (module) => module.default
    ),
  { ssr: false }
);

countries.registerLocale(csLocale);

type CountryRankingItem = {
  id: string | number;
  name: string;
  count: number;
};

type BeerWorldMapProps = {
  items: CountryRankingItem[];
  eyebrow?: string;
  title?: string;
  countLabel?: string;
  focusEurope?: boolean;
};

type MapShadeStep = {
  min: number;
  max: number;
  label: string;
  fill: string;
};

const COUNTRY_ALIASES: Record<string, string> = {
  cesko: "CZ",
  "ceska republika": "CZ",
  usa: "US",
  "spojene staty": "US",
  "spojene staty americke": "US",
  "velka britanie": "GB",
  britanie: "GB",
  anglie: "GB",
  skotsko: "GB",
  wales: "GB",
  "severni irsko": "GB",
  "s. irsko": "GB",
  "spojene kralovstvi": "GB",
  "jizni korea": "KR",
  "korejska republika": "KR",
  "severni korea": "KP",
  rusko: "RU",
  vietnam: "VN",
};

const UK_REGION_NORMALIZED_NAMES = new Set([
  "anglie",
  "skotsko",
  "wales",
  "severni irsko",
  "s. irsko",
]);

const MAP_SHADE_STEPS: MapShadeStep[] = [
  {
    min: 1,
    max: 1,
    label: "1",
    fill: "#4a3218",
  },
  {
    min: 2,
    max: 3,
    label: "2–3",
    fill: "#5b3b19",
  },
  {
    min: 4,
    max: 6,
    label: "4–6",
    fill: "#6d461a",
  },
  {
    min: 7,
    max: 10,
    label: "7–10",
    fill: "#80511c",
  },
  {
    min: 11,
    max: 20,
    label: "11–20",
    fill: "#945e20",
  },
  {
    min: 21,
    max: 35,
    label: "21–35",
    fill: "#a96c24",
  },
  {
    min: 36,
    max: 50,
    label: "36–50",
    fill: "#bc7b29",
  },
  {
    min: 51,
    max: 75,
    label: "51–75",
    fill: "#cf8a2e",
  },
  {
    min: 76,
    max: 100,
    label: "76–100",
    fill: "#de9a35",
  },
  {
    min: 101,
    max: 200,
    label: "101–200",
    fill: "#edaa3f",
  },
  {
    min: 201,
    max: Number.POSITIVE_INFINITY,
    label: "201+",
    fill: "#ffc052",
  },
];

function normalizeCountryName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getCountryCode(countryName: string) {
  const normalized = normalizeCountryName(countryName);
  const alias = COUNTRY_ALIASES[normalized];

  if (alias) {
    return alias;
  }

  return (
    countries.getAlpha2Code(countryName, "cs") ??
    countries.getSimpleAlpha2Code(countryName, "cs")
  );
}

function getCountryShade(value: number) {
  return (
    MAP_SHADE_STEPS.find(
      (step) => value >= step.min && value <= step.max
    ) ?? MAP_SHADE_STEPS[MAP_SHADE_STEPS.length - 1]
  );
}

export default function BeerWorldMap({
  items,
  eyebrow = "Pivní svět",
  title = "Mapa ochutnaných zemí",
  countLabel = "ochutnaných zemí",
  focusEurope = false,
}: BeerWorldMapProps) {
  const router = useRouter();
  const mapStageRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);

  const [mapSize, setMapSize] = useState(900);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  function changeZoom(delta: number) {
    setMapZoom((value) => {
      const next = Math.max(
        0.75,
        Math.min(2.4, Number((value + delta).toFixed(2)))
      );

      if (next <= 1) {
        setMapPan({ x: 0, y: 0 });
      }

      return next;
    });
  }

  function handleMapPointerDown(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    didDragRef.current = false;

    if (mapZoom <= 1) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: mapPan.x,
      originY: mapPan.y,
    };

    setIsDragging(true);
  }

  function handleMapPointerMove(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (Math.abs(deltaX) + Math.abs(deltaY) > 6) {
      didDragRef.current = true;
    }

    setMapPan({
      x: drag.originX + deltaX,
      y: drag.originY + deltaY,
    });
  }

  function handleMapPointerUp(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  useEffect(() => {
    const element = mapStageRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      const width = element.clientWidth;
      const nextSize = Math.max(
        240,
        Math.min(1050, Math.floor(width - 8))
      );

      setMapSize(nextSize);
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      setMapZoom((value) => {
        const delta = event.deltaY < 0 ? 0.12 : -0.12;
        const next = Math.max(
          0.75,
          Math.min(2.4, Number((value + delta).toFixed(2)))
        );

        if (next <= 1) {
          setMapPan({ x: 0, y: 0 });
        }

        return next;
      });
    };

    element.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      observer.disconnect();
      element.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const mappedCountries = items
    .map((item) => {
      const code = getCountryCode(item.name);

      if (!code) {
        return null;
      }

      return {
        ...item,
        code: code.toUpperCase(),
      };
    })
    .filter(
      (
        item
      ): item is CountryRankingItem & { code: string } =>
        item !== null
    );

  const unmappedCountries = items.filter(
    (item) => !getCountryCode(item.name)
  );

  const hasGroupedUkRegion = items.some((item) =>
    UK_REGION_NORMALIZED_NAMES.has(
      normalizeCountryName(item.name)
    )
  );

  const data: Data = mappedCountries.map((item) => ({
    country: item.code as ISOCode,
    value: item.count,
  }));

  const nameByCode = new Map(
    mappedCountries.map((item) => [item.code, item.name])
  );

  const countByCode = new Map(
    mappedCountries.map((item) => [item.code, item.count])
  );

  function styleCountry({
    countryValue,
  }: CountryContext<string | number>): CSSProperties {
    const value =
      typeof countryValue === "number"
        ? countryValue
        : Number(countryValue);

    if (!Number.isFinite(value) || value <= 0) {
      return {
        fill: "#24211c",
        fillOpacity: 1,
        stroke: "#4b4439",
        strokeWidth: 0.55,
        strokeOpacity: 0.55,
        cursor: "default",
      };
    }

    const shade = getCountryShade(value);

    return {
      fill: shade.fill,
      fillOpacity: 1,
      stroke: "#9b773b",
      strokeWidth: 0.65,
      strokeOpacity: 0.78,
      cursor: "pointer",
    };
  }

  function tooltipText({
    countryCode,
    countryName,
    countryValue,
  }: CountryContext<string | number>) {
    const code = String(countryCode).toUpperCase();
    const czechName = nameByCode.get(code) ?? countryName;
    const value =
      countByCode.get(code) ??
      (typeof countryValue === "number"
        ? countryValue
        : Number(countryValue));

    if (!Number.isFinite(value) || value <= 0) {
      return czechName;
    }

    return `${czechName}: ${value}× · kliknutím otevřít`;
  }

  function handleCountryClick({
    countryCode,
    countryName,
    countryValue,
  }: CountryContext<string | number>) {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    const value =
      typeof countryValue === "number"
        ? countryValue
        : Number(countryValue);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    const code = String(countryCode).toUpperCase();
    const czechName = nameByCode.get(code) ?? countryName;
    router.push(
      `/breweries?focus=1&country=${encodeURIComponent(czechName)}`
    );
  }

  return (
    <section
      className={`taste-world-map${focusEurope ? " taste-brewery-world-map" : ""}`}
      style={{
        position: "relative",
        overflow: "hidden",
        padding: focusEurope
          ? "18px 20px 10px"
          : "22px 24px 18px",
        border: "1px solid var(--taste-border)",
        borderRadius: "var(--taste-radius-xl)",
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
        boxShadow: "var(--taste-shadow-soft)",
      }}
    >
      <div
        className="taste-world-map-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "8px",
        }}
      >
        <div>
          <div
            className="taste-label taste-world-map-eyebrow"
            style={{ marginBottom: "5px" }}
          >
            {eyebrow}
          </div>
          <h2
            className="taste-world-map-title"
            style={{
              margin: 0,
              fontSize: "22px",
              lineHeight: 1.1,
              fontWeight: 750,
              letterSpacing: "-0.025em",
            }}
          >
            {title}
          </h2>
        </div>

        <div className="taste-world-map-count" style={{ textAlign: "right" }}>
          <div
            className="taste-world-map-count-value"
            style={{
              color: "var(--taste-amber-bright)",
              fontSize: "22px",
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            {mappedCountries.length}
          </div>
          <div
            className="taste-world-map-count-label"
            style={{
              marginTop: "4px",
              color: "var(--taste-text-muted)",
              fontSize: "10px",
            }}
          >
            {countLabel}
          </div>
        </div>
      </div>

      <div
        ref={mapStageRef}
        className="taste-world-map-stage"
        style={{
          width: "100%",
          position: "relative",
          height: focusEurope ? "375px" : undefined,
          minHeight: focusEurope ? undefined : "310px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          overscrollBehavior: "contain",
        }}
      >
        {data.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--taste-border)",
              borderRadius: "8px",
              overflow: "hidden",
              background: "rgba(24, 18, 13, 0.92)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            }}
          >
            <button
              type="button"
              aria-label="Přiblížit mapu"
              onClick={() => changeZoom(0.15)}
              style={zoomButtonStyle}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Oddálit mapu"
              onClick={() => changeZoom(-0.15)}
              style={{
                ...zoomButtonStyle,
                borderBottom: 0,
              }}
            >
              −
            </button>
          </div>
        )}

        {data.length > 0 ? (
          <div
            onPointerDown={handleMapPointerDown}
            onPointerMove={handleMapPointerMove}
            onPointerUp={handleMapPointerUp}
            onPointerCancel={handleMapPointerUp}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: `${mapSize}px`,
              maxWidth: "100%",
              margin: "0 auto",
              transform: `translate3d(${mapPan.x}px, ${
                mapPan.y + (focusEurope ? -28 : 0)
              }px, 0) scale(${(focusEurope ? 1.12 : 1) * mapZoom})`,
              transformOrigin: "center center",
              transition: !isDragging
                ? "transform 180ms ease-out"
                : "none",
              cursor:
                mapZoom > 1
                  ? isDragging
                    ? "grabbing"
                    : "grab"
                  : "default",
              userSelect: "none",
              touchAction: mapZoom > 1 ? "none" : "auto",
            }}
          >
            <WorldMap
              title=""
              data={data}
              size={mapSize}
              color="#e7a62f"
              backgroundColor="transparent"
              borderColor="#4b4439"
              frame={false}
              richInteraction={false}
              tooltipBgColor="#17130d"
              tooltipTextColor="#f2ede3"
              styleFunction={styleCountry}
              tooltipTextFunction={tooltipText}
              onClickFunction={handleCountryClick}
            />
          </div>
        ) : (
          <div
            style={{
              padding: "55px 20px",
              textAlign: "center",
              color: "var(--taste-text-muted)",
              fontSize: "12px",
            }}
          >
            Pro tento výběr zatím není co zakreslit.
          </div>
        )}
      </div>

      {hasGroupedUkRegion && (
        <div
          style={{
            marginTop: "12px",
            padding: "9px 11px",
            border:
              "1px solid rgba(231,166,47,0.12)",
            borderRadius: "9px",
            background: "rgba(231,166,47,0.035)",
            color: "var(--taste-text-muted)",
            fontSize: "10px",
            lineHeight: 1.5,
          }}
        >
          Poznámka: Skotsko, Wales a Severní Irsko se ve
          světové mapě zobrazují sloučeně pod Velkou Británií,
          protože použitý mapový podklad nemá jejich vnitřní
          hranice jako samostatné oblasti.
        </div>
      )}

      {unmappedCountries.length > 0 && (
        <div
          style={{
            marginTop: "12px",
            padding: "9px 11px",
            border:
              "1px solid rgba(231,166,47,0.12)",
            borderRadius: "9px",
            background: "rgba(231,166,47,0.035)",
            color: "var(--taste-text-muted)",
            fontSize: "10px",
            lineHeight: 1.5,
          }}
        >
          Nepodařilo se přiřadit na mapu:{" "}
          {unmappedCountries
            .map((item) => item.name)
            .join(", ")}
        </div>
      )}
    </section>
  );
}

const zoomButtonStyle: CSSProperties = {
  width: "34px",
  height: "34px",
  border: 0,
  borderBottom: "1px solid var(--taste-border)",
  background: "transparent",
  color: "var(--taste-text)",
  fontSize: "20px",
  cursor: "pointer",
};
