"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PACKAGING_OPTIONS } from "@/lib/packaging";

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

type Beer = {
  id: number;
  name: string;
  is_catalog?: boolean;

  brands?: {
    id: number;
    name: string;
  } | null;

  breweries: {
    id: number;
    name: string;
    country: string | null;
  } | null;

  beer_styles: {
    id: number;
    name: string;
  } | null;
};

type Tasting = {
  id: number;
  user_id: string;
  tasted_on: string;
  packaging: string | null;
  quantity: number | null;

  plato: number | null;
  abv: number | null;
  ibu: number | null;

  place: string | null;
  notes: string | null;

  beers: {
    id: number;
    name: string;

    brands?: {
      id: number;
      name: string;
    } | null;

    breweries: {
      id: number;
      name: string;
      country: string | null;
    } | null;

    beer_styles: {
      id: number;
      name: string;
    } | null;

    beer_hops:
      | {
          hops: {
            id: number;
            name: string;
          } | null;
        }[]
      | null;
  } | null;
};

type TastingOptions = {
  beers: Beer[];
  countries: Country[];
  styles: BeerStyle[];
  hops: Hop[];
};

type Props = {
  tasting: Tasting;

  updateTastingAction: (
    formData: FormData
  ) => Promise<{
    success: boolean;
  }>;

  deleteTastingAction: (
    tastingId: number
  ) => Promise<{
    success: boolean;
  }>;
};

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function EditTastingModalClient({
  tasting,
  updateTastingAction,
  deleteTastingAction,
}: Props) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [options, setOptions] =
    useState<TastingOptions | null>(null);

  const [loadingOptions, setLoadingOptions] =
    useState(false);

  const beers = options?.beers ?? [];
  const countries = options?.countries ?? [];
  const styles = options?.styles ?? [];
  const hops = options?.hops ?? [];

  async function loadOptions() {
    if (options || loadingOptions) {
      return;
    }

    setLoadingOptions(true);

    try {
      const response = await fetch("/api/tasting-options", {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ?? "Nepodařilo se načíst podklady pro úpravu."
        );
      }

      setOptions({
        beers: payload.beers ?? [],
        countries: payload.countries ?? [],
        styles: payload.styles ?? [],
        hops: payload.hops ?? [],
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Nepodařilo se načíst podklady pro úpravu."
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const initialBeerName =
    tasting.beers?.name ?? "";

  const initialBeerId =
    tasting.beers?.id
      ? String(tasting.beers.id)
      : "";

  const [beerName, setBeerName] =
    useState(initialBeerName);
  const [beerOpen, setBeerOpen] = useState(false);

  const [
    existingBeerId,
    setExistingBeerId,
  ] =
    useState(initialBeerId);

  const [breweryName, setBreweryName] =
    useState(
      tasting.beers?.breweries?.name ??
        ""
    );

  const [brandName, setBrandName] = useState(tasting.beers?.brands?.name ?? "");

  const [
    breweryCountry,
    setBreweryCountry,
  ] =
    useState(
      tasting.beers?.breweries
        ?.country ?? ""
    );

  const [styleName, setStyleName] =
    useState(
      tasting.beers?.beer_styles?.name ??
        ""
    );

  const [countryOpen, setCountryOpen] =
    useState(false);

  const [styleOpen, setStyleOpen] =
    useState(false);

  const [plato, setPlato] =
    useState(
      tasting.plato !== null
        ? String(tasting.plato)
        : ""
    );

  const [abv, setAbv] =
    useState(
      tasting.abv !== null
        ? String(tasting.abv)
        : ""
    );

  const [ibu, setIbu] =
    useState(
      tasting.ibu !== null
        ? String(tasting.ibu)
        : ""
    );

  const initialHops =
    tasting.beers?.beer_hops
      ?.map(
        (beerHop) =>
          beerHop.hops?.name
      )
      .filter(
        (name): name is string =>
          Boolean(name)
      ) ?? [];

  const [
    selectedHops,
    setSelectedHops,
  ] = useState<string[]>(
    initialHops
  );

  const [
    hopValue,
    setHopValue,
  ] = useState("");

  const [
    hopOpen,
    setHopOpen,
  ] = useState(false);

  const hopSuggestions =
    hops.filter((hop) => {
      if (
        hopValue.trim().length < 3
      ) {
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

      const query =
        normalizeText(hopValue);

      return (
        normalizeText(
          hop.name
        ).includes(query) ||
        hop.aliases.some(
          (alias) =>
            normalizeText(
              alias
            ).includes(query)
        )
      );
    });

  function addHop(hop: Hop) {
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

    if (!alreadySelected) {
      setSelectedHops(
        (current) => [
          ...current,
          hop.name,
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

  const countrySuggestions =
    countries.filter((country) => {
      if (
        breweryCountry.trim().length < 3
      ) {
        return false;
      }

      return normalizeText(
        country.name
      ).includes(
        normalizeText(
          breweryCountry
        )
      );
    });

  function selectCountry(
    country: Country
  ) {
    setBreweryCountry(country.name);
    setCountryOpen(false);
  }

  const styleSuggestions =
    styles.filter((style) => {
      if (
        styleName.trim().length < 3
      ) {
        return false;
      }

      const query =
        normalizeText(styleName);

      return (
        normalizeText(
          style.name
        ).includes(query) ||
        style.aliases.some(
          (alias) =>
            normalizeText(
              alias
            ).includes(query)
        )
      );
    });

  function selectStyle(
    style: BeerStyle
  ) {
    setStyleName(style.name);
    setStyleOpen(false);
  }

  function handleBeerNameChange(
    value: string
  ) {
    setBeerName(value);

    if (
      normalizeText(value) ===
      normalizeText(initialBeerName)
    ) {
      setExistingBeerId(
        initialBeerId
      );
    } else {
      setExistingBeerId("");
    }
  }

  const beerQuery = normalizeText(beerName);
  const beerSuggestions = beerQuery.length >= 3
    ? beers
        .filter((beer) =>
          normalizeText(beer.name).includes(beerQuery) ||
          normalizeText(beer.brands?.name ?? "").includes(beerQuery)
        )
        .sort((a, b) => {
          const aDirect = normalizeText(a.name).includes(beerQuery);
          const bDirect = normalizeText(b.name).includes(beerQuery);
          if (aDirect !== bDirect) return aDirect ? -1 : 1;
          if (Boolean(a.is_catalog) !== Boolean(b.is_catalog)) {
            return a.is_catalog ? -1 : 1;
          }
          return a.name.localeCompare(b.name, "cs");
        })
    : [];

  function selectBeer(beer: Beer) {
    setExistingBeerId(String(beer.id));
    setBeerName(beer.name);
    setBreweryName(beer.breweries?.name ?? "");
    setBrandName(beer.brands?.name ?? "");
    setBreweryCountry(beer.breweries?.country ?? "");
    setStyleName(beer.beer_styles?.name ?? "");
    setBeerOpen(false);
  }

  async function handleUpdate(
    formData: FormData
  ) {
    setSaving(true);
    setError("");

    try {
      const result =
        await updateTastingAction(
          formData
        );

      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nepodařilo se uložit změny."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Opravdu chcete tuto ochutnávku smazat?"
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const result =
        await deleteTastingAction(
          tasting.id
        );

      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nepodařilo se ochutnávku smazat."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
          void loadOptions();
        }}
        style={editButtonStyle}
      >
        ✏️ Upravit
      </button>

      {open && (
        <div
          style={overlayStyle}
        >
          <div
            style={modalStyle}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            {/* ==================================================
                HLAVIČKA
            ================================================== */}

            <div
              style={{
                position:
                  "relative",
                padding:
                  "18px 20px 16px",
                borderBottom:
                  "1px solid var(--taste-border)",
              }}
            >
              <div
                className="taste-label"
                style={{
                  marginBottom:
                    "5px",
                  fontSize:
                    "9px",
                }}
              >
                Úprava záznamu
              </div>

              <h2
                style={{
                  margin: 0,
                  paddingRight:
                    "45px",
                  fontSize:
                    "23px",
                  lineHeight: 1.1,
                  fontWeight: 800,
                  letterSpacing:
                    "-0.03em",
                }}
              >
                Upravit ochutnávku
              </h2>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  maxWidth:
                    "430px",
                  color:
                    "var(--taste-text-muted)",
                  fontSize:
                    "11px",
                  lineHeight:
                    1.45,
                }}
              >
                Uprav údaje uložené ochutnávky.
              </p>

              <button
                type="button"
                aria-label="Zavřít"
                onClick={() =>
                  setOpen(false)
                }
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding:
                  "16px 20px 20px",
              }}
            >
            {loadingOptions && (
              <div
                style={{
                  marginBottom: "18px",
                  padding: "10px 12px",
                  border: "1px solid var(--taste-border)",
                  borderRadius: "10px",
                  color: "var(--taste-text-muted)",
                  fontSize: "12px",
                }}
              >
                Načítám nabídku piv, stylů a chmelů…
              </div>
            )}

            {error && (
              <div
                style={{
                  marginBottom: "18px",
                  padding: "12px 14px",
                  border:
                    "1px solid rgba(220,70,70,0.5)",
                  borderRadius: "10px",
                  background:
                    "rgba(220,70,70,0.08)",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            {/* ==================================================
                EDITAČNÍ FORMULÁŘ
            ================================================== */}

            <form action={handleUpdate}>
              <input
                type="hidden"
                name="tastingId"
                value={tasting.id}
              />

              <input
                type="hidden"
                name="existingBeerId"
                value={existingBeerId}
              />

              {/* PIVO */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Pivo *
                </label>

                <div style={{ position: "relative" }}>
                  <input
                    name="beerName"
                    value={beerName}
                    onChange={(event) => {
                      handleBeerNameChange(event.target.value);
                      setBeerOpen(true);
                    }}
                    onFocus={() => setBeerOpen(true)}
                    onBlur={() => setTimeout(() => setBeerOpen(false), 150)}
                    required
                    autoComplete="off"
                    style={inputStyle}
                  />
                  {beerOpen && beerSuggestions.length > 0 && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      zIndex: 60,
                      maxHeight: "280px",
                      overflowY: "auto",
                      border: "1px solid var(--taste-border-strong)",
                      borderRadius: "8px",
                      background: "var(--taste-surface-raised)",
                      boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                    }}>
                      {beerSuggestions.slice(0, 50).map((beer) => (
                        <button
                          key={beer.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectBeer(beer)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "9px 12px",
                            border: 0,
                            borderBottom: "1px solid var(--taste-border)",
                            background: "transparent",
                            color: "var(--taste-text)",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <strong>{beer.name}</strong>
                          <span style={{ display: "block", marginTop: "3px", color: "var(--taste-text-muted)", fontSize: "11px" }}>
                            {beer.brands?.name ? `${beer.brands.name} · ` : ""}
                            {beer.breweries?.name ?? "Neznámý pivovar"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!existingBeerId && beerName.trim() && (
                  <p style={{ margin: "5px 0 0", color: "var(--taste-text-muted)", fontSize: "11px" }}>
                    Pro změnu ochutnávky vyber konkrétní pivo z nabídky.
                  </p>
                )}
              </div>

              <input
                type="hidden"
                name="brewery"
                value={breweryName}
              />

              <div style={fieldStyle}>
                <label style={labelStyle}>Značka</label>
                <input name="brandName" value={brandName} readOnly aria-readonly="true" style={{ ...inputStyle, color: "var(--taste-text-muted)", background: "rgba(255,255,255,.025)" }} />
              </div>

              {/* PARAMETRY */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                <div style={fieldStyle}>
                  <label
                    style={labelStyle}
                  >
                    Stupňovitost °P
                  </label>

                  <input
                    type="number"
                    name="plato"
                    step="0.01"
                    value={plato}
                    onChange={(event) =>
                      setPlato(
                        event.target.value
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label
                    style={labelStyle}
                  >
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
                    style={inputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label
                    style={labelStyle}
                  >
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
                    style={inputStyle}
                  />
                </div>
              </div>

              <hr
                style={{
                  margin: "30px 0",
                  opacity: 0.25,
                }}
              />

              <h3
                style={{
                  margin:
                    "0 0 18px",
                }}
              >
                Ochutnávka
              </h3>

              {/* DATUM */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Datum ochutnávky *
                </label>

                <input
                  type="date"
                  name="tastedOn"
                  defaultValue={
                    tasting.tasted_on
                  }
                  required
                  style={inputStyle}
                />
              </div>

              {/* OBAL */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Podání / obal
                </label>

                <select
                  name="packaging"
                  defaultValue={
                    tasting.packaging ??
                    ""
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Nezadáno
                  </option>

                  {PACKAGING_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={
                          option.value
                        }
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
                  defaultValue={
                    tasting.quantity ??
                    1
                  }
                  required
                  style={inputStyle}
                />
              </div>

      <button
                type="submit"
                disabled={
                  saving ||
                  deleting
                }
                style={{
                  ...saveButtonStyle,
                  opacity:
                    saving ||
                    deleting
                      ? 0.55
                      : 1,
                }}
              >
                {saving
                  ? "Ukládám..."
                  : "💾 Uložit změny"}
              </button>
            </form>

            {/* ==================================================
                SMAZÁNÍ
            ================================================== */}

            <div
              style={{
                marginTop: "28px",
                paddingTop: "22px",
                borderTop:
                  "1px solid rgba(127,127,127,0.2)",
              }}
            >
              <button
                type="button"
                onClick={
                  handleDelete
                }
                disabled={
                  deleting ||
                  saving
                }
                style={{
                  ...deleteButtonStyle,
                  opacity:
                    deleting ||
                    saving
                      ? 0.55
                      : 1,
                }}
              >
                {deleting
                  ? "Mažu..."
                  : "🗑 Smazat ochutnávku"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
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

const editButtonStyle = {
  padding: "7px 10px",
  border:
    "1px solid rgba(127,127,127,0.35)",
  borderRadius: "8px",
  background:
    "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: "12px",
  whiteSpace:
    "nowrap" as const,
};

const closeButtonStyle = {
  position:
    "absolute" as const,
  top: "16px",
  right: "17px",
  width: "33px",
  height: "33px",
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  border:
    "1px solid var(--taste-border)",
  borderRadius: "9px",
  background:
    "rgba(255,255,255,0.025)",
  color:
    "var(--taste-text-muted)",
  cursor: "pointer",
  fontSize: "20px",
  lineHeight: 1,
};

const saveButtonStyle = {
  width: "100%",
  padding: "14px 18px",
  border:
    "1px solid currentColor",
  borderRadius: "10px",
  background:
    "transparent",
  color: "inherit",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
};

const deleteButtonStyle = {
  width: "100%",
  padding: "12px 16px",
  border:
    "1px solid rgba(220,70,70,0.65)",
  borderRadius: "10px",
  background:
    "rgba(220,70,70,0.06)",
  color: "inherit",
  cursor: "pointer",
  fontWeight: "bold",
};

const overlayStyle = {
  position:
    "fixed" as const,
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  padding: "18px",
  overflowY:
    "auto" as const,
  background:
    "rgba(5, 4, 3, 0.80)",
  backdropFilter:
    "blur(18px)",
  WebkitBackdropFilter:
    "blur(18px)",
};

const modalStyle = {
  position:
    "relative" as const,
  width: "100%",
  maxWidth: "560px",
  maxHeight: "86vh",
  overflowY:
    "auto" as const,
  overscrollBehavior:
    "contain" as const,
  border:
    "1px solid var(--taste-border-strong)",
  borderRadius:
    "var(--taste-radius-lg)",
  background: `
    radial-gradient(
      circle at 88% 0%,
      rgba(231,166,47,0.09),
      transparent 18rem
    ),
    linear-gradient(
      145deg,
      rgba(255,255,255,0.018),
      transparent 42%
    ),
    var(--taste-surface-raised)
  `,
  color:
    "var(--taste-text)",
  boxShadow:
    "0 30px 90px rgba(0,0,0,0.68)",
};
