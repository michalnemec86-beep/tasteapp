"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type TastingSort = "newest" | "oldest" | "alpha" | "country";

type ProfileTastingControlsProps = {
  sort: TastingSort;
  country: string;
  countries: string[];
  query: string;
  letter: string;
  letters: string[];
};

export default function ProfileTastingControls({
  sort,
  country,
  countries,
  query,
  letter,
  letters,
}: ProfileTastingControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showCountries, setShowCountries] = useState(
    sort === "country" || Boolean(country)
  );
  const [showLetters, setShowLetters] = useState(
    sort === "alpha" || Boolean(letter)
  );
  const [searchValue, setSearchValue] = useState(query);

  function navigate({
    nextSort = sort,
    nextCountry = country,
    nextLetter = letter,
    nextQuery = query,
  }: {
    nextSort?: TastingSort;
    nextCountry?: string;
    nextLetter?: string;
    nextQuery?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "beers");
    params.set("sort", nextSort);

    if (nextCountry) {
      params.set("country", nextCountry);
    } else {
      params.delete("country");
    }

    if (nextLetter) {
      params.set("letter", nextLetter);
    } else {
      params.delete("letter");
    }

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    } else {
      params.delete("q");
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ nextQuery: searchValue });
  }

  const options: Array<{ key: TastingSort; label: string }> = [
    { key: "oldest", label: "Nejstarší" },
    { key: "newest", label: "Nejnovější" },
  ];

  return (
    <div className="taste-tasting-sort" aria-label="Řazení ochutnávek">
      <form className="taste-tasting-search" onSubmit={submitSearch}>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Hledat pivo, značku nebo pivovar"
          aria-label="Hledat v ochutnávkách"
        />
        <button type="submit" className="taste-button-secondary">
          Hledat
        </button>
        {query && (
          <button
            type="button"
            className="taste-button-secondary"
            onClick={() => {
              setSearchValue("");
              navigate({ nextQuery: "" });
            }}
          >
            Zrušit
          </button>
        )}
      </form>

      <div className="taste-tasting-sort-buttons">
        <button
          type="button"
          className="taste-button-secondary"
          aria-expanded={showLetters}
          aria-pressed={sort === "alpha" || Boolean(letter)}
          onClick={() => {
            const nextVisible = !showLetters;
            setShowLetters(nextVisible);
            if (nextVisible) setShowCountries(false);
            if (nextVisible && sort !== "alpha") {
              navigate({ nextSort: "alpha", nextCountry: "", nextLetter: "" });
            }
          }}
        >
          Abecedně
        </button>

        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            className="taste-button-secondary"
            aria-pressed={sort === option.key && !country && !letter}
            onClick={() => {
              setShowLetters(false);
              setShowCountries(false);
              navigate({ nextSort: option.key, nextCountry: "", nextLetter: "" })
            }}
          >
            {option.label}
          </button>
        ))}

        <button
          type="button"
          className="taste-button-secondary"
          aria-expanded={showCountries}
          aria-pressed={sort === "country" || Boolean(country)}
          onClick={() => {
            const nextVisible = !showCountries;
            setShowCountries(nextVisible);
            if (nextVisible) setShowLetters(false);
            if (nextVisible && sort !== "country") {
              navigate({ nextSort: "country", nextCountry: "", nextLetter: "" });
            }
          }}
        >
          Podle zemí
        </button>
      </div>

      {showLetters && (
        <div className="taste-tasting-letters" aria-label="Vybrat počáteční písmeno">
          <button
            type="button"
            className="taste-button-secondary"
            aria-pressed={!letter}
            onClick={() => navigate({ nextSort: "alpha", nextCountry: "", nextLetter: "" })}
          >
            Všechna
          </button>
          {letters.map((item) => (
            <button
              key={item}
              type="button"
              className="taste-button-secondary"
              aria-pressed={letter === item}
              onClick={() => navigate({ nextSort: "alpha", nextCountry: "", nextLetter: item })}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {showCountries && (
        <label className="taste-tasting-country-select">
          <span>Země</span>
          <select
            value={country}
            onChange={(event) =>
              navigate({ nextSort: "country", nextCountry: event.target.value, nextLetter: "" })
            }
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
