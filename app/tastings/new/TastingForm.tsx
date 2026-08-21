"use client";

import { useState } from "react";
import { PACKAGING_OPTIONS } from "@/lib/packaging";

type Brewery = {
  id: number;
  name: string;
  country?: string | null;
};

type BeerStyle = {
  id: number;
  name: string;
};

type Hop = {
  id: number;
  name: string;
};

type ExistingBeer = {
  id: number;
  name: string;
  plato: number | null;
  abv: number | null;
  ibu: number | null;

  breweries: {
    id: number;
    name: string;
    country?: string | null;
  } | null;

  beer_styles: {
    id: number;
    name: string;
  } | null;
};

type TastingFormProps = {
  saveTastingAction: (
    formData: FormData
  ) => void | Promise<void>;

  beers: ExistingBeer[];
  breweries: Brewery[];
  styles: BeerStyle[];
  hops: Hop[];
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
  styles,
  hops,
}: TastingFormProps) {
  const [
    beerName,
    setBeerName,
  ] = useState("");

  const [
    existingBeerId,
    setExistingBeerId,
  ] = useState("");

  const [
    breweryName,
    setBreweryName,
  ] = useState("");

  const [
    breweryCountry,
    setBreweryCountry,
  ] = useState("");

  const [
    styleName,
    setStyleName,
  ] = useState("");

  const [
    plato,
    setPlato,
  ] = useState("");

  const [
    abv,
    setAbv,
  ] = useState("");

  const [
    ibu,
    setIbu,
  ] = useState("");

  const [
    selectedHops,
    setSelectedHops,
  ] = useState<string[]>([]);

  const [
    hopValue,
    setHopValue,
  ] = useState("");

  const [
    beerOpen,
    setBeerOpen,
  ] = useState(false);

  const [
    breweryOpen,
    setBreweryOpen,
  ] = useState(false);

  const [
    countryOpen,
    setCountryOpen,
  ] = useState(false);

  const [
    styleOpen,
    setStyleOpen,
  ] = useState(false);

  const [
    hopOpen,
    setHopOpen,
  ] = useState(false);

  // ==================================================
  // PIVO
  // ==================================================

  const beerSuggestions =
    beers.filter(
      (beer) => {
        if (!beerName.trim()) {
          return false;
        }

        return normalizeText(
          beer.name
        ).includes(
          normalizeText(
            beerName
          )
        );
      }
    );

  function selectBeer(
    beer: ExistingBeer
  ) {
    setExistingBeerId(
      String(beer.id)
    );

    setBeerName(
      beer.name
    );

    setBreweryName(
      beer.breweries?.name ?? ""
    );

    setBreweryCountry(
      beer.breweries?.country ?? ""
    );

    setStyleName(
      beer.beer_styles?.name ?? ""
    );

    setPlato(
      beer.plato !== null
        ? String(beer.plato)
        : ""
    );

    setAbv(
      beer.abv !== null
        ? String(beer.abv)
        : ""
    );

    setIbu(
      beer.ibu !== null
        ? String(beer.ibu)
        : ""
    );

    setBeerOpen(false);
  }

  function changeBeerName(
    value: string
  ) {
    setBeerName(value);

    if (existingBeerId) {
      setExistingBeerId("");
      setBreweryName("");
      setBreweryCountry("");
      setStyleName("");
      setPlato("");
      setAbv("");
      setIbu("");
      setSelectedHops([]);
    }

    setBeerOpen(true);
  }

  // ==================================================
  // PIVOVAR
  // ==================================================

  const brewerySuggestions =
    breweries.filter(
      (brewery) => {
        if (!breweryName.trim()) {
          return false;
        }

        return normalizeText(
          brewery.name
        ).includes(
          normalizeText(
            breweryName
          )
        );
      }
    );

  function selectBrewery(
    brewery: Brewery
  ) {
    setBreweryName(
      brewery.name
    );

    setBreweryCountry(
      brewery.country ?? ""
    );

    setBreweryOpen(false);
  }

  // ==================================================
  // ZEMĚ
  // ==================================================

  const knownCountries =
    Array.from(
      new Map(
        breweries
          .filter(
            (
              brewery
            ): brewery is Brewery & {
              country: string;
            } =>
              Boolean(
                brewery.country?.trim()
              )
          )
          .map(
            (brewery) => [
              normalizeText(
                brewery.country
              ),
              brewery.country,
            ]
          )
      ).values()
    ).sort(
      (a, b) =>
        a.localeCompare(
          b,
          "cs"
        )
    );

  const countrySuggestions =
    knownCountries.filter(
      (country) => {
        if (
          !breweryCountry.trim()
        ) {
          return false;
        }

        return normalizeText(
          country
        ).includes(
          normalizeText(
            breweryCountry
          )
        );
      }
    );

  // ==================================================
  // STYL
  // ==================================================

  const styleSuggestions =
    styles.filter(
      (style) => {
        if (!styleName.trim()) {
          return false;
        }

        return normalizeText(
          style.name
        ).includes(
          normalizeText(
            styleName
          )
        );
      }
    );

  function selectStyle(
    style: BeerStyle
  ) {
    setStyleName(
      style.name
    );

    setStyleOpen(false);
  }

  // ==================================================
  // CHMELY
  // ==================================================

  const hopSuggestions =
    hops.filter(
      (hop) => {
        if (!hopValue.trim()) {
          return false;
        }

        const alreadySelected =
          selectedHops.some(
            (selectedHop) =>
              normalizeText(
                selectedHop
              ) ===
              normalizeText(
                hop.name
              )
          );

        if (alreadySelected) {
          return false;
        }

        return normalizeText(
          hop.name
        ).includes(
          normalizeText(
            hopValue
          )
        );
      }
    );

  function addHop(
    name: string
  ) {
    const cleanName =
      name.trim();

    if (!cleanName) {
      return;
    }

    const alreadySelected =
      selectedHops.some(
        (selectedHop) =>
          normalizeText(
            selectedHop
          ) ===
          normalizeText(
            cleanName
          )
      );

    if (!alreadySelected) {
      setSelectedHops(
        (current) => [
          ...current,
          cleanName,
        ]
      );
    }

    setHopValue("");
    setHopOpen(false);
  }

  function removeHop(
    name: string
  ) {
    setSelectedHops(
      (current) =>
        current.filter(
          (hop) =>
            normalizeText(hop) !==
            normalizeText(name)
        )
    );
  }

  return (
    <form
      action={saveTastingAction}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          event.target instanceof HTMLInputElement
        ) {
          event.preventDefault();
        }
      }}
    >
      <input
        type="hidden"
        name="existingBeerId"
        value={existingBeerId}
      />

      {/* ==================================================
          PIVO
      ================================================== */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Pivo *
        </label>

        <div
          style={{
            position: "relative",
          }}
        >
          <input
            name="beerName"
            value={beerName}
            onChange={(event) =>
              changeBeerName(
                event.target.value
              )
            }
            onFocus={() =>
              setBeerOpen(true)
            }
            onBlur={() => {
              setTimeout(() => {
                setBeerOpen(false);
              }, 150);
            }}
            placeholder="Např. Originál"
            autoComplete="off"
            required
            style={inputStyle}
          />

          {beerOpen &&
            beerName.trim() &&
            beerSuggestions.length >
              0 && (
              <div style={dropdownStyle}>
                {beerSuggestions.map(
                  (beer) => (
                    <button
                      key={beer.id}
                      type="button"
                      onMouseDown={(
                        event
                      ) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        selectBeer(
                          beer
                        )
                      }
                      style={
                        suggestionButtonStyle
                      }
                    >
                      <strong>
                        {beer.name}
                      </strong>

                      {beer.breweries
                        ?.name && (
                        <div
                          style={{
                            fontSize:
                              "13px",
                            opacity: 0.7,
                            marginTop:
                              "2px",
                          }}
                        >
                          {
                            beer
                              .breweries
                              .name
                          }
                        </div>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
        </div>
      </div>

      {/* ==================================================
          PIVOVAR
      ================================================== */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Pivovar *
        </label>

        <div
          style={{
            position: "relative",
          }}
        >
          <input
            name="brewery"
            value={breweryName}
            onChange={(event) => {
              setBreweryName(
                event.target.value
              );

              setBreweryOpen(true);
            }}
            onFocus={() =>
              setBreweryOpen(true)
            }
            onBlur={() => {
              setTimeout(() => {
                setBreweryOpen(false);
              }, 150);
            }}
            placeholder="Např. Březí koza"
            autoComplete="off"
            required
            style={inputStyle}
          />

          {breweryOpen &&
            breweryName.trim() &&
            brewerySuggestions.length >
              0 && (
              <div style={dropdownStyle}>
                {brewerySuggestions.map(
                  (brewery) => (
                    <button
                      key={brewery.id}
                      type="button"
                      onMouseDown={(
                        event
                      ) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        selectBrewery(
                          brewery
                        )
                      }
                      style={
                        suggestionButtonStyle
                      }
                    >
                      {brewery.name}

                      {brewery.country && (
                        <div
                          style={{
                            fontSize:
                              "12px",
                            opacity: 0.65,
                            marginTop:
                              "2px",
                          }}
                        >
                          {
                            brewery.country
                          }
                        </div>
                      )}
                    </button>
                  )
                )}
              </div>
            )}

          {breweryOpen &&
            breweryName.trim() &&
            brewerySuggestions.length ===
              0 && (
              <div style={dropdownStyle}>
                <div
                  style={{
                    padding:
                      "10px 12px",
                  }}
                >
                  ＋ Nový pivovar:{" "}
                  <strong>
                    {breweryName}
                  </strong>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* ==================================================
          ZEMĚ
      ================================================== */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Země původu pivovaru
        </label>

        <div
          style={{
            position: "relative",
          }}
        >
          <input
            name="breweryCountry"
            value={breweryCountry}
            onChange={(event) => {
              setBreweryCountry(
                event.target.value
              );

              setCountryOpen(true);
            }}
            onFocus={() =>
              setCountryOpen(true)
            }
            onBlur={() => {
              setTimeout(() => {
                setCountryOpen(false);
              }, 150);
            }}
            placeholder="Např. Česko"
            autoComplete="off"
            style={inputStyle}
          />

          {countryOpen &&
            breweryCountry.trim() &&
            countrySuggestions.length >
              0 && (
              <div style={dropdownStyle}>
                {countrySuggestions.map(
                  (country) => (
                    <button
                      key={country}
                      type="button"
                      onMouseDown={(
                        event
                      ) =>
                        event.preventDefault()
                      }
                      onClick={() => {
                        setBreweryCountry(
                          country
                        );

                        setCountryOpen(
                          false
                        );
                      }}
                      style={
                        suggestionButtonStyle
                      }
                    >
                      {country}
                    </button>
                  )
                )}
              </div>
            )}
        </div>
      </div>

      {/* ==================================================
          STYL
      ================================================== */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Pivní styl
        </label>

        <div
          style={{
            position: "relative",
          }}
        >
          <input
            name="style"
            value={styleName}
            onChange={(event) => {
              setStyleName(
                event.target.value
              );

              setStyleOpen(true);
            }}
            onFocus={() =>
              setStyleOpen(true)
            }
            onBlur={() => {
              setTimeout(() => {
                setStyleOpen(false);
              }, 150);
            }}
            placeholder="Např. Ležák"
            autoComplete="off"
            style={inputStyle}
          />

          {styleOpen &&
            styleName.trim() &&
            styleSuggestions.length >
              0 && (
              <div style={dropdownStyle}>
                {styleSuggestions.map(
                  (style) => (
                    <button
                      key={style.id}
                      type="button"
                      onMouseDown={(
                        event
                      ) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        selectStyle(
                          style
                        )
                      }
                      style={
                        suggestionButtonStyle
                      }
                    >
                      {style.name}
                    </button>
                  )
                )}
              </div>
            )}

          {styleOpen &&
            styleName.trim() &&
            styleSuggestions.length ===
              0 && (
              <div style={dropdownStyle}>
                <div
                  style={{
                    padding:
                      "10px 12px",
                  }}
                >
                  ＋ Nový styl:{" "}
                  <strong>
                    {styleName}
                  </strong>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* ==================================================
          PARAMETRY PIVA
      ================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: "12px",
        }}
      >
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Stupňovitost °P
          </label>

          <input
            type="number"
            name="plato"
            step="0.1"
            value={plato}
            onChange={(event) =>
              setPlato(
                event.target.value
              )
            }
            placeholder="11.7"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Alkohol %
          </label>

          <input
            type="number"
            name="abv"
            step="0.01"
            value={abv}
            onChange={(event) =>
              setAbv(
                event.target.value
              )
            }
            placeholder="4.6"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            IBU
          </label>

          <input
            type="number"
            name="ibu"
            step="0.1"
            value={ibu}
            onChange={(event) =>
              setIbu(
                event.target.value
              )
            }
            placeholder="35"
            style={inputStyle}
          />
        </div>
      </div>

      {/* ==================================================
          CHMELY
      ================================================== */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Chmely
        </label>

        {selectedHops.length >
          0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "10px",
            }}
          >
            {selectedHops.map(
              (hop) => (
                <div
                  key={hop}
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: "6px",
                    padding:
                      "6px 10px",
                    border:
                      "1px solid rgba(127,127,127,0.5)",
                    borderRadius:
                      "999px",
                    fontSize:
                      "14px",
                  }}
                >
                  {hop}

                  <button
                    type="button"
                    onClick={() =>
                      removeHop(hop)
                    }
                    style={{
                      border: 0,
                      background:
                        "transparent",
                      cursor:
                        "pointer",
                      color:
                        "inherit",
                      padding: 0,
                      fontSize:
                        "16px",
                    }}
                  >
                    ×
                  </button>

                  <input
                    type="hidden"
                    name="hops"
                    value={hop}
                  />
                </div>
              )
            )}
          </div>
        )}

        <div
          style={{
            position: "relative",
          }}
        >
          <input
            value={hopValue}
            onChange={(event) => {
              setHopValue(
                event.target.value
              );

              setHopOpen(true);
            }}
            onFocus={() =>
              setHopOpen(true)
            }
            onBlur={() => {
              setTimeout(() => {
                setHopOpen(false);
              }, 150);
            }}
            onKeyDown={(event) => {
              if (
                event.key ===
                  "Enter" &&
                hopValue.trim()
              ) {
                event.preventDefault();

                if (
                  hopSuggestions.length >
                  0
                ) {
                  addHop(
                    hopSuggestions[0]
                      .name
                  );
                } else {
                  addHop(
                    hopValue
                  );
                }
              }
            }}
            placeholder="Např. Citra"
            autoComplete="off"
            style={inputStyle}
          />

          {hopOpen &&
            hopValue.trim() &&
            hopSuggestions.length >
              0 && (
              <div style={dropdownStyle}>
                {hopSuggestions.map(
                  (hop) => (
                    <button
                      key={hop.id}
                      type="button"
                      onMouseDown={(
                        event
                      ) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        addHop(
                          hop.name
                        )
                      }
                      style={
                        suggestionButtonStyle
                      }
                    >
                      {hop.name}
                    </button>
                  )
                )}
              </div>
            )}

          {hopOpen &&
            hopValue.trim() &&
            hopSuggestions.length ===
              0 && (
              <div style={dropdownStyle}>
                <button
                  type="button"
                  onMouseDown={(event) =>
                    event.preventDefault()
                  }
                  onClick={() =>
                    addHop(
                      hopValue
                    )
                  }
                  style={
                    suggestionButtonStyle
                  }
                >
                  ＋ Nový chmel:{" "}
                  <strong>
                    {hopValue}
                  </strong>
                </button>
              </div>
            )}
        </div>
      </div>

      {/* ==================================================
          OCHUTNÁVKA
      ================================================== */}

      <hr
        style={{
          margin: "32px 0",
          opacity: 0.3,
        }}
      />

      <h2
        style={{
          marginBottom: "20px",
        }}
      >
        Ochutnávka
      </h2>

      {/* DATUM */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Datum ochutnávky *
        </label>

        <input
          type="date"
          name="tastedOn"
          defaultValue={
            getTodayDate()
          }
          required
          style={inputStyle}
        />
      </div>

      {/* PODÁNÍ / OBAL */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Podání / obal
        </label>

        <select
          name="packaging"
          defaultValue=""
          style={inputStyle}
        >
          <option value="">
            Nezadáno
          </option>

          {PACKAGING_OPTIONS.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.icon}{" "}
                {option.label}
              </option>
            )
          )}
        </select>
      </div>

      {/* POČET */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Počet *
        </label>

        <input
          type="number"
          name="quantity"
          min="1"
          step="1"
          defaultValue="1"
          required
          style={inputStyle}
        />

        <div
          style={{
            marginTop: "6px",
            fontSize: "12px",
            opacity: 0.55,
          }}
        >
          Kolikrát bylo toto pivo
          v rámci této akce vypito.
        </div>
      </div>

      {/* MÍSTO */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Místo
        </label>

        <input
          name="place"
          placeholder="Např. doma, hospoda, festival..."
          style={inputStyle}
        />
      </div>

      {/* POZNÁMKA */}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Poznámka
        </label>

        <textarea
          name="notes"
          rows={4}
          placeholder="Poznámka k této ochutnávce..."
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
        />
      </div>

      <button
        type="submit"
        style={{
          width: "100%",
          padding: "14px 18px",
          border:
            "1px solid currentColor",
          borderRadius: "10px",
          background:
            "transparent",
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

// ==================================================
// DNEŠNÍ DATUM
// ==================================================

function getTodayDate() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

// ==================================================
// STYLY
// ==================================================

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

  boxSizing:
    "border-box" as const,

  padding: "11px 12px",

  border:
    "1px solid rgba(127,127,127,0.5)",

  borderRadius: "8px",

  background:
    "transparent",

  color: "inherit",

  fontSize: "16px",
};

const dropdownStyle = {
  position:
    "absolute" as const,

  zIndex: 50,

  left: 0,
  right: 0,

  top:
    "calc(100% + 4px)",

  background:
    "white",

  color:
    "#111",

  border:
    "1px solid #ccc",

  borderRadius:
    "8px",

  overflow:
    "hidden",

  boxShadow:
    "0 6px 20px rgba(0,0,0,0.15)",
};

const suggestionButtonStyle = {
  display: "block",

  width: "100%",

  padding:
    "10px 12px",

  border: 0,

  borderBottom:
    "1px solid #eee",

  background:
    "white",

  color:
    "#111",

  textAlign:
    "left" as const,

  cursor:
    "pointer",

  fontSize:
    "15px",
};