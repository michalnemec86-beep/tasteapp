"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import BreweryEditModalClient from "./BreweryEditModalClient";

type UserBreweryStats = {
  beerCount: number;
  tastingCount: number;
};

export type BreweryBeerItem = {
  id: number;
  name: string;
  styleName: string | null;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  tastingCount: number;
  userTastingCounts: Record<string, number>;
};

export type BreweryTableRow = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  beerCount: number;
  foundedYear: number | null;
  historyFromYear: number | null;
  tastingCount: number;
  closedYear: number | null;
  historyText: string;
  historySortYear: number | null;
  beers: BreweryBeerItem[];
  userStats: Record<string, UserBreweryStats>;
};

type ProfileOption = {
  id: string;
  display_name: string | null;
};

type CountryOption = {
  id: number;
  name: string;
};

type SortKey =
  | "name"
  | "city"
  | "country"
  | "beerCount"
  | "foundedYear"
  | "tastingCount"
  | "closedYear"
  | "historySortYear";

type SortDirection = "asc" | "desc";

type BreweryTableClientProps = {
  rows: BreweryTableRow[];
  profiles: ProfileOption[];
  countries: CountryOption[];
  updateBreweryAction: (
    breweryId: number,
    formData: FormData
  ) => Promise<void>;
};

const columns: {
  key: SortKey;
  label: string;
  align?: "left" | "center";
}[] = [
  {
    key: "name",
    label: "Název",
  },
  {
    key: "city",
    label: "Město",
  },
  {
    key: "country",
    label: "Stát",
  },
  {
    key: "beerCount",
    label: "Zaznamenané značky",
    align: "center",
  },
  {
    key: "foundedYear",
    label: "Rok založení",
    align: "center",
  },
  {
    key: "tastingCount",
    label: "Ochutnávky",
    align: "center",
  },
  {
    key: "closedYear",
    label: "Uzavření",
    align: "center",
  },
  {
    key: "historySortYear",
    label: "Historie názvů",
  },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function BreweryTableClient({
  rows,
  profiles,
  countries,
  updateBreweryAction,
}: BreweryTableClientProps) {
  const [sortKey, setSortKey] =
    useState<SortKey>("name");

  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");

  const [search, setSearch] =
    useState("");

  const [selectedUserId, setSelectedUserId] =
    useState("");

  const [selectedCountry, setSelectedCountry] =
    useState("");

  const [selectedCity, setSelectedCity] =
    useState("");

  const [
    beerListBrewery,
    setBeerListBrewery,
  ] =
    useState<BreweryTableRow | null>(
      null
    );

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );

      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  function handleUserChange(userId: string) {
    setSelectedUserId(userId);
    setSelectedCountry("");
    setSelectedCity("");
  }

  function handleCountryChange(country: string) {
    setSelectedCountry(country);
    setSelectedCity("");
  }

  function clearFilters() {
    setSearch("");
    setSelectedUserId("");
    setSelectedCountry("");
    setSelectedCity("");
  }

  const userFilteredRows = useMemo(() => {
    if (!selectedUserId) {
      return rows;
    }

    return rows.filter(
      (row) =>
        (row.userStats[selectedUserId]?.tastingCount ?? 0) > 0
    );
  }, [rows, selectedUserId]);

  const countryOptions = useMemo(() => {
    return Array.from(
      new Set(
        userFilteredRows
          .map((row) => row.country)
          .filter(
            (country): country is string =>
              Boolean(country)
          )
      )
    ).sort((a, b) =>
      a.localeCompare(b, "cs", {
        sensitivity: "base",
      })
    );
  }, [userFilteredRows]);

  const cityOptions = useMemo(() => {
    return Array.from(
      new Set(
        userFilteredRows
          .filter(
            (row) =>
              !selectedCountry ||
              row.country === selectedCountry
          )
          .map((row) => row.city)
          .filter(
            (city): city is string =>
              Boolean(city)
          )
      )
    ).sort((a, b) =>
      a.localeCompare(b, "cs", {
        sensitivity: "base",
      })
    );
  }, [
    userFilteredRows,
    selectedCountry,
  ]);

  const filteredAndSortedRows = useMemo(() => {
    const normalizedSearch =
      normalizeText(search);

    const filtered = userFilteredRows
      .filter(
        (row) =>
          !selectedCountry ||
          row.country === selectedCountry
      )
      .filter(
        (row) =>
          !selectedCity ||
          row.city === selectedCity
      )
      .filter((row) => {
        if (!normalizedSearch) {
          return true;
        }

        const searchableText = normalizeText(
          [
            row.name,
            row.city,
            row.country,
            row.historyText,
          ]
            .filter(Boolean)
            .join(" ")
        );

        return searchableText.includes(
          normalizedSearch
        );
      })
      .map((row) => {
        if (!selectedUserId) {
          return row;
        }

        const stats =
          row.userStats[selectedUserId];

        return {
          ...row,
          beerCount:
            stats?.beerCount ?? 0,
          tastingCount:
            stats?.tastingCount ?? 0,
          beers: row.beers
            .filter(
              (beer) =>
                (beer.userTastingCounts[selectedUserId] ?? 0) > 0
            )
            .map((beer) => ({
              ...beer,
              tastingCount:
                beer.userTastingCounts[selectedUserId] ?? 0,
            })),
        };
      });

    return filtered.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (
        aValue == null &&
        bValue == null
      ) {
        return 0;
      }

      if (aValue == null) {
        return 1;
      }

      if (bValue == null) {
        return -1;
      }

      let comparison = 0;

      if (
        typeof aValue === "number" &&
        typeof bValue === "number"
      ) {
        comparison =
          aValue - bValue;
      } else {
        comparison =
          String(aValue).localeCompare(
            String(bValue),
            "cs",
            {
              sensitivity: "base",
            }
          );
      }

      return sortDirection === "asc"
        ? comparison
        : -comparison;
    });
  }, [
    userFilteredRows,
    search,
    selectedCountry,
    selectedCity,
    selectedUserId,
    sortKey,
    sortDirection,
  ]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(selectedUserId) ||
    Boolean(selectedCountry) ||
    Boolean(selectedCity);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Hledat pivovar, město, stát…"
          aria-label="Hledat v katalogu pivovarů"
          style={{
            flex: "1 1 250px",
            minWidth: "210px",
            height: "38px",
            padding: "0 12px",
            border:
              "1px solid var(--taste-border)",
            borderRadius: "10px",
            background:
              "var(--taste-surface)",
            color:
              "var(--taste-text)",
            fontSize: "12px",
            outline: "none",
          }}
        />

        <select
          value={selectedUserId}
          onChange={(event) =>
            handleUserChange(
              event.target.value
            )
          }
          aria-label="Filtrovat podle uživatele"
          style={selectStyle}
        >
          <option value="">
            Všichni uživatelé
          </option>

          {profiles.map(
            (profile) => (
              <option
                key={profile.id}
                value={profile.id}
              >
                {profile.display_name ||
                  "Bez přezdívky"}
              </option>
            )
          )}
        </select>

        <select
          value={selectedCountry}
          onChange={(event) =>
            handleCountryChange(
              event.target.value
            )
          }
          aria-label="Filtrovat podle státu"
          style={selectStyle}
        >
          <option value="">
            Všechny státy
          </option>

          {countryOptions.map(
            (country) => (
              <option
                key={country}
                value={country}
              >
                {country}
              </option>
            )
          )}
        </select>

        <select
          value={selectedCity}
          onChange={(event) =>
            setSelectedCity(
              event.target.value
            )
          }
          aria-label="Filtrovat podle města"
          style={selectStyle}
        >
          <option value="">
            Všechna města
          </option>

          {cityOptions.map(
            (city) => (
              <option
                key={city}
                value={city}
              >
                {city}
              </option>
            )
          )}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            style={{
              height: "38px",
              padding: "0 11px",
              border:
                "1px solid var(--taste-border)",
              borderRadius: "10px",
              background:
                "transparent",
              color:
                "var(--taste-text-muted)",
              fontSize: "11px",
              fontWeight: 650,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Zrušit filtry
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "flex-end",
          marginBottom: "7px",
          color:
            "var(--taste-text-muted)",
          fontSize: "10px",
        }}
      >
        Zobrazeno{" "}
        {filteredAndSortedRows.length} z{" "}
        {rows.length}
      </div>

      <div
        style={{
          overflowX: "auto",
          border:
            "1px solid var(--taste-border)",
          borderRadius:
            "var(--taste-radius-lg)",
          background:
            "var(--taste-surface)",
          boxShadow:
            "var(--taste-shadow-soft)",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "1120px",
            borderCollapse:
              "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom:
                  "1px solid var(--taste-border)",
                background:
                  "rgba(231,166,47,0.045)",
              }}
            >
              {columns.map(
                (column) => {
                  const isActive =
                    sortKey ===
                    column.key;

                  const arrow =
                    isActive
                      ? sortDirection ===
                        "asc"
                        ? "↑"
                        : "↓"
                      : "↕";

                  return (
                    <th
                      key={
                        column.key
                      }
                      style={{
                        padding: 0,
                        textAlign:
                          column.align ??
                          "left",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleSort(
                            column.key
                          )
                        }
                        style={{
                          width:
                            "100%",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            column.align ===
                            "center"
                              ? "center"
                              : "flex-start",
                          gap: "6px",
                          padding:
                            "11px 12px",
                          border: 0,
                          background:
                            "transparent",
                          color:
                            isActive
                              ? "var(--taste-amber-bright)"
                              : "var(--taste-text-muted)",
                          font:
                            "inherit",
                          fontSize:
                            "10px",
                          fontWeight:
                            750,
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            "0.055em",
                          cursor:
                            "pointer",
                        }}
                      >
                        <span>
                          {
                            column.label
                          }
                        </span>

                        <span
                          aria-hidden="true"
                          style={{
                            fontSize:
                              isActive
                                ? "12px"
                                : "10px",
                            opacity:
                              isActive
                                ? 1
                                : 0.38,
                          }}
                        >
                          {arrow}
                        </span>
                      </button>
                    </th>
                  );
                }
              )}
            </tr>
          </thead>

          <tbody>
            {filteredAndSortedRows.length ===
            0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length
                  }
                  style={{
                    padding:
                      "28px 16px",
                    textAlign:
                      "center",
                    color:
                      "var(--taste-text-muted)",
                    fontSize:
                      "12px",
                  }}
                >
                  Žádný pivovar
                  neodpovídá
                  zvoleným filtrům.
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map(
                (brewery) => (
                  <tr
                    key={
                      brewery.id
                    }
                    style={{
                      borderBottom:
                        "1px solid var(--taste-border)",
                    }}
                  >
                    <td
                      style={{
                        padding:
                          "10px 12px",
                        color:
                          "var(--taste-text)",
                        fontWeight:
                          700,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "9px",
                        }}
                      >
                        <Link
                          href={`/breweries/${brewery.id}`}
                          style={{
                            color: "var(--taste-text)",
                            textDecoration: "none",
                            borderBottom:
                              "1px solid rgba(231,166,47,0.22)",
                          }}
                        >
                          {brewery.name}
                        </Link>

                        <BreweryEditModalClient
                          brewery={{
                            id: brewery.id,
                            name: brewery.name,
                            city: brewery.city,
                            country: brewery.country,
                            address: brewery.address,
                            website: brewery.website,
                            foundedYear: brewery.foundedYear,
                            closedYear: brewery.closedYear,
                            latitude: brewery.latitude,
                            longitude: brewery.longitude,
                          }}
                          countries={countries}
                          updateBreweryAction={updateBreweryAction}
                        />
                      </div>
                    </td>

                    <td
                      style={{
                        padding:
                          "10px 12px",
                        color:
                          "var(--taste-text-soft)",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {brewery.city ||
                        "—"}
                    </td>

                    <td
                      style={{
                        padding:
                          "10px 12px",
                        color:
                          "var(--taste-text-soft)",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {brewery.country ||
                        "—"}
                    </td>

                    <td
                      style={{
                        padding:
                          "10px 12px",
                        color:
                          "var(--taste-amber-bright)",
                        fontWeight:
                          700,
                        textAlign:
                          "center",
                      }}
                    >
                      {brewery.beerCount > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setBeerListBrewery(
                              brewery
                            )
                          }
                          title="Zobrazit zaznamenaná piva"
                          style={{
                            padding: 0,
                            border: 0,
                            borderBottom:
                              "1px solid rgba(231,166,47,0.38)",
                            background:
                              "transparent",
                            color:
                              "inherit",
                            font: "inherit",
                            fontWeight:
                              "inherit",
                            cursor:
                              "pointer",
                          }}
                        >
                          {brewery.beerCount}
                        </button>
                      ) : (
                        0
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          "10px 12px",
                        color:
                          "var(--taste-text-soft)",
                        textAlign:
                          "center",
                      }}
                    >
                      <span>
                        {brewery.foundedYear ??
                          "—"}

                        {brewery.historyFromYear != null &&
                          brewery.foundedYear != null &&
                          brewery.historyFromYear <
                            brewery.foundedYear && (
                            <span
                              style={{
                                marginLeft: "4px",
                                color:
                                  "var(--taste-text-muted)",
                                fontSize: "9px",
                                fontWeight: 500,
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              (od{" "}
                              {
                                brewery.historyFromYear
                              }
                              )
                            </span>
                          )}
                      </span>
                    </td>

                    <td
                      style={{
                        padding:
                          "10px 12px",
                        color:
                          "var(--taste-text-soft)",
                        textAlign:
                          "center",
                        fontWeight:
                          650,
                      }}
                    >
                      {
                        brewery.tastingCount
                      }
                    </td>

                    <td
                      style={{
                        padding:
                          "10px 12px",
                        color:
                          brewery.closedYear !=
                          null
                            ? "var(--taste-text)"
                            : "var(--taste-text-muted)",
                        textAlign:
                          "center",
                      }}
                    >
                      {brewery.closedYear ??
                        "—"}
                    </td>

                    <td
                      style={{
                        padding:
                          "10px 12px",
                        color:
                          "var(--taste-text-muted)",
                        minWidth:
                          "190px",
                        whiteSpace:
                          "pre-line",
                        lineHeight: 1.45,
                      }}
                    >
                      {
                        brewery.historyText
                      }
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
      {beerListBrewery && (
        <BreweryBeersModal
          brewery={beerListBrewery}
          userName={
            selectedUserId
              ? profiles.find(
                  (profile) =>
                    profile.id ===
                    selectedUserId
                )?.display_name ??
                null
              : null
          }
          onClose={() =>
            setBeerListBrewery(
              null
            )
          }
        />
      )}
    </>
  );
}

// ==================================================
// MODAL ZAZNAMENANÝCH PIV
// ==================================================

function BreweryBeersModal({
  brewery,
  userName,
  onClose,
}: {
  brewery: BreweryTableRow;
  userName: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

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
  }, [onClose]);

  const beers = [
    ...brewery.beers,
  ].sort((a, b) =>
    a.name.localeCompare(
      b.name,
      "cs",
      {
        sensitivity: "base",
      }
    )
  );

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background:
          "rgba(8,5,3,0.78)",
        backdropFilter:
          "blur(8px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Piva pivovaru ${brewery.name}`}
        style={{
          width: "min(560px, 100%)",
          maxHeight: "82vh",
          overflow: "hidden",
          border:
            "1px solid rgba(231,166,47,0.30)",
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
            gap: "20px",
            padding:
              "20px 22px 16px",
            borderBottom:
              "1px solid var(--taste-border)",
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
              Zaznamenaná piva
            </div>

            <h2
              style={{
                margin: 0,
                fontSize:
                  "21px",
                lineHeight:
                  1.15,
                fontWeight:
                  800,
              }}
            >
              {brewery.name}
            </h2>

            <div
              style={{
                marginTop:
                  "6px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "11px",
              }}
            >
              {beers.length}{" "}
              {beers.length === 1
                ? "pivo"
                : "piv"}

              {userName
                ? ` · ${userName}`
                : ""}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Zavřít"
            style={{
              width: "32px",
              height: "32px",
              flexShrink: 0,
              border:
                "1px solid var(--taste-border)",
              borderRadius:
                "9px",
              background:
                "rgba(255,255,255,0.025)",
              color:
                "var(--taste-text-muted)",
              cursor:
                "pointer",
              fontSize:
                "17px",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            maxHeight:
              "calc(82vh - 105px)",
            overflowY:
              "auto",
            padding:
              "8px 22px 18px",
          }}
        >
          {beers.map(
            (beer, index) => (
              <div
                key={beer.id}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0,1fr) auto",
                  gap: "14px",
                  alignItems:
                    "center",
                  padding:
                    "13px 0",
                  borderBottom:
                    index <
                    beers.length - 1
                      ? "1px solid rgba(255,255,255,0.055)"
                      : "none",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      color:
                        "var(--taste-text)",
                      fontSize:
                        "13px",
                      fontWeight:
                        750,
                      lineHeight:
                        1.3,
                    }}
                  >
                    {beer.name}
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      flexWrap:
                        "wrap",
                      alignItems:
                        "center",
                      gap:
                        "5px",
                      marginTop:
                        "6px",
                    }}
                  >
                    {beer.styleName && (
                      <span
                        style={{
                          color:
                            "var(--taste-text-soft)",
                          fontSize:
                            "10px",
                          fontWeight:
                            650,
                        }}
                      >
                        {beer.styleName}
                      </span>
                    )}

                    {beer.plato != null && (
                      <BeerMetaBadge>
                        {beer.plato} °P
                      </BeerMetaBadge>
                    )}

                    {beer.abv != null && (
                      <BeerMetaBadge>
                        {beer.abv} %
                      </BeerMetaBadge>
                    )}

                    {beer.ibu != null && (
                      <BeerMetaBadge>
                        IBU {beer.ibu}
                      </BeerMetaBadge>
                    )}
                  </div>
                </div>

                <span
                  title="Počet ochutnávek"
                  style={{
                    color:
                      "var(--taste-amber-bright)",
                    fontSize:
                      "12px",
                    fontWeight:
                      800,
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {beer.tastingCount}×
                </span>
              </div>
            )
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}

function BeerMetaBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        padding: "2px 6px",
        border:
          "1px solid rgba(231,166,47,0.18)",
        borderRadius:
          "999px",
        background:
          "rgba(231,166,47,0.055)",
        color:
          "var(--taste-text-muted)",
        fontSize:
          "9px",
        fontWeight:
          700,
        whiteSpace:
          "nowrap",
      }}
    >
      {children}
    </span>
  );
}

const selectStyle = {
  height: "38px",
  padding: "0 30px 0 11px",
  border:
    "1px solid var(--taste-border)",
  borderRadius: "10px",
  background:
    "var(--taste-surface)",
  color: "var(--taste-text)",
  fontSize: "12px",
  cursor: "pointer",
  outline: "none",
  minWidth: "145px",
} as const;
