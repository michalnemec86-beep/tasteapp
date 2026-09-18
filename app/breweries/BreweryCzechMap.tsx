"use client";

import {
  useEffect,
} from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";

export type BreweryMapItem = {
  id: number;
  name: string;
  city: string | null;
  latitude: number;
  longitude: number;
  closedYear: number | null;
};

type BreweryCzechMapProps = {
  items: BreweryMapItem[];
};

const CZECH_BOUNDS = L.latLngBounds(
  [48.50, 12.02],
  [51.12, 18.92]
);

function CzechMapViewport() {
  const map = useMap();

  useEffect(() => {
    function applyView() {
      map.invalidateSize({
        animate: false,
      });

      const padding =
        L.point(10, 10);

      const minZoom =
        map.getBoundsZoom(
          CZECH_BOUNDS,
          false,
          padding
        );

      map.setMinZoom(
        minZoom
      );

      map.setMaxBounds(
        CZECH_BOUNDS.pad(
          0.10
        )
      );

      map.fitBounds(
        CZECH_BOUNDS,
        {
          padding: [10, 10],
          animate: false,
        }
      );
    }

    applyView();

    map.on(
      "resize",
      applyView
    );

    return () => {
      map.off(
        "resize",
        applyView
      );
    };
  }, [map]);

  return null;
}

export default function BreweryCzechMap({
  items,
}: BreweryCzechMapProps) {
  return (
    <section
      className="taste-czech-brewery-map"
      style={{
        overflow: "hidden",
        border: "1px solid var(--taste-border)",
        borderRadius: "var(--taste-radius-xl)",
        background: "var(--taste-surface)",
        boxShadow: "var(--taste-shadow-soft)",
      }}
    >
      <div
        className="taste-czech-map-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "16px",
          flexWrap: "wrap",
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--taste-border)",
        }}
      >
        <div>
          <div
            className="taste-label"
            style={{
              marginBottom: "5px",
            }}
          >
            Česká pivní mapa
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              lineHeight: 1.1,
              fontWeight: 750,
              letterSpacing: "-0.025em",
            }}
          >
            Mapa českých pivovarů
          </h2>
        </div>

        <div
          className="taste-czech-map-count"
          style={{
            textAlign: "right",
          }}
        >
          <div
            className="taste-czech-map-count-value"
            style={{
              color: "var(--taste-amber-bright)",
              fontSize: "22px",
              lineHeight: 1,
              fontWeight: 800,
            }}
          >
            {items.length}
          </div>

          <div
            className="taste-czech-map-count-label taste-czech-map-count-label-desktop"
            style={{
              marginTop: "4px",
              color: "var(--taste-text-muted)",
              fontSize: "10px",
            }}
          >
            zakreslených pivovarů
          </div>
          <div className="taste-czech-map-count-label taste-czech-map-count-label-mobile">
            zapsaných pivovarů
          </div>
        </div>
      </div>

      <div
        className="taste-czech-map-stage"
        style={{
          width: "100%",
          height: "480px",
        }}
      >
        <MapContainer
          center={[49.82, 15.45]}
          zoom={7}
          scrollWheelZoom={false}
          zoomSnap={0.25}
          maxBoundsViscosity={1}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="brewery-map-tiles"
            maxZoom={19}
          />

          <CzechMapViewport />

          {items.map((brewery) => (
            <Marker
              key={brewery.id}
              position={[
                brewery.latitude,
                brewery.longitude,
              ]}
              icon={L.divIcon({
                className: "",
                html: `
                  <div
                    style="
                      width: 14px;
                      height: 14px;
                      border-radius: 50%;
                      background: ${brewery.closedYear == null ? "#e7a62f" : "#77736c"};
                      border: 2px solid ${brewery.closedYear == null ? "#fff1c2" : "#d1cdc5"};
                      box-shadow:
                        0 0 0 2px ${brewery.closedYear == null ? "rgba(231,166,47,0.22)" : "rgba(130,126,119,0.22)"},
                        0 3px 10px rgba(0,0,0,0.55);
                    "
                  ></div>
                `,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
                popupAnchor: [0, -10],
              })}
            >
              <Tooltip
                direction="top"
                offset={[0, -8]}
                opacity={1}
              >
                {brewery.name}
              </Tooltip>

              <Popup>
                <strong>{brewery.name}</strong>

                {brewery.city && (
                  <>
                    <br />
                    {brewery.city}
                  </>
                )}

                <br />
                <a href={`/breweries/${brewery.id}`}>
                  Detail pivovaru →
                </a>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
