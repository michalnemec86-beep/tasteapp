"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type YearSelectProps = {
  selectedYear?: number;
  firstYear?: number;
};

export default function YearSelect({
  selectedYear,
  firstYear = 2005,
}: YearSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams =
    useSearchParams();

  const currentYear =
    new Date().getFullYear();

  const years =
    Array.from(
      {
        length:
          currentYear -
          firstYear +
          1,
      },
      (_, index) =>
        currentYear -
        index
    );

  function handleChange(
    value: string
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (!value) {
      params.delete("year");
      params.delete("month");
    } else {
      params.set(
        "year",
        value
      );

      // Při změně roku
      // začneme vždy celým rokem.
      params.delete("month");
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

  return (
    <select
      value={
        selectedYear ??
        ""
      }
      onChange={(event) =>
        handleChange(
          event.target.value
        )
      }
      style={{
        width: "100%",
        maxWidth: "260px",
        padding:
          "10px 38px 10px 13px",
        border:
          "1px solid rgba(127,127,127,0.35)",
        borderRadius:
          "10px",
        background:
          "hsl(var(--background))",
        color: "inherit",
        fontSize: "14px",
        cursor: "pointer",
      }}
    >
      <option value="">
        📅 Celé období
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
    </select>
  );
}