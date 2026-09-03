"use client";

import {
  useState,
  type FormEvent,
} from "react";
import {
  createPortal,
} from "react-dom";
import {
  useRouter,
} from "next/navigation";

type BeerStyle = {
  id: number;
  name: string;
  aliases: string[] | null;
};

type Hop = {
  id: number;
  name: string;
  aliases: string[] | null;
};

type CatalogBeerCreateModalClientProps = {
  breweryName: string;
  styles: BeerStyle[];
  hops: Hop[];
  createBeerAction: (
    formData: FormData
  ) => Promise<{
    success: boolean;
    beerId: number;
  }>;
};

function normalizeText(
  text: string
) {
  return text
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

export default function CatalogBeerCreateModalClient({
  breweryName,
  styles,
  hops,
  createBeerAction,
}: CatalogBeerCreateModalClientProps) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    importText,
    setImportText,
  ] = useState("");

  const [
    importError,
    setImportError,
  ] = useState("");

  const [
    name,
    setName,
  ] = useState("");

  const [
    styleName,
    setStyleName,
  ] = useState("");

  const [
    styleOpen,
    setStyleOpen,
  ] = useState(false);

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
  ] = useState<string[]>(
    []
  );

  const [
    hopValue,
    setHopValue,
  ] = useState("");

  const [
    hopOpen,
    setHopOpen,
  ] = useState(false);

  const styleSuggestions =
    styles.filter(
      (style) => {
        if (
          styleName.trim()
            .length < 3
        ) {
          return false;
        }

        const query =
          normalizeText(
            styleName
          );

        return (
          normalizeText(
            style.name
          ).includes(
            query
          ) ||
          (
            style.aliases ??
            []
          ).some(
            (alias) =>
              normalizeText(
                alias
              ).includes(
                query
              )
          )
        );
      }
    );

  const hopSuggestions =
    hops.filter(
      (hop) => {
        if (
          hopValue.trim()
            .length < 3
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

        if (
          alreadySelected
        ) {
          return false;
        }

        const query =
          normalizeText(
            hopValue
          );

        return (
          normalizeText(
            hop.name
          ).includes(
            query
          ) ||
          (
            hop.aliases ??
            []
          ).some(
            (alias) =>
              normalizeText(
                alias
              ).includes(
                query
              )
          )
        );
      }
    );

  function addHop(
    hopName: string
  ) {
    const cleanName =
      hopName.trim();

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

    if (
      !alreadySelected
    ) {
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
    hopName: string
  ) {
    setSelectedHops(
      (current) =>
        current.filter(
          (item) =>
            normalizeText(
              item
            ) !==
            normalizeText(
              hopName
            )
        )
    );
  }

  function handleQuickImport() {
    setImportError("");
    setError("");

    if (!importText.trim()) {
      setImportError(
        "Nejdřív vlož JSON s údaji piva."
      );
      return;
    }

    try {
      const parsed: unknown =
        JSON.parse(
          importText
        );

      if (
        !parsed ||
        typeof parsed !==
          "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error(
          "JSON musí obsahovat jeden objekt piva."
        );
      }

      const data =
        parsed as Record<
          string,
          unknown
        >;

      function readText(
        key: string
      ) {
        const value =
          data[key];

        if (
          value === undefined ||
          value === null
        ) {
          return "";
        }

        if (
          typeof value !==
          "string"
        ) {
          throw new Error(
            `Pole „${key}“ musí být text.`
          );
        }

        return value.trim();
      }

      function readNumber(
        key: string
      ) {
        const value =
          data[key];

        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          return "";
        }

        if (
          typeof value !==
            "number" &&
          typeof value !==
            "string"
        ) {
          throw new Error(
            `Pole „${key}“ musí být číslo.`
          );
        }

        const normalized =
          typeof value ===
          "string"
            ? value
                .trim()
                .replace(
                  ",",
                  "."
                )
            : String(
                value
              );

        const numberValue =
          Number(
            normalized
          );

        if (
          !Number.isFinite(
            numberValue
          )
        ) {
          throw new Error(
            `Pole „${key}“ není platné číslo.`
          );
        }

        return String(
          numberValue
        );
      }

      function readHops() {
        const value =
          data.hops;

        if (
          value === undefined ||
          value === null
        ) {
          return [] as string[];
        }

        if (
          !Array.isArray(
            value
          )
        ) {
          throw new Error(
            "Pole „hops“ musí být pole názvů chmelů."
          );
        }

        return value.map(
          (
            item,
            index
          ) => {
            if (
              typeof item !==
              "string"
            ) {
              throw new Error(
                `Chmel na pozici ${index + 1} musí být text.`
              );
            }

            return item.trim();
          }
        ).filter(Boolean);
      }

      const importedName =
        readText("name");

      const importedStyle =
        readText("style");

      const importedPlato =
        readNumber(
          "plato"
        );

      const importedAbv =
        readNumber(
          "abv"
        );

      const importedIbu =
        readNumber(
          "ibu"
        );

      const importedHops =
        readHops();

      if (!importedName) {
        throw new Error(
          "V JSONu chybí název piva."
        );
      }

      let canonicalStyle =
        "";

      if (importedStyle) {
        const normalizedStyle =
          normalizeText(
            importedStyle
          );

        const matchingStyle =
          styles.find(
            (style) =>
              normalizeText(
                style.name
              ) ===
                normalizedStyle ||
              (
                style.aliases ??
                []
              ).some(
                (alias) =>
                  normalizeText(
                    alias
                  ) ===
                  normalizedStyle
              )
          );

        if (
          !matchingStyle
        ) {
          throw new Error(
            `Pivní styl „${importedStyle}“ není v katalogu TasteApp.`
          );
        }

        canonicalStyle =
          matchingStyle.name;
      }

      const canonicalHops =
        importedHops.map(
          (importedHop) => {
            const normalizedHop =
              normalizeText(
                importedHop
              );

            const matchingHop =
              hops.find(
                (hop) =>
                  normalizeText(
                    hop.name
                  ) ===
                    normalizedHop ||
                  (
                    hop.aliases ??
                    []
                  ).some(
                    (alias) =>
                      normalizeText(
                        alias
                      ) ===
                      normalizedHop
                  )
              );

            if (!matchingHop) {
              throw new Error(
                `Chmel „${importedHop}“ není v katalogu TasteApp.`
              );
            }

            return matchingHop.name;
          }
        );

      const uniqueHops =
        Array.from(
          new Set(
            canonicalHops
          )
        );

      setName(
        importedName
      );

      setStyleName(
        canonicalStyle
      );

      setPlato(
        importedPlato
      );

      setAbv(
        importedAbv
      );

      setIbu(
        importedIbu
      );

      setSelectedHops(
        uniqueHops
      );

      setHopValue("");
      setStyleOpen(false);
      setHopOpen(false);
    } catch (
      caughtError
    ) {
      setImportError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Údaje se nepodařilo načíst."
      );
    }
  }

  function resetForm() {
    setName("");
    setStyleName("");
    setPlato("");
    setAbv("");
    setIbu("");
    setSelectedHops(
      []
    );
    setHopValue("");
    setStyleOpen(false);
    setHopOpen(false);
    setError("");
    setImportText("");
    setImportError("");
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setOpen(false);
    setError("");
    setImportText("");
    setImportError("");
  }

  async function handleSubmit(
    event: FormEvent<
      HTMLFormElement
    >
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const formData =
        new FormData(
          event.currentTarget
        );

      await createBeerAction(
        formData
      );

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Pivo se nepodařilo uložit."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="taste-button-secondary"
        onClick={() => {
          setError("");
          setImportText("");
          setImportError("");
          setOpen(true);
        }}
        style={{
          fontSize: "11px",
          fontWeight: 700,
          whiteSpace:
            "nowrap",
        }}
      >
        + Přidat pivo
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-beer-title"
            onClick={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeModal();
              }
            }}
            style={{
              position:
                "fixed",
              inset: 0,
              zIndex: 1000,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding:
                "18px",
              background:
                "rgba(5, 4, 3, 0.80)",
              backdropFilter:
                "blur(18px)",
              WebkitBackdropFilter:
                "blur(18px)",
            }}
          >
            <div
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
              style={{
                position:
                  "relative",
                width:
                  "100%",
                maxWidth:
                  "560px",
                maxHeight:
                  "86vh",
                overflowY:
                  "auto",
                overscrollBehavior:
                  "contain",
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
              }}
            >
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
                  Katalog piva
                </div>

                <h2
                  id="catalog-beer-title"
                  style={{
                    margin: 0,
                    paddingRight:
                      "45px",
                    fontSize:
                      "23px",
                    lineHeight:
                      1.1,
                    fontWeight:
                      800,
                    letterSpacing:
                      "-0.03em",
                  }}
                >
                  Přidat pivo
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
                  {breweryName}.
                  Pivo se uloží pouze
                  do katalogu, bez
                  ochutnávky.
                </p>

                <button
                  type="button"
                  aria-label="Zavřít"
                  onClick={
                    closeModal
                  }
                  style={{
                    position:
                      "absolute",
                    top: "16px",
                    right:
                      "17px",
                    width:
                      "33px",
                    height:
                      "33px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    border:
                      "1px solid var(--taste-border)",
                    borderRadius:
                      "9px",
                    background:
                      "rgba(255,255,255,0.025)",
                    color:
                      "var(--taste-text-muted)",
                    fontSize:
                      "20px",
                    lineHeight:
                      1,
                    cursor:
                      "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                style={{
                  padding:
                    "16px 20px 20px",
                }}
              >
                <div
                  style={{
                    marginBottom:
                      "18px",
                    padding:
                      "14px",
                    border:
                      "1px solid var(--taste-border)",
                    borderRadius:
                      "11px",
                    background:
                      "rgba(231,166,47,0.045)",
                  }}
                >
                  <div
                    className="taste-label"
                    style={{
                      marginBottom:
                        "6px",
                      fontSize:
                        "9px",
                    }}
                  >
                    Rychlé vložení
                  </div>

                  <div
                    style={{
                      marginBottom:
                        "10px",
                      color:
                        "var(--taste-text-muted)",
                      fontSize:
                        "11px",
                      lineHeight:
                        1.45,
                    }}
                  >
                    Vlož JSON blok s údaji
                    piva. Formulář se pouze
                    předvyplní, nic se
                    automaticky neuloží.
                  </div>

                  <textarea
                    value={
                      importText
                    }
                    onChange={(
                      event
                    ) => {
                      setImportText(
                        event.target
                          .value
                      );
                      setImportError(
                        ""
                      );
                    }}
                    placeholder='{"name":"Kozel 11","style":"Český světlý ležák","plato":11,"abv":4.6,"ibu":25,"hops":["Sládek"]}'
                    spellCheck={
                      false
                    }
                    rows={5}
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      resize:
                        "vertical",
                      padding:
                        "10px 11px",
                      border:
                        "1px solid var(--taste-border)",
                      borderRadius:
                        "9px",
                      background:
                        "var(--taste-surface)",
                      color:
                        "var(--taste-text)",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize:
                        "11px",
                      lineHeight:
                        1.5,
                      outline:
                        "none",
                    }}
                  />

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "flex-end",
                      marginTop:
                        "9px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={
                        handleQuickImport
                      }
                      disabled={
                        saving
                      }
                      className="taste-button-secondary"
                    >
                      Načíst údaje
                    </button>
                  </div>

                  {importError && (
                    <div
                      role="alert"
                      style={{
                        marginTop:
                          "9px",
                        padding:
                          "9px 10px",
                        border:
                          "1px solid rgba(220,100,75,0.35)",
                        borderRadius:
                          "9px",
                        background:
                          "rgba(220,100,75,0.08)",
                        color:
                          "var(--taste-text)",
                        fontSize:
                          "11px",
                        lineHeight:
                          1.45,
                      }}
                    >
                      {
                        importError
                      }
                    </div>
                  )}
                </div>

                {error && (
                  <div
                    style={{
                      marginBottom:
                        "16px",
                      padding:
                        "11px 12px",
                      border:
                        "1px solid rgba(220,70,70,0.5)",
                      borderRadius:
                        "9px",
                      background:
                        "rgba(220,70,70,0.08)",
                      fontSize:
                        "13px",
                    }}
                  >
                    {error}
                  </div>
                )}

                <div
                  style={
                    fieldStyle
                  }
                >
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Pivo *
                  </label>

                  <input
                    name="name"
                    value={name}
                    onChange={(
                      event
                    ) =>
                      setName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Např. Originál"
                    autoComplete="off"
                    required
                    style={
                      inputStyle
                    }
                  />
                </div>

                <div
                  style={
                    fieldStyle
                  }
                >
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Pivní styl
                  </label>

                  <div
                    style={{
                      position:
                        "relative",
                    }}
                  >
                    <input
                      name="styleName"
                      value={
                        styleName
                      }
                      onChange={(
                        event
                      ) => {
                        setStyleName(
                          event
                            .target
                            .value
                        );
                        setStyleOpen(
                          true
                        );
                      }}
                      onFocus={() =>
                        setStyleOpen(
                          true
                        )
                      }
                      onBlur={() => {
                        setTimeout(
                          () =>
                            setStyleOpen(
                              false
                            ),
                          150
                        );
                      }}
                      placeholder="Např. Ležák"
                      autoComplete="off"
                      style={
                        inputStyle
                      }
                    />

                    {styleOpen &&
                      styleName
                        .trim()
                        .length >=
                        3 &&
                      styleSuggestions
                        .length >
                        0 && (
                        <div
                          style={
                            dropdownStyle
                          }
                        >
                          {styleSuggestions.map(
                            (
                              style
                            ) => (
                              <button
                                key={
                                  style.id
                                }
                                type="button"
                                onMouseDown={(
                                  event
                                ) =>
                                  event.preventDefault()
                                }
                                onClick={() => {
                                  setStyleName(
                                    style.name
                                  );
                                  setStyleOpen(
                                    false
                                  );
                                }}
                                style={
                                  suggestionButtonStyle
                                }
                              >
                                {
                                  style.name
                                }
                                {(style.aliases ??
                                  [])
                                  .length >
                                  0 &&
                                  ` (${(
                                    style.aliases ??
                                    []
                                  ).join(
                                    ", "
                                  )})`}
                              </button>
                            )
                          )}
                        </div>
                      )}

                    {styleOpen &&
                      styleName
                        .trim()
                        .length >=
                        3 &&
                      styleSuggestions
                        .length ===
                        0 && (
                        <div
                          style={
                            dropdownStyle
                          }
                        >
                          <div
                            style={{
                              padding:
                                "10px 12px",
                              color:
                                "var(--taste-text-muted)",
                            }}
                          >
                            Tento styl
                            není v
                            katalogu.
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap:
                      "12px",
                  }}
                >
                  <div
                    style={
                      fieldStyle
                    }
                  >
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Stupňovitost °P
                    </label>
                    <input
                      type="number"
                      name="plato"
                      step="0.1"
                      value={
                        plato
                      }
                      onChange={(
                        event
                      ) =>
                        setPlato(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="11.7"
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div
                    style={
                      fieldStyle
                    }
                  >
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Alkohol %
                    </label>
                    <input
                      type="number"
                      name="abv"
                      step="0.01"
                      value={abv}
                      onChange={(
                        event
                      ) =>
                        setAbv(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="4.6"
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div
                    style={
                      fieldStyle
                    }
                  >
                    <label
                      style={
                        labelStyle
                      }
                    >
                      IBU
                    </label>
                    <input
                      type="number"
                      name="ibu"
                      step="0.1"
                      value={ibu}
                      onChange={(
                        event
                      ) =>
                        setIbu(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="35"
                      style={
                        inputStyle
                      }
                    />
                  </div>
                </div>

                <div
                  style={
                    fieldStyle
                  }
                >
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Chmely
                  </label>

                  {selectedHops
                    .length >
                    0 && (
                    <div
                      style={{
                        display:
                          "flex",
                        flexWrap:
                          "wrap",
                        gap:
                          "8px",
                        marginBottom:
                          "10px",
                      }}
                    >
                      {selectedHops.map(
                        (
                          hopName
                        ) => (
                          <div
                            key={
                              hopName
                            }
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap:
                                "6px",
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
                            {
                              hopName
                            }

                            <button
                              type="button"
                              onClick={() =>
                                removeHop(
                                  hopName
                                )
                              }
                              style={{
                                border:
                                  0,
                                background:
                                  "transparent",
                                cursor:
                                  "pointer",
                                color:
                                  "inherit",
                                padding:
                                  0,
                                fontSize:
                                  "16px",
                              }}
                            >
                              ×
                            </button>

                            <input
                              type="hidden"
                              name="hopNames"
                              value={
                                hopName
                              }
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      position:
                        "relative",
                    }}
                  >
                    <input
                      value={
                        hopValue
                      }
                      onChange={(
                        event
                      ) => {
                        setHopValue(
                          event
                            .target
                            .value
                        );
                        setHopOpen(
                          true
                        );
                      }}
                      onFocus={() =>
                        setHopOpen(
                          true
                        )
                      }
                      onBlur={() => {
                        setTimeout(
                          () =>
                            setHopOpen(
                              false
                            ),
                          150
                        );
                      }}
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                            "Enter" &&
                          hopValue.trim()
                        ) {
                          event.preventDefault();

                          if (
                            hopSuggestions
                              .length >
                            0
                          ) {
                            addHop(
                              hopSuggestions[0]
                                .name
                            );
                          }
                        }
                      }}
                      placeholder="Např. Citra"
                      autoComplete="off"
                      style={
                        inputStyle
                      }
                    />

                    {hopOpen &&
                      hopValue
                        .trim()
                        .length >=
                        3 &&
                      hopSuggestions
                        .length >
                        0 && (
                        <div
                          style={
                            dropdownStyle
                          }
                        >
                          {hopSuggestions.map(
                            (
                              hop
                            ) => (
                              <button
                                key={
                                  hop.id
                                }
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
                                {
                                  hop.name
                                }
                                {(hop.aliases ??
                                  [])
                                  .length >
                                  0 &&
                                  ` (${(
                                    hop.aliases ??
                                    []
                                  ).join(
                                    ", "
                                  )})`}
                              </button>
                            )
                          )}
                        </div>
                      )}

                    {hopOpen &&
                      hopValue
                        .trim()
                        .length >=
                        3 &&
                      hopSuggestions
                        .length ===
                        0 && (
                        <div
                          style={
                            dropdownStyle
                          }
                        >
                          <div
                            style={{
                              padding:
                                "10px 12px",
                              color:
                                "var(--taste-text-muted)",
                            }}
                          >
                            Tento chmel
                            není v
                            katalogu.
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width:
                      "100%",
                    padding:
                      "14px 18px",
                    border:
                      "1px solid currentColor",
                    borderRadius:
                      "10px",
                    background:
                      "transparent",
                    color:
                      "inherit",
                    cursor:
                      saving
                        ? "default"
                        : "pointer",
                    fontWeight:
                      "bold",
                    fontSize:
                      "16px",
                    opacity:
                      saving
                        ? 0.55
                        : 1,
                  }}
                >
                  {saving
                    ? "Ukládám..."
                    : "🍺 Přidat do katalogu"}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
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
  background: "white",
  color: "#111",
  border:
    "1px solid #ccc",
  borderRadius: "8px",
  overflow:
    "hidden" as const,
  boxShadow:
    "0 6px 20px rgba(0,0,0,0.15)",
};

const suggestionButtonStyle = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  border: 0,
  borderBottom:
    "1px solid #eee",
  background: "white",
  color: "#111",
  textAlign:
    "left" as const,
  cursor: "pointer",
  fontSize: "15px",
};
