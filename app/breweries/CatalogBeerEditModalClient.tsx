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

type Beer = {
  id: number;
  name: string;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  styleName: string;
  hopNames: string[];
  tastingCount: number;
};

type Props = {
  breweryName: string;
  beer: Beer;
  styles: BeerStyle[];
  hops: Hop[];
  updateBeerAction: (
    formData: FormData
  ) => Promise<{
    success: boolean;
    beerId: number;
  }>;
  deleteBeerAction: () => Promise<{
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

export default function CatalogBeerEditModalClient({
  breweryName,
  beer,
  styles,
  hops,
  updateBeerAction,
  deleteBeerAction,
}: Props) {
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
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    name,
    setName,
  ] = useState(
    beer.name
  );

  const [
    styleName,
    setStyleName,
  ] = useState(
    beer.styleName
  );

  const [
    styleOpen,
    setStyleOpen,
  ] = useState(false);

  const [
    plato,
    setPlato,
  ] = useState(
    beer.plato !== null
      ? String(beer.plato)
      : ""
  );

  const [
    abv,
    setAbv,
  ] = useState(
    beer.abv !== null
      ? String(beer.abv)
      : ""
  );

  const [
    ibu,
    setIbu,
  ] = useState(
    beer.ibu !== null
      ? String(beer.ibu)
      : ""
  );

  const [
    selectedHops,
    setSelectedHops,
  ] = useState<string[]>(
    beer.hopNames
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
          ).includes(query) ||
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
          ).includes(query) ||
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

  function resetFromBeer() {
    setName(
      beer.name
    );

    setStyleName(
      beer.styleName
    );

    setPlato(
      beer.plato !== null
        ? String(
            beer.plato
          )
        : ""
    );

    setAbv(
      beer.abv !== null
        ? String(
            beer.abv
          )
        : ""
    );

    setIbu(
      beer.ibu !== null
        ? String(
            beer.ibu
          )
        : ""
    );

    setSelectedHops(
      beer.hopNames
    );

    setHopValue("");
    setStyleOpen(false);
    setHopOpen(false);
    setError("");
  }

  function openModal() {
    resetFromBeer();
    setOpen(true);
  }

  function closeModal() {
    if (
      saving ||
      deleting
    ) {
      return;
    }

    setOpen(false);
    setError("");
  }

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

      await updateBeerAction(
        formData
      );

      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Pivo se nepodařilo upravit."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      beer.tastingCount > 0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Opravdu smazat pivo "${beer.name}" z katalogu?`
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await deleteBeerAction();

      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Pivo se nepodařilo smazat."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="taste-button-secondary"
        onClick={
          openModal
        }
        style={{
          padding:
            "5px 8px",
          fontSize:
            "10px",
          fontWeight:
            700,
          whiteSpace:
            "nowrap",
        }}
      >
        Upravit
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`catalog-beer-edit-${beer.id}`}
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
                  Správa katalogu
                </div>

                <h2
                  id={`catalog-beer-edit-${beer.id}`}
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
                  Upravit pivo
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
                  Změny upraví
                  společný katalogový
                  záznam piva.
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
                    top:
                      "16px",
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
                    required
                    autoComplete="off"
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
                            Tento styl není
                            v katalogu.
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
                      value={
                        abv
                      }
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
                      value={
                        ibu
                      }
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
                            Tento chmel není
                            v katalogu.
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    deleting
                  }
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
                      saving ||
                      deleting
                        ? "default"
                        : "pointer",
                    fontWeight:
                      "bold",
                    fontSize:
                      "16px",
                    opacity:
                      saving ||
                      deleting
                        ? 0.55
                        : 1,
                  }}
                >
                  {saving
                    ? "Ukládám..."
                    : "Uložit změny"}
                </button>

                <div
                  style={{
                    marginTop:
                      "20px",
                    paddingTop:
                      "16px",
                    borderTop:
                      "1px solid var(--taste-border)",
                  }}
                >
                  {beer.tastingCount ===
                  0 ? (
                    <>
                      <div
                        style={{
                          marginBottom:
                            "9px",
                          color:
                            "var(--taste-text-muted)",
                          fontSize:
                            "11px",
                          lineHeight:
                            1.45,
                        }}
                      >
                        Pivo nemá žádné
                        ochutnávky a lze ho
                        z katalogu trvale
                        odstranit.
                      </div>

                      <button
                        type="button"
                        disabled={
                          saving ||
                          deleting
                        }
                        onClick={
                          handleDelete
                        }
                        style={{
                          width:
                            "100%",
                          padding:
                            "11px 14px",
                          border:
                            "1px solid rgba(214,91,66,0.55)",
                          borderRadius:
                            "9px",
                          background:
                            "rgba(214,91,66,0.08)",
                          color:
                            "#e3765f",
                          cursor:
                            saving ||
                            deleting
                              ? "default"
                              : "pointer",
                          fontWeight:
                            700,
                          fontSize:
                            "13px",
                          opacity:
                            saving ||
                            deleting
                              ? 0.55
                              : 1,
                        }}
                      >
                        {deleting
                          ? "Mažu..."
                          : "Smazat pivo z katalogu"}
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        padding:
                          "10px 12px",
                        border:
                          "1px solid var(--taste-border)",
                        borderRadius:
                          "9px",
                        background:
                          "rgba(255,255,255,0.018)",
                        color:
                          "var(--taste-text-muted)",
                        fontSize:
                          "11px",
                        lineHeight:
                          1.45,
                      }}
                    >
                      Pivo nelze smazat,
                      protože má{" "}
                      {
                        beer.tastingCount
                      }{" "}
                      evidovaných
                      ochutnávek.
                    </div>
                  )}
                </div>
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
