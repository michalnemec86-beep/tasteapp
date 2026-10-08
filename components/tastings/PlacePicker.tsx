"use client";

import { useEffect, useState } from "react";

export type PlaceCategory = "home" | "pub" | "festival";
type Suggestion = {
  id: number | null;
  name: string;
  city: string;
  country: string;
  category: "pub" | "festival" | null;
};

const choices: { key: PlaceCategory; title: string }[] = [
  { key: "pub", title: "🍺 Hospoda" },
  { key: "home", title: "🏠 Doma" },
  { key: "festival", title: "🎪 Festival" },
];

export default function PlacePicker({
  initialPlace = "",
  initialCategory = null,
  initialPlaceId = null,
}: {
  initialPlace?: string | null;
  initialCategory?: PlaceCategory | null;
  initialPlaceId?: number | null;
}) {
  const [category, setCategory] = useState<PlaceCategory | null>(initialCategory);
  const [name, setName] = useState(initialPlace ?? "");
  const [placeId, setPlaceId] = useState<number | null>(initialPlaceId);
  const [changed, setChanged] = useState(false);
  const [focused, setFocused] = useState(false);
  const [matches, setMatches] = useState<Suggestion[]>([]);
  const [lookupFailed, setLookupFailed] = useState(false);

  useEffect(() => {
    if ((category !== "pub" && category !== "festival") || !focused) {
      setMatches([]);
      return;
    }
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        const search = new URLSearchParams({ category, q: name });
        const response = await fetch(`/api/place-options?${search.toString()}`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Lookup failed");
        const json = (await response.json()) as { places: Suggestion[] };
        if (!controller.signal.aborted) {
          setMatches(json.places ?? []);
          setLookupFailed(false);
        }
      } catch {
        if (!controller.signal.aborted) setLookupFailed(true);
      }
    }, 180);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [category, name, focused]);

  function selectCategory(next: PlaceCategory) {
    setChanged(true);
    setCategory(next);
    setPlaceId(null);
    setName(next === "home" ? "" : category === "home" ? "" : name);
    setMatches([]);
    setFocused(false);
  }

  return (
    <div className="taste-place-picker">
      <input type="hidden" name="placeCategory" value={category ?? ""} />
      <input type="hidden" name="placeId" value={placeId ?? ""} />
      <input type="hidden" name="placeChanged" value={changed ? "1" : "0"} />
      <div className="taste-place-choices" role="group" aria-label="Kategorie místa">
        {choices.map(choice => (
          <button
            key={choice.key}
            type="button"
            aria-pressed={category === choice.key}
            onClick={() => selectCategory(choice.key)}
            className={category === choice.key ? "taste-place-choice taste-place-choice-active" : "taste-place-choice"}
          >
            {choice.title}
          </button>
        ))}
        {(category || name.trim()) && (
          <button type="button" className="taste-place-clear" onClick={() => {
            setCategory(null); setName(""); setPlaceId(null); setChanged(true); setFocused(false);
          }} aria-label="Odstranit místo">×</button>
        )}
      </div>
      {category === "home" ? (
        <>
          <input type="hidden" name="place" value="Doma" />
          <p className="taste-place-help">Soukromá předvolba. Žádná adresa se neukládá do katalogu.</p>
        </>
      ) : (category === "pub" || category === "festival" || name.trim()) ? (
        <div className="taste-place-autocomplete">
          <input
            type="text" name="place" value={name} maxLength={160}
            placeholder={category === "festival" ? "Název festivalu" : "Název konkrétního místa"}
            autoComplete="off"
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 160)}
            onChange={event => {
              setName(event.target.value); setPlaceId(null); setChanged(true); setFocused(true);
            }}
            className="taste-place-input"
          />
          {focused && matches.length > 0 && (
            <div className="taste-place-suggestions">
              {matches.map((item, index) => (
                <button
                  type="button" key={`${item.id ?? "recent"}-${item.name}-${index}`}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    setName(item.name); setPlaceId(item.id); setChanged(true); setFocused(false);
                  }}
                >
                  <strong>{item.name}</strong>
                  {(item.city || item.country) && <small>{[item.city, item.country].filter(Boolean).join(", ")}</small>}
                  {!item.id && <small>Poslední zadané místo</small>}
                </button>
              ))}
            </div>
          )}
          {lookupFailed && focused && <p className="taste-place-help">Návrhy nejsou dostupné. Název můžeš zadat ručně.</p>}
          {category && <p className="taste-place-help">
            Vyber místo z nabídky nebo napiš nové. Nová hospoda či festival se navrhne do společného katalogu.
          </p>}
          {!category && <p className="taste-place-help">Původní text místa. Pro zařazení vyber kategorii.</p>}
        </div>
      ) : (
        <p className="taste-place-help">Nepovinné. Vyber kategorii, pokud chceš místo uvést.</p>
      )}
    </div>
  );
}
