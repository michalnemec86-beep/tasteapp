"use client";

import { useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { PACKAGING_OPTIONS } from "@/lib/packaging";

type SortMode =
  | "count-desc"
  | "count-asc"
  | "name-asc"
  | "name-desc";

type ProfileOption = {
  id: string;
  display_name: string;
};

type StatsFilterBarClientProps = {
  profiles: ProfileOption[];
  selectedUserId?: string;
  selectedYear?: number;
  selectedMonth?: number;
  selectedPackaging?: string;
  sortMode: SortMode;
  selectedLetter?: string;
  letters?: string[];
  firstYear?: number;
  hideProfileSelector?: boolean;
  contextFilters?: Array<{
    param: string;
    label: string;
    value: string;
  }>;
};

const MONTHS = [
  { number: 1, name: "Leden" },
  { number: 2, name: "Únor" },
  { number: 3, name: "Březen" },
  { number: 4, name: "Duben" },
  { number: 5, name: "Květen" },
  { number: 6, name: "Červen" },
  { number: 7, name: "Červenec" },
  { number: 8, name: "Srpen" },
  { number: 9, name: "Září" },
  { number: 10, name: "Říjen" },
  { number: 11, name: "Listopad" },
  { number: 12, name: "Prosinec" },
];

export default function StatsFilterBarClient({
  profiles,
  selectedUserId,
  selectedYear,
  selectedMonth,
  selectedPackaging,
  sortMode,
  selectedLetter = "",
  letters = [],
  firstYear = 2005,
  hideProfileSelector = false,
  contextFilters = [],
}: StatsFilterBarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentYear = new Date().getFullYear();

  const years = Array.from(
    {
      length: currentYear - firstYear + 1,
    },
    (_, index) => currentYear - index
  );

  function updateParams(
    updates: Record<string, string | null>
  ) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const query = params.toString();

    router.replace(
      query ? `${pathname}?${query}` : pathname,
      { scroll: false }
    );
  }

  function handleYearChange(value: string) {
    updateParams({
      year: value || null,
      month: null,
    });
  }

  const activeFilterCount = [
    !hideProfileSelector && Boolean(selectedUserId),
    Boolean(selectedYear),
    Boolean(selectedMonth),
    Boolean(selectedPackaging),
    ...contextFilters.map(() => true),
  ].filter(Boolean).length;
  const [filtersOpen, setFiltersOpen] = useState(activeFilterCount > 0);
  const [lettersOpen, setLettersOpen] = useState(
    sortMode === "name-asc" || Boolean(selectedLetter)
  );

  return (
    <>
    <div className="taste-tasting-sort" style={{ marginBottom: "12px" }}>
      <div className="taste-tasting-sort-buttons" aria-label="Řazení statistik">
        <button
          type="button"
          className="taste-button-secondary"
          aria-expanded={lettersOpen}
          aria-pressed={sortMode === "name-asc" || Boolean(selectedLetter)}
          onClick={() => {
            const nextOpen = !lettersOpen;
            setLettersOpen(nextOpen);
            if (nextOpen && sortMode !== "name-asc") {
              updateParams({ sort: "name-asc", letter: null });
            }
          }}
        >
          Abecedně
        </button>

        <button
          type="button"
          className="taste-button-secondary"
          aria-pressed={sortMode === "count-desc"}
          onClick={() => {
            setLettersOpen(false);
            updateParams({ sort: null, letter: null });
          }}
        >
          Nejvíce
        </button>

        <button
          type="button"
          className="taste-button-secondary"
          aria-pressed={sortMode === "count-asc"}
          onClick={() => {
            setLettersOpen(false);
            updateParams({ sort: "count-asc", letter: null });
          }}
        >
          Nejméně
        </button>

        <button
          type="button"
          className="taste-button-secondary"
          aria-pressed={sortMode === "name-desc"}
          onClick={() => {
            setLettersOpen(false);
            updateParams({ sort: "name-desc", letter: null });
          }}
        >
          Z–A
        </button>
      </div>

      {lettersOpen && (
        <div className="taste-tasting-letters" aria-label="Vybrat počáteční písmeno">
          <button
            type="button"
            className="taste-button-secondary"
            aria-pressed={!selectedLetter}
            onClick={() => updateParams({ sort: "name-asc", letter: null })}
          >
            Všechna
          </button>
          {letters.map((letter) => (
            <button
              key={letter}
              type="button"
              className="taste-button-secondary"
              aria-pressed={selectedLetter === letter}
              onClick={() => updateParams({ sort: "name-asc", letter })}
            >
              {letter}
            </button>
          ))}
        </div>
      )}
    </div>

    <details
      className="taste-collapsible-filters"
      open={filtersOpen || activeFilterCount > 0}
      onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
      style={{ marginBottom: "18px" }}
    >
      <summary className="taste-filter-toggle">
        <span>Filtry</span>
        {activeFilterCount > 0 && (
          <span className="taste-filter-count">{activeFilterCount}</span>
        )}
        <span className="taste-filter-chevron" aria-hidden="true">⌄</span>
      </summary>

      <section
        style={{
          display: "flex",
          alignItems: "end",
          gap: "12px",
          flexWrap: "wrap",
          padding: "15px 16px",
          marginTop: "8px",
          border: "1px solid var(--taste-border)",
          borderRadius: "var(--taste-radius-lg)",
          background: "var(--taste-surface)",
          boxShadow: "var(--taste-shadow-soft)",
        }}
      >
      {contextFilters.length > 0 && (
        <div
          style={{
            flex: "1 1 100%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {contextFilters.map((filter) => (
            <button
              key={filter.param}
              type="button"
              onClick={() => updateParams({ [filter.param]: null })}
              aria-label={`Zrušit filtr ${filter.label}: ${filter.value}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                minHeight: "32px",
                padding: "6px 10px",
                border: "1px solid rgba(231,166,47,0.34)",
                borderRadius: "999px",
                background: "rgba(231,166,47,0.09)",
                color: "var(--taste-amber-bright)",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <span>{filter.label}: {filter.value}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      {!hideProfileSelector && (
        <FilterSelect
          label="Uživatel"
          value={selectedUserId ?? ""}
          onChange={(value) =>
            updateParams({ user: value || null })
          }
        >
          <option value="">Celkem</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_name}
            </option>
          ))}
        </FilterSelect>
      )}

      <FilterSelect
        label="Rok"
        value={
          selectedYear ? String(selectedYear) : ""
        }
        onChange={handleYearChange}
      >
        <option value="">Celé období</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Měsíc"
        value={
          selectedMonth ? String(selectedMonth) : ""
        }
        disabled={!selectedYear}
        onChange={(value) =>
          updateParams({ month: value || null })
        }
      >
        <option value="">
          {selectedYear ? "Celý rok" : "Vyber rok"}
        </option>
        {MONTHS.map((month) => (
          <option
            key={month.number}
            value={month.number}
          >
            {month.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Podání / obal"
        value={selectedPackaging ?? ""}
        onChange={(value) =>
          updateParams({ packaging: value || null })
        }
      >
        <option value="">Všechny</option>
        {PACKAGING_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </FilterSelect>

      </section>
    </details>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  disabled = false,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: "6px",
        minWidth: "150px",
        flex: "1 1 160px",
      }}
    >
      <span
        className="taste-label"
        style={{ paddingLeft: "2px" }}
      >
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={{
          width: "100%",
          height: "38px",
          padding: "0 36px 0 12px",
          border:
            "1px solid rgba(127,127,127,0.35)",
          borderRadius: "10px",
          background: "hsl(var(--background))",
          color: "inherit",
          fontSize: "13px",
          fontWeight: 600,
          cursor: disabled
            ? "not-allowed"
            : "pointer",
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {children}
      </select>
    </label>
  );
}
