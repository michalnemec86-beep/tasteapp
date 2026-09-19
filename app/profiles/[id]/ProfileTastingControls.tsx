"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type TastingSort = "newest" | "oldest" | "alpha" | "country";

type ProfileTastingControlsProps = {
  sort: TastingSort;
  country: string;
  countries: string[];
};

export default function ProfileTastingControls({
  sort,
  country,
  countries,
}: ProfileTastingControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showCountries, setShowCountries] = useState(
    sort === "country" || Boolean(country)
  );

  function navigate(nextSort: TastingSort, nextCountry?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "beers");
    params.set("sort", nextSort);

    if (nextCountry) {
      params.set("country", nextCountry);
    } else {
      params.delete("country");
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const options: Array<{ key: TastingSort; label: string }> = [
    { key: "alpha", label: "Abecedně" },
    { key: "oldest", label: "Nejstarší" },
    { key: "newest", label: "Nejnovější" },
  ];

  return (
    <div className="taste-tasting-sort" aria-label="Řazení ochutnávek">
      <div className="taste-tasting-sort-buttons">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            className="taste-button-secondary"
            aria-pressed={sort === option.key && !country}
            onClick={() => navigate(option.key)}
          >
            {option.label}
          </button>
        ))}

        <button
          type="button"
          className="taste-button-secondary"
          aria-expanded={showCountries}
          aria-pressed={sort === "country" || Boolean(country)}
          onClick={() => setShowCountries((visible) => !visible)}
        >
          Podle zemí
        </button>
      </div>

      {showCountries && (
        <label className="taste-tasting-country-select">
          <span>Země</span>
          <select
            value={country}
            onChange={(event) => navigate("country", event.target.value)}
          >
            <option value="">Všechny země</option>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
