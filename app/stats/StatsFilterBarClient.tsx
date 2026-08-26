"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

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
  sortMode: SortMode;
  firstYear?: number;
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
  sortMode,
  firstYear = 2005,
}: StatsFilterBarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams =
    useSearchParams();

  const currentYear =
    new Date().getFullYear();

  const years = Array.from(
    {
      length:
        currentYear -
        firstYear +
        1,
    },
    (_, index) =>
      currentYear - index
  );

  function updateParams(
    updates: Record<
      string,
      string | null
    >
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    for (const [
      key,
      value,
    ] of Object.entries(
      updates
    )) {
      if (
        value == null ||
        value === ""
      ) {
        params.delete(key);
      } else {
        params.set(
          key,
          value
        );
      }
    }

    const query =
      params.toString();

    router.replace(
      query
        ? `${pathname}?${query}`
        : pathname,
      {
        scroll: false,
      }
    );
  }

  function handleYearChange(
    value: string
  ) {
    updateParams({
      year: value || null,
      month: null,
    });
  }

  return (
    <section
      style={{
        display: "flex",
        alignItems: "end",
        gap: "12px",
        flexWrap: "wrap",
        padding: "15px 16px",
        marginBottom: "18px",
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
      <FilterSelect
        label="Uživatel"
        value={selectedUserId ?? ""}
        onChange={(value) =>
          updateParams({
            user: value || null,
          })
        }
      >
        <option value="">
          Celkem
        </option>

        {profiles.map(
          (profile) => (
            <option
              key={profile.id}
              value={profile.id}
            >
              {
                profile.display_name
              }
            </option>
          )
        )}
      </FilterSelect>

      <FilterSelect
        label="Rok"
        value={
          selectedYear
            ? String(
                selectedYear
              )
            : ""
        }
        onChange={
          handleYearChange
        }
      >
        <option value="">
          Celé období
        </option>

        {years.map(
          (year) => (
            <option
              key={year}
              value={year}
            >
              {year}
            </option>
          )
        )}
      </FilterSelect>

      <FilterSelect
        label="Měsíc"
        value={
          selectedMonth
            ? String(
                selectedMonth
              )
            : ""
        }
        disabled={
          !selectedYear
        }
        onChange={(value) =>
          updateParams({
            month:
              value || null,
          })
        }
      >
        <option value="">
          {selectedYear
            ? "Celý rok"
            : "Vyber rok"}
        </option>

        {MONTHS.map(
          (month) => (
            <option
              key={
                month.number
              }
              value={
                month.number
              }
            >
              {month.name}
            </option>
          )
        )}
      </FilterSelect>

      <FilterSelect
        label="Řazení"
        value={sortMode}
        onChange={(value) =>
          updateParams({
            sort:
              value ===
              "count-desc"
                ? null
                : value,
          })
        }
      >
        <option value="count-desc">
          ↓ Nejvíce
        </option>
        <option value="count-asc">
          ↑ Nejméně
        </option>
        <option value="name-asc">
          A–Z
        </option>
        <option value="name-desc">
          Z–A
        </option>
      </FilterSelect>
    </section>
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
  onChange: (
    value: string
  ) => void;
  disabled?: boolean;
  children:
    React.ReactNode;
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
        style={{
          paddingLeft: "2px",
        }}
      >
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        style={{
          width: "100%",
          height: "38px",
          padding:
            "0 36px 0 12px",
          border:
            "1px solid rgba(127,127,127,0.35)",
          borderRadius:
            "10px",
          background:
            "hsl(var(--background))",
          color: "inherit",
          fontSize: "13px",
          fontWeight: 600,
          cursor: disabled
            ? "not-allowed"
            : "pointer",
          opacity: disabled
            ? 0.45
            : 1,
        }}
      >
        {children}
      </select>
    </label>
  );
}
