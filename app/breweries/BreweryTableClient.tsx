"use client";

import { useMemo, useState } from "react";

type UserBreweryStats = {
  beerCount: number;
  tastingCount: number;
};

export type BreweryTableRow = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  beerCount: number;
  foundedYear: number | null;
  tastingCount: number;
  closedYear: number | null;
  historyText: string;
  historySortYear: number | null;
  userStats: Record<string, UserBreweryStats>;
};

type ProfileOption = {
  id: string;
  display_name: string | null;
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
    label: "Změna názvu",
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
                      {brewery.name}
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
                      {
                        brewery.beerCount
                      }
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
                      {brewery.foundedYear ??
                        "—"}
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
    </>
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
