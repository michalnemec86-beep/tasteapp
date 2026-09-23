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

type TastingFormProps = {
  saveTastingAction: (
    formData: FormData
  ) => void | Promise<void>;

  beers: ExistingBeer[];
  breweries: Brewery[];
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
  const [breweryOpen, setBreweryOpen] = useState(false);
  const [showCollaborationField, setShowCollaborationField] = useState(false);
  const [collaboratorQuery, setCollaboratorQuery] = useState("");
  const [collaboratorOpen, setCollaboratorOpen] = useState(false);
  const [selectedCollaborators, setSelectedCollaborators] = useState<Brewery[]>([]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [hopOpen, setHopOpen] = useState(false);

  const brandOptions = useMemo(
    () =>
      [...new Set(
        beers
          .map((beer) => beer.brands?.name?.trim() ?? "")
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, "cs")),
    [beers]
  );

  // ==================================================
  // PIVO
  // ==================================================

  const beerSuggestions = beers
    .filter((beer) => {
      if (beerName.trim().length < 3) return false;
      const query = normalizeText(beerName);
      return (
        normalizeText(beer.name).includes(query) ||
        normalizeText(beer.brands?.name ?? "").includes(query)
      );
    })
    .sort((a, b) => {
      const selectedBrewery = normalizeText(breweryName);
      const aMatchesBrewery =
        selectedBrewery.length > 0 &&
        normalizeText(a.breweries?.name ?? "") === selectedBrewery;
      const bMatchesBrewery =
        selectedBrewery.length > 0 &&
        normalizeText(b.breweries?.name ?? "") === selectedBrewery;

      if (aMatchesBrewery !== bMatchesBrewery) {
        return aMatchesBrewery ? -1 : 1;
      }

      if (Boolean(a.is_catalog) !== Boolean(b.is_catalog)) {
        return a.is_catalog ? -1 : 1;
      }

      return a.name.localeCompare(b.name, "cs", { sensitivity: "base" });
    });

  function selectBeer(beer: ExistingBeer) {
    setExistingBeerId(String(beer.id));
    setBeerName(beer.name);
    setBrandName(beer.brands?.name ?? "");
    setBreweryName(beer.breweries?.name ?? "");
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
  }

  function findExactBeer(breweryValue = breweryName) {
    const sameName = beers.filter(
      (beer) => normalizeText(beer.name) === normalizeText(beerName)
    );
    const normalizedBrewery = normalizeText(breweryValue);

    if (normalizedBrewery) {
      return (
        sameName.find(
          (beer) =>
            normalizeText(beer.breweries?.name ?? "") === normalizedBrewery
        ) ?? null
      );
    }

    return sameName.length === 1 ? sameName[0] : null;
  }

  function changeBeerName(value: string) {
    setBeerName(value);

    if (existingBeerId) {
      setExistingBeerId("");
      setBrandName("");
      setBreweryName("");
      setBreweryCountry("");
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
    const exactBeer = findExactBeer(brewery.name);
    if (exactBeer) {
      selectBeer(exactBeer);
      return;
    }

    setBreweryName(brewery.name);
    setBreweryCountry(brewery.country ?? "");
    setBreweryOpen(false);
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
            placeholder="Např. Kozel 11°"
            autoComplete="off"
            required
            style={inputStyle}
          />

          {beerOpen && beerName.trim().length >= 3 && beerSuggestions.length > 0 && (
            <div style={dropdownStyle}>
              {beerSuggestions.map((beer) => (
                <button
                  key={beer.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectBeer(beer)}
                  style={suggestionButtonStyle}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "54px minmax(0, 1fr)",
                      columnGap: "8px",
                      rowGap: "3px",
                      textAlign: "left",
                    }}
                  >
                    <span style={suggestionLabelStyle}>Pivo</span>
                    <strong>{beer.name}</strong>
                    {beer.brands?.name && (
                      <>
                        <span style={suggestionLabelStyle}>Značka</span>
                        <span style={{ fontSize: "12px", opacity: 0.82 }}>
                          {beer.brands.name}
                          {beer.is_catalog ? " · katalogové" : ""}
                        </span>
                      </>
                    )}
                    {beer.breweries?.name && (
                      <>
                        <span style={suggestionLabelStyle}>Pivovar</span>
                        <span style={{ fontSize: "12px", opacity: 0.72 }}>
                          {beer.breweries.name}
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

      {/* ZNAČKA */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Značka {!existingBeerId ? "*" : ""}
        </label>
        <input
          name="brandName"
          list="tasting-brand-options"
          value={brandName}
          onChange={(event) => setBrandName(event.target.value)}
          placeholder="Např. Kozel"
          autoComplete="off"
          required={!existingBeerId}
          readOnly={Boolean(existingBeerId)}
          style={{
            ...inputStyle,
            opacity: existingBeerId ? 0.72 : 1,
          }}
        />
        <datalist id="tasting-brand-options">
          {brandOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div
          style={{
            marginTop: "5px",
            color: "var(--taste-text-muted)",
            fontSize: "10px",
            lineHeight: 1.4,
          }}
        >
          {existingBeerId
            ? "Značka je předvyplněná podle vybraného piva z katalogu."
            : "Značka je obchodní označení; název piva označuje konkrétní pivo."}
        </div>
      </div>

      {/* PIVOVAR */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Pivovar *</label>
        <div style={{ position: "relative" }}>
          <input
            name="brewery"
            value={breweryName}
            onChange={(event) => {
              setBreweryName(event.target.value);
              setBreweryOpen(true);
            }}
            onFocus={() => {
              if (!existingBeerId) setBreweryOpen(true);
            }}
            onBlur={() => setTimeout(() => setBreweryOpen(false), 150)}
            placeholder="Např. Velkopopovický pivovar"
            autoComplete="off"
            required
            readOnly={Boolean(existingBeerId)}
            style={{
              ...inputStyle,
              opacity: existingBeerId ? 0.72 : 1,
            }}
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
