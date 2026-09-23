"use client";

import { useMemo, useState } from "react";
import { PACKAGING_OPTIONS } from "@/lib/packaging";

type Brewery = {
  id: number;
  name: string;
  country?: string | null;
  aliases?: string[];
};

type Country = {
  id: number;
  name: string;
};

type BeerStyle = {
  id: number;
  name: string;
  aliases: string[];
};

type Hop = {
  id: number;
  name: string;
  aliases: string[];
};

type ExistingBeer = {
  id: number;
  name: string;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  is_non_alcoholic: boolean;
  is_catalog?: boolean;

  brands?: {
    id: number;
    name: string;
  } | null;

  breweries: {
    id: number;
    name: string;
    country?: string | null;
  } | null;

  beer_styles: {
    id: number;
    name: string;
  } | null;

  beer_hops?: Array<{
    hops: {
      id: number;
      name: string;
    } | null;
  }> | null;
};

type BreweryBrand = {
  breweryId: number;
  brand: { id: number; name: string };
};

type TastingFormProps = {
  saveTastingAction: (
    formData: FormData
  ) => void | Promise<void>;

  beers: ExistingBeer[];
  breweries: Brewery[];
  brandsByBrewery: BreweryBrand[];
  countries: Country[];
  styles: BeerStyle[];
  hops: Hop[];
  initialBeerId?: number;
};

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function TastingForm({
  saveTastingAction,
  beers,
  breweries,
  brandsByBrewery,
  countries,
  styles,
  hops,
  initialBeerId,
}: TastingFormProps) {
  const initialBeer = beers.find((beer) => beer.id === initialBeerId) ?? null;
  const [beerName, setBeerName] = useState(initialBeer?.name ?? "");
  const [existingBeerId, setExistingBeerId] = useState(initialBeer ? String(initialBeer.id) : "");
  const [brandName, setBrandName] = useState(initialBeer?.brands?.name ?? "");
  const [breweryName, setBreweryName] = useState(initialBeer?.breweries?.name ?? "");
  const [selectedBreweryId, setSelectedBreweryId] = useState<number | null>(initialBeer?.breweries?.id ?? null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(initialBeer?.brands?.id ?? null);
  const [breweryCountry, setBreweryCountry] = useState(initialBeer?.breweries?.country ?? "");
  const [styleName, setStyleName] = useState(initialBeer?.beer_styles?.name ?? "");
  const [plato, setPlato] = useState(initialBeer?.plato != null ? String(initialBeer.plato) : "");
  const [abv, setAbv] = useState(initialBeer?.abv != null ? String(initialBeer.abv) : "");
  const [ibu, setIbu] = useState(initialBeer?.ibu != null ? String(initialBeer.ibu) : "");
  const [isNonAlcoholic, setIsNonAlcoholic] = useState(initialBeer?.is_non_alcoholic ?? false);
  const [selectedHops, setSelectedHops] = useState<string[]>(
    (initialBeer?.beer_hops ?? [])
      .map((row) => row.hops?.name)
      .filter((name): name is string => Boolean(name))
  );
  const [hopValue, setHopValue] = useState("");
  const [beerOpen, setBeerOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [breweryOpen, setBreweryOpen] = useState(false);
  const [showCollaborationField, setShowCollaborationField] = useState(false);
  const [collaboratorQuery, setCollaboratorQuery] = useState("");
  const [collaboratorOpen, setCollaboratorOpen] = useState(false);
  const [selectedCollaborators, setSelectedCollaborators] = useState<Brewery[]>([]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [hopOpen, setHopOpen] = useState(false);

  const normalizedBrewery = normalizeText(breweryName);
  const activeBrewery =
    breweries.find((brewery) =>
      brewery.id === selectedBreweryId && normalizeText(brewery.name) === normalizedBrewery
    ) ?? breweries.find((brewery) =>
      normalizeText(brewery.name) === normalizedBrewery ||
      (brewery.aliases ?? []).some((alias) => normalizeText(alias) === normalizedBrewery)
    );
  const activeBreweryId = activeBrewery?.id;

  const brandOptions = useMemo(() => {
    if (!activeBreweryId) return [];
    const options = new Map<number, BreweryBrand["brand"]>();
    for (const link of brandsByBrewery) {
      if (link.breweryId === activeBreweryId) options.set(link.brand.id, link.brand);
    }
    for (const beer of beers) {
      if (beer.breweries?.id === activeBreweryId && beer.brands) {
        options.set(beer.brands.id, beer.brands);
      }
    }
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [activeBreweryId, brandsByBrewery, beers]);

  const matchingBrands = brandOptions.filter(
    (brand) => normalizeText(brand.name) === normalizeText(brandName)
  );
  const activeBrand =
    matchingBrands.find((brand) => brand.id === selectedBrandId) ??
    (matchingBrands.length === 1 ? matchingBrands[0] : null);

  const brandSuggestions = brandOptions.filter((brand) =>
    normalizeText(brand.name).includes(normalizeText(brandName))
  );

  // ==================================================
  // PIVO
  // ==================================================

  const beerSuggestions = activeBrewery && (!brandName.trim() || activeBrand) ? beers
    .filter((beer) => {
      if (beer.breweries?.id !== activeBrewery.id) return false;
      if (activeBrand && beer.brands?.id !== activeBrand.id) return false;
      const query = normalizeText(beerName);
      return normalizeText(beer.name).includes(query);
    })
    .sort((a, b) => {
      if (Boolean(a.is_catalog) !== Boolean(b.is_catalog)) {
        return a.is_catalog ? -1 : 1;
      }

      return a.name.localeCompare(b.name, "cs", { sensitivity: "base" });
    }) : [];

  function selectBeer(beer: ExistingBeer) {
    setExistingBeerId(String(beer.id));
    setBeerName(beer.name);
    setBrandName(beer.brands?.name ?? "");
    setSelectedBrandId(beer.brands?.id ?? null);
    setBreweryName(beer.breweries?.name ?? "");
    setSelectedBreweryId(beer.breweries?.id ?? null);
    setBreweryCountry(beer.breweries?.country ?? "");
    setStyleName(beer.beer_styles?.name ?? "");
    setPlato(beer.plato !== null ? String(beer.plato) : "");
    setAbv(beer.abv !== null ? String(beer.abv) : "");
    setIbu(beer.ibu !== null ? String(beer.ibu) : "");
    setIsNonAlcoholic(beer.is_non_alcoholic);
    setSelectedHops(
      (beer.beer_hops ?? [])
        .map((row) => row.hops?.name)
        .filter((name): name is string => Boolean(name))
    );
    setSelectedCollaborators([]);
    setCollaboratorQuery("");
    setShowCollaborationField(false);
    setBeerOpen(false);
    setBrandOpen(false);
  }

  function findExactBeer() {
    const matches = beerSuggestions.filter(
      (beer) => normalizeText(beer.name) === normalizeText(beerName)
    );
    return matches.length === 1 ? matches[0] : null;
  }

  function clearBeerDetails() {
    setExistingBeerId("");
    setBeerName("");
    setStyleName("");
    setPlato("");
    setAbv("");
    setIbu("");
    setIsNonAlcoholic(false);
    setSelectedHops([]);
    setSelectedCollaborators([]);
    setCollaboratorQuery("");
    setShowCollaborationField(false);
  }

  function changeBeerName(value: string) {
    if (existingBeerId) clearBeerDetails();
    setBeerName(value);
    setBeerOpen(true);
  }

  // ==================================================
  // PIVOVAR
  // ==================================================

  const brewerySuggestions = breweries.filter((brewery) => {
    if (breweryName.trim().length < 3) return false;
    const query = normalizeText(breweryName);

    return (
      normalizeText(brewery.name).includes(query) ||
      (brewery.aliases ?? []).some((alias) =>
        normalizeText(alias).includes(query)
      )
    );
  });

  function selectBrewery(brewery: Brewery) {
    if (activeBrewery?.id !== brewery.id) {
      clearBeerDetails();
      setBrandName("");
      setSelectedBrandId(null);
      setBrandOpen(false);
    }
    setBreweryName(brewery.name);
    setSelectedBreweryId(brewery.id);
    setBreweryCountry(brewery.country ?? "");
    setBreweryOpen(false);
  }

  function changeBreweryName(value: string) {
    if (value !== breweryName) {
      clearBeerDetails();
      setBrandName("");
      setSelectedBrandId(null);
      setSelectedBreweryId(null);
      setBreweryCountry("");
      setBrandOpen(false);
    }
    setBreweryName(value);
    setBreweryOpen(true);
  }

  function selectBrand(brand: BreweryBrand["brand"]) {
    if (activeBrand?.id !== brand.id) clearBeerDetails();
    setSelectedBrandId(brand.id);
    setBrandName(brand.name);
    setBrandOpen(false);
  }

  function changeBrandName(value: string) {
    if (value !== brandName) {
      clearBeerDetails();
      setSelectedBrandId(null);
    }
    setBrandName(value);
    setBrandOpen(true);
  }

  const collaboratorSuggestions = breweries.filter((brewery) => {
    if (collaboratorQuery.trim().length < 3) return false;
    if (normalizeText(brewery.name) === normalizeText(breweryName)) return false;
    if (selectedCollaborators.some((item) => item.id === brewery.id)) return false;

    const query = normalizeText(collaboratorQuery);

    return (
      normalizeText(brewery.name).includes(query) ||
      (brewery.aliases ?? []).some((alias) =>
        normalizeText(alias).includes(query)
      )
    );
  });

  function addCollaborator(brewery: Brewery) {
    setSelectedCollaborators((current) =>
      current.some((item) => item.id === brewery.id)
        ? current
        : [...current, brewery]
    );
    setCollaboratorQuery("");
    setCollaboratorOpen(false);
  }

  function removeCollaborator(id: number) {
    setSelectedCollaborators((current) =>
      current.filter((brewery) => brewery.id !== id)
    );
  }

  // ==================================================
  // ZEMĚ
  // ==================================================

  const countrySuggestions = countries.filter((country) => {
    if (breweryCountry.trim().length < 3) return false;
    return normalizeText(country.name).includes(normalizeText(breweryCountry));
  });

  // ==================================================
  // STYL
  // ==================================================

  const styleSuggestions = styles.filter((style) => {
    if (styleName.trim().length < 3) return false;
    const query = normalizeText(styleName);
    return (
      normalizeText(style.name).includes(query) ||
      style.aliases.some((alias) => normalizeText(alias).includes(query))
    );
  });

  function selectStyle(style: BeerStyle) {
    setStyleName(style.name);
    setStyleOpen(false);
  }

  // ==================================================
  // CHMELY
  // ==================================================

  const hopSuggestions = hops.filter((hop) => {
    if (hopValue.trim().length < 3) return false;

    const alreadySelected = selectedHops.some(
      (selectedHop) => normalizeText(selectedHop) === normalizeText(hop.name)
    );
    if (alreadySelected) return false;

    const query = normalizeText(hopValue);
    return (
      normalizeText(hop.name).includes(query) ||
      hop.aliases.some((alias) => normalizeText(alias).includes(query))
    );
  });

  function addHop(name: string) {
    const cleanName = name.trim();
    if (!cleanName) return;

    const alreadySelected = selectedHops.some(
      (selectedHop) => normalizeText(selectedHop) === normalizeText(cleanName)
    );

    if (!alreadySelected) {
      setSelectedHops((current) => [...current, cleanName]);
    }

    setHopValue("");
    setHopOpen(false);
  }

  function removeHop(name: string) {
    setSelectedHops((current) =>
      current.filter((hop) => normalizeText(hop) !== normalizeText(name))
    );
  }

  return (
    <form
      action={saveTastingAction}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="existingBeerId" value={existingBeerId} />

      {/* PIVOVAR */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Pivovar *</label>
        <div style={{ position: "relative" }}>
          <input
            name="brewery"
            value={breweryName}
            onChange={(event) => changeBreweryName(event.target.value)}
            onFocus={() => setBreweryOpen(true)}
            onBlur={() => setTimeout(() => setBreweryOpen(false), 150)}
            placeholder="Např. Velkopopovický pivovar"
            autoComplete="off"
            required
            style={inputStyle}
          />

          {breweryOpen && breweryName.trim().length >= 3 && brewerySuggestions.length > 0 && (
            <div style={dropdownStyle}>
              {brewerySuggestions.map((brewery) => (
                <button
                  key={brewery.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectBrewery(brewery)}
                  style={suggestionButtonStyle}
                >
                  {brewery.name}
                  {brewery.country && (
                    <div style={{ fontSize: "12px", opacity: 0.65, marginTop: "2px" }}>
                      {brewery.country}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {breweryOpen && breweryName.trim().length >= 3 && brewerySuggestions.length === 0 && (
            <div style={dropdownStyle}>
              <div style={{ padding: "10px 12px" }}>
                ＋ Nový pivovar: <strong>{breweryName}</strong>
              </div>
            </div>
          )}
        </div>

        {selectedCollaborators.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {selectedCollaborators.map((brewery) => (
              <span
                key={brewery.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 8px",
                  border: "1px solid rgba(217,138,67,0.34)",
                  borderRadius: "999px",
                  color: "var(--taste-text-soft)",
                  fontSize: "10px",
                }}
              >
                + {brewery.name}
                <button
                  type="button"
                  onClick={() => removeCollaborator(brewery.id)}
                  aria-label={`Odebrat kolaboraci ${brewery.name}`}
                  style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", padding: 0 }}
                >
                  ×
                </button>
                <input type="hidden" name="collaboratorBreweryIds" value={brewery.id} />
              </span>
            ))}
          </div>
        )}

        {!existingBeerId && !showCollaborationField ? (
          <button
            type="button"
            onClick={() => setShowCollaborationField(true)}
            style={{
              marginTop: "7px",
              border: 0,
              background: "transparent",
              color: "#d98945",
              cursor: "pointer",
              padding: 0,
              fontSize: "10px",
              fontWeight: 750,
            }}
          >
            ＋ Přidat kolaboraci
          </button>
        ) : !existingBeerId ? (
          <div style={{ position: "relative", marginTop: "8px" }}>
            <input
              value={collaboratorQuery}
              onChange={(event) => {
                setCollaboratorQuery(event.target.value);
                setCollaboratorOpen(true);
              }}
              onFocus={() => setCollaboratorOpen(true)}
              onBlur={() => setTimeout(() => setCollaboratorOpen(false), 150)}
              placeholder="Další pivovar v kolaboraci"
              autoComplete="off"
              style={inputStyle}
            />

            {collaboratorOpen && collaboratorQuery.trim().length >= 3 && collaboratorSuggestions.length > 0 && (
              <div style={dropdownStyle}>
                {collaboratorSuggestions.map((brewery) => (
                  <button
                    key={brewery.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addCollaborator(brewery)}
                    style={suggestionButtonStyle}
                  >
                    {brewery.name}
                    {brewery.country && (
                      <div style={{ fontSize: "12px", opacity: 0.65, marginTop: "2px" }}>
                        {brewery.country}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {collaboratorOpen && collaboratorQuery.trim().length >= 3 && collaboratorSuggestions.length === 0 && (
              <div style={dropdownStyle}>
                <div style={{ padding: "10px 12px", color: "var(--taste-text-muted)" }}>
                  Kolaboraci vyber z existujících pivovarů.
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ZNAČKA */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Značka *</label>
        <div style={{ position: "relative" }}>
          <input
            name="brandName"
            value={brandName}
            onChange={(event) => changeBrandName(event.target.value)}
            onFocus={() => setBrandOpen(true)}
            onBlur={() => setTimeout(() => setBrandOpen(false), 150)}
            placeholder={activeBrewery ? "Vyber značku pivovaru nebo napiš novou" : "Nejdřív vyber pivovar"}
            autoComplete="off"
            required
            style={inputStyle}
          />
          {brandOpen && activeBrewery && brandSuggestions.length > 0 && (
            <div style={dropdownStyle}>
              {brandSuggestions.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectBrand(brand)}
                  style={suggestionButtonStyle}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginTop: "5px", color: "var(--taste-text-muted)", fontSize: "10px", lineHeight: 1.4 }}>
          Značky v nabídce patří vybranému pivovaru. Novou značku můžeš napsat ručně.
        </div>
      </div>

      {/* PIVO */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Pivo *</label>
        <div style={{ position: "relative" }}>
          <input
            name="beerName"
            value={beerName}
            onChange={(event) => changeBeerName(event.target.value)}
            onFocus={() => setBeerOpen(true)}
            onBlur={() =>
              setTimeout(() => {
                const exactBeer = findExactBeer();
                if (exactBeer) selectBeer(exactBeer);
                else setBeerOpen(false);
              }, 150)
            }
            placeholder={activeBrewery ? "Vyber pivo pivovaru nebo napiš nové" : "Nejdřív vyber pivovar"}
            autoComplete="off"
            required
            style={inputStyle}
          />

          {beerOpen && beerSuggestions.length > 0 && (
            <div style={dropdownStyle}>
              {beerSuggestions.slice(0, 60).map((beer) => (
                <button
                  key={beer.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectBeer(beer)}
                  style={suggestionButtonStyle}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "54px minmax(0, 1fr)", columnGap: "8px", rowGap: "3px", textAlign: "left" }}>
                    <span style={suggestionLabelStyle}>Pivo</span>
                    <strong>{beer.name}</strong>
                    {beer.brands?.name && (
                      <>
                        <span style={suggestionLabelStyle}>Značka</span>
                        <span style={{ fontSize: "12px", opacity: 0.82 }}>
                          {beer.brands.name}{beer.is_catalog ? " · katalogové" : ""}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ZEMĚ */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Země původu pivovaru</label>
        <div style={{ position: "relative" }}>
          <input
            name="breweryCountry"
            value={breweryCountry}
            onChange={(event) => {
              setBreweryCountry(event.target.value);
              setCountryOpen(true);
            }}
            onFocus={() => {
              if (!existingBeerId) setCountryOpen(true);
            }}
            onBlur={() => setTimeout(() => setCountryOpen(false), 150)}
            placeholder="Např. Česko"
            autoComplete="off"
            readOnly={Boolean(existingBeerId)}
            style={{
              ...inputStyle,
              opacity: existingBeerId ? 0.72 : 1,
            }}
          />

          {countryOpen && breweryCountry.trim().length >= 3 && countrySuggestions.length > 0 && (
            <div style={dropdownStyle}>
              {countrySuggestions.map((country) => (
                <button
                  key={country.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setBreweryCountry(country.name);
                    setCountryOpen(false);
                  }}
                  style={suggestionButtonStyle}
                >
                  {country.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STYL */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Pivní styl</label>
        <div style={{ position: "relative" }}>
          <input
            name="style"
            value={styleName}
            onChange={(event) => {
              setStyleName(event.target.value);
              setStyleOpen(true);
            }}
            onFocus={() => {
              if (!existingBeerId) setStyleOpen(true);
            }}
            onBlur={() => setTimeout(() => setStyleOpen(false), 150)}
            placeholder="Např. Ležák"
            autoComplete="off"
            readOnly={Boolean(existingBeerId)}
            style={{
              ...inputStyle,
              opacity: existingBeerId ? 0.72 : 1,
            }}
          />

          {styleOpen && styleName.trim().length >= 3 && styleSuggestions.length > 0 && (
            <div style={dropdownStyle}>
              {styleSuggestions.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectStyle(style)}
                  style={suggestionButtonStyle}
                >
                  {style.name}
                  {style.aliases.length > 0 && ` (${style.aliases.join(", ")})`}
                </button>
              ))}
            </div>
          )}

          {styleOpen && styleName.trim().length >= 3 && styleSuggestions.length === 0 && (
            <div style={dropdownStyle}>
              <div style={{ padding: "10px 12px", color: "var(--taste-text-muted)" }}>
                Tento styl není v katalogu.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PARAMETRY PIVA */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "12px",
        }}
      >
        <div style={fieldStyle}>
          <label style={labelStyle}>Stupňovitost °P</label>
          <input
            type="number"
            name="plato"
            step="0.01"
            value={plato}
            onChange={(event) => setPlato(event.target.value)}
            placeholder="11.7"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Alkohol %</label>
          <input
            type="number"
            name="abv"
            step="0.01"
            value={abv}
            onChange={(event) => setAbv(event.target.value)}
            placeholder="4.6"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>IBU</label>
          <input
            type="number"
            name="ibu"
            step="0.1"
            value={ibu}
            onChange={(event) => setIbu(event.target.value)}
            placeholder="35"
            style={inputStyle}
          />
        </div>
      </div>

      <label
        style={{
          ...fieldStyle,
          display: "flex",
          alignItems: "center",
          gap: "9px",
          cursor: existingBeerId ? "default" : "pointer",
        }}
      >
        <input
          name="isNonAlcoholic"
          type="checkbox"
          checked={isNonAlcoholic}
          disabled={Boolean(existingBeerId)}
          onChange={(event) => setIsNonAlcoholic(event.target.checked)}
        />
        <span><strong>Nealkoholické pivo</strong></span>
      </label>

      {/* CHMELY */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Chmely</label>

        {selectedHops.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
            {selectedHops.map((hop) => (
              <div
                key={hop}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  border: "1px solid rgba(127,127,127,0.5)",
                  borderRadius: "999px",
                  fontSize: "14px",
                }}
              >
                {hop}
                {!existingBeerId && (
                  <button
                    type="button"
                    onClick={() => removeHop(hop)}
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      color: "inherit",
                      padding: 0,
                      fontSize: "16px",
                    }}
                  >
                    ×
                  </button>
                )}
                <input type="hidden" name="hops" value={hop} />
              </div>
            ))}
          </div>
        )}

        <div style={{ position: "relative" }}>
          <input
            value={hopValue}
            onChange={(event) => {
              setHopValue(event.target.value);
              setHopOpen(true);
            }}
            onFocus={() => {
              if (!existingBeerId) setHopOpen(true);
            }}
            onBlur={() => setTimeout(() => setHopOpen(false), 150)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && hopValue.trim()) {
                event.preventDefault();
                if (hopSuggestions.length > 0) addHop(hopSuggestions[0].name);
              }
            }}
            placeholder={existingBeerId ? "Chmely jsou převzaté z katalogu" : "Např. Citra"}
            autoComplete="off"
            disabled={Boolean(existingBeerId)}
            style={{
              ...inputStyle,
              opacity: existingBeerId ? 0.72 : 1,
            }}
          />

          {hopOpen && hopValue.trim().length >= 3 && hopSuggestions.length > 0 && (
            <div style={dropdownStyle}>
              {hopSuggestions.map((hop) => (
                <button
                  key={hop.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => addHop(hop.name)}
                  style={suggestionButtonStyle}
                >
                  {hop.name}
                  {hop.aliases.length > 0 && ` (${hop.aliases.join(", ")})`}
                </button>
              ))}
            </div>
          )}

          {hopOpen && hopValue.trim().length >= 3 && hopSuggestions.length === 0 && (
            <div style={dropdownStyle}>
              <div style={{ padding: "10px 12px", color: "var(--taste-text-muted)" }}>
                Tento chmel není v katalogu.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OCHUTNÁVKA */}
      <hr style={{ margin: "32px 0", opacity: 0.3 }} />
      <h2 style={{ marginBottom: "20px" }}>Ochutnávka</h2>

      <div style={fieldStyle}>
        <label style={labelStyle}>Datum ochutnávky *</label>
        <input
          type="date"
          name="tastedOn"
          defaultValue={getTodayDate()}
          required
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Podání / obal</label>
        <select name="packaging" defaultValue="" style={inputStyle}>
          <option value="">Nezadáno</option>
          {PACKAGING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.icon} {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Počet *</label>
        <input
          type="number"
          name="quantity"
          min="1"
          step="1"
          defaultValue="1"
          required
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Místo</label>
        <input
          name="place"
          placeholder="Např. doma, hospoda, festival..."
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        style={{
          width: "100%",
          padding: "14px 18px",
          border: "1px solid currentColor",
          borderRadius: "10px",
          background: "transparent",
          color: "inherit",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
          marginTop: "8px",
        }}
      >
        🍺 Uložit ochutnávku
      </button>
    </form>
  );
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const fieldStyle = {
  marginBottom: "20px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontWeight: "bold",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  border: "1px solid rgba(127,127,127,0.5)",
  borderRadius: "8px",
  background: "transparent",
  color: "inherit",
  fontSize: "16px",
};

const dropdownStyle = {
  position: "absolute" as const,
  zIndex: 50,
  left: 0,
  right: 0,
  top: "calc(100% + 4px)",
  background: "white",
  color: "#111",
  border: "1px solid #ccc",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
};

const suggestionButtonStyle = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  border: 0,
  borderBottom: "1px solid #eee",
  background: "white",
  color: "#111",
  textAlign: "left" as const,
  cursor: "pointer",
  fontSize: "15px",
};

const suggestionLabelStyle = {
  paddingTop: "2px",
  color: "#776b60",
  fontSize: "9px",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
};
