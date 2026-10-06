"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  beerHref,
  brandHref,
  countryHref,
  hopHref,
  styleHref,
} from "@/lib/entity-navigation";
import type {
  BeerCatalogFacets,
  BeerCatalogFilterMode,
  BeerCatalogItem,
  BeerCatalogSortMode,
} from "@/lib/beer-catalog-page";
import ReferenceWarning from "@/components/ui/ReferenceWarning";

type CatalogScope = {
  styleId: number | null;
  hopId: number | null;
  beerId: number | null;
  newSince: string | null;
  newUntil: string | null;
};

type CatalogResponse = {
  items: BeerCatalogItem[];
  matchedCount: number;
  facets: BeerCatalogFacets;
};

function buildCatalogParams({
  filter,
  sort,
  search,
  country,
  letter,
  offset,
  scope,
}: {
  filter: BeerCatalogFilterMode;
  sort: BeerCatalogSortMode;
  search: string;
  country: string;
  letter: string;
  offset: number;
  scope: CatalogScope;
}) {
  const params =
    new URLSearchParams();

  if (
    filter !== "all"
  ) {
    params.set(
      "filter",
      filter
    );
  }

  if (
    sort !== "default"
  ) {
    params.set(
      "sort",
      sort
    );
  }

  if (search.trim()) {
    params.set(
      "q",
      search.trim()
    );
  }

  if (country) {
    params.set(
      "country",
      country
    );
  }

  if (letter) {
    params.set(
      "letter",
      letter
    );
  }

  if (offset > 0) {
    params.set(
      "offset",
      String(offset)
    );
  }

  if (
    scope.styleId != null
  ) {
    params.set(
      "style",
      String(
        scope.styleId
      )
    );
  }

  if (
    scope.hopId != null
  ) {
    params.set(
      "hop",
      String(
        scope.hopId
      )
    );
  }

  if (
    scope.beerId != null
  ) {
    params.set(
      "beer",
      String(
        scope.beerId
      )
    );
  }

  if (
    scope.newSince &&
    scope.newUntil
  ) {
    params.set(
      "newSince",
      scope.newSince
    );
    params.set(
      "newUntil",
      scope.newUntil
    );
  }

  return params;
}

export default function BeerCatalogClient({
  beers,
  catalogCount,
  initialMatchedCount,
  initialFacets,
  scope,
  adminView,
  initiallyExpanded = false,
}: {
  beers: BeerCatalogItem[];
  catalogCount: number;
  initialMatchedCount: number;
  initialFacets: BeerCatalogFacets;
  scope: CatalogScope;
  adminView: boolean;
  initiallyExpanded?: boolean;
}) {
  const [filter, setFilter] =
    useState<BeerCatalogFilterMode>(
      "all"
    );

  const [sort, setSort] =
    useState<BeerCatalogSortMode>(
      "default"
    );

  const [search, setSearch] =
    useState("");

  const [country, setCountry] =
    useState("");

  const [
    showCountries,
    setShowCountries,
  ] =
    useState(false);

  const [letter, setLetter] =
    useState("");

  const [
    showLetters,
    setShowLetters,
  ] =
    useState(false);

  const [showAll, setShowAll] =
    useState(
      initiallyExpanded
    );

  const [items, setItems] =
    useState(beers);

  const [
    matchedCount,
    setMatchedCount,
  ] =
    useState(
      initialMatchedCount
    );

  const [letters, setLetters] =
    useState(
      initialFacets.letters
    );

  const [
    countries,
    setCountries,
  ] =
    useState(
      initialFacets.countries
    );

  const [loading, setLoading] =
    useState(false);

  const [
    loadingMore,
    setLoadingMore,
  ] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    reloadNonce,
    setReloadNonce,
  ] =
    useState(0);

  const skipInitialRequest =
    useRef(
      initiallyExpanded
    );

  const hasCatalogSelection =
    showAll ||
    filter !== "all" ||
    Boolean(
      search.trim()
    ) ||
    Boolean(country) ||
    Boolean(letter) ||
    sort !== "default";

  async function requestPage({
    offset,
    append,
    signal,
  }: {
    offset: number;
    append: boolean;
    signal?: AbortSignal;
  }) {
    const params =
      buildCatalogParams({
        filter,
        sort,
        search,
        country,
        letter,
        offset,
        scope,
      });

    const response =
      await fetch(
        `/api/beers/catalog?${params.toString()}`,
        {
          cache: "no-store",
          signal,
        }
      );

    if (!response.ok) {
      throw new Error(
        `Catalog request failed with status ${response.status}`
      );
    }

    const data =
      (await response.json()) as CatalogResponse;

    setItems(
      (current) =>
        append
          ? [
              ...current,
              ...data.items,
            ]
          : data.items
    );

    setMatchedCount(
      data.matchedCount
    );

    setLetters(
      data.facets.letters
    );

    setCountries(
      data.facets.countries
    );
  }

  useEffect(() => {
    if (
      !hasCatalogSelection
    ) {
      setItems([]);
      setMatchedCount(0);
      setError("");
      setLoading(false);
      return;
    }

    if (
      skipInitialRequest.current
    ) {
      skipInitialRequest.current =
        false;
      return;
    }

    const controller =
      new AbortController();

    const delay =
      search.trim()
        ? 220
        : 0;

    setLoading(true);
    setError("");
    setItems([]);

    const timeout =
      window.setTimeout(
        async () => {
          try {
            await requestPage({
              offset: 0,
              append: false,
              signal:
                controller.signal,
            });
          } catch (
            requestError
          ) {
            if (
              requestError instanceof
                Error &&
              requestError.name ===
                "AbortError"
            ) {
              return;
            }

            setError(
              "Pivní lístek se nepodařilo načíst. Zkontroluj připojení a zkus to znovu."
            );
          } finally {
            if (
              !controller
                .signal
                .aborted
            ) {
              setLoading(false);
            }
          }
        },
        delay
      );

    return () => {
      window.clearTimeout(
        timeout
      );
      controller.abort();
    };
  }, [
    filter,
    sort,
    search,
    country,
    letter,
    showAll,
    scope.styleId,
    scope.hopId,
    scope.beerId,
    scope.newSince,
    scope.newUntil,
    reloadNonce,
    hasCatalogSelection,
  ]);

  async function loadMore() {
    if (
      loadingMore ||
      loading ||
      items.length >=
        matchedCount
    ) {
      return;
    }

    setLoadingMore(true);
    setError("");

    try {
      await requestPage({
        offset:
          items.length,
        append: true,
      });
    } catch {
      setError(
        "Další piva se nepodařilo načíst. Zkus to znovu."
      );
    } finally {
      setLoadingMore(
        false
      );
    }
  }

  function selectFilter(
    next: BeerCatalogFilterMode
  ) {
    setFilter(next);
    setShowAll(
      next === "all"
    );
  }

  function selectSort(
    next: BeerCatalogSortMode
  ) {
    setSort(next);
    setShowAll(true);

    if (
      next !== "country"
    ) {
      setCountry("");
      setShowCountries(
        false
      );
    }

    if (
      next !== "alpha"
    ) {
      setLetter("");
      setShowLetters(
        false
      );
    }
  }

  function clearSelection() {
    setFilter("all");
    setSort("default");
    setSearch("");
    setCountry("");
    setLetter("");
    setShowCountries(false);
    setShowLetters(false);
    setShowAll(false);
    setError("");
  }

  return (
    <section className="taste-beer-catalog">
      <div
        className="taste-tasting-sort taste-beer-catalog-toolbar"
        aria-label="Filtrování pivního lístku"
      >
        <div
          className="taste-beer-catalog-scope-buttons"
          role="group"
          aria-label="Rozsah piv"
          style={{
            display:
              "flex",
            gap: "8px",
            flexWrap:
              "wrap",
          }}
        >
          {([
            [
              "all",
              "Všechna piva",
            ],
            [
              "tasted",
              "Ochutnaná piva",
            ],
            [
              "mine",
              "Moje piva",
            ],
          ] as const).map(
            ([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  selectFilter(
                    key
                  )
                }
                aria-pressed={
                  key === "all"
                    ? filter ===
                        "all" &&
                      showAll
                    : filter ===
                      key
                }
                className="taste-button-secondary"
                style={{
                  borderColor:
                    (
                      key ===
                      "all"
                        ? filter ===
                            "all" &&
                          showAll
                        : filter ===
                          key
                    )
                      ? "rgba(245,184,63,0.55)"
                      : undefined,
                  background:
                    (
                      key ===
                      "all"
                        ? filter ===
                            "all" &&
                          showAll
                        : filter ===
                          key
                    )
                      ? "rgba(231,166,47,0.14)"
                      : undefined,
                  color:
                    (
                      key ===
                      "all"
                        ? filter ===
                            "all" &&
                          showAll
                        : filter ===
                          key
                    )
                      ? "var(--taste-amber-bright)"
                      : undefined,
                  fontSize:
                    "12px",
                  fontWeight:
                    750,
                  cursor:
                    "pointer",
                }}
              >
                {label}
              </button>
            )
          )}
        </div>

        <div className="taste-tasting-search">
          <input
            type="search"
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
            placeholder="Hledat pivo, značku nebo pivovar"
            aria-label="Hledat v pivním lístku"
          />

          {search && (
            <button
              type="button"
              className="taste-button-secondary"
              onClick={() =>
                setSearch("")
              }
            >
              Zrušit
            </button>
          )}
        </div>

        <div className="taste-tasting-sort-buttons">
          <button
            type="button"
            className="taste-button-secondary"
            aria-expanded={
              showLetters
            }
            aria-pressed={
              sort ===
                "alpha" ||
              Boolean(
                letter
              )
            }
            onClick={() => {
              const nextVisible =
                !showLetters;

              setShowLetters(
                nextVisible
              );

              if (
                nextVisible
              ) {
                setSort(
                  "alpha"
                );
                setShowAll(
                  true
                );
                setCountry(
                  ""
                );
                setShowCountries(
                  false
                );
              }
            }}
          >
            Abecedně
          </button>

          <button
            type="button"
            className="taste-button-secondary"
            aria-pressed={
              sort ===
              "most"
            }
            onClick={() =>
              selectSort(
                "most"
              )
            }
          >
            Nejvíce
          </button>

          <button
            type="button"
            className="taste-button-secondary"
            aria-pressed={
              sort ===
              "least"
            }
            onClick={() =>
              selectSort(
                "least"
              )
            }
          >
            Nejméně
          </button>

          <button
            type="button"
            className="taste-button-secondary"
            aria-expanded={
              showCountries
            }
            aria-pressed={
              sort ===
                "country" ||
              Boolean(
                country
              )
            }
            onClick={() => {
              const nextVisible =
                !showCountries;

              setShowCountries(
                nextVisible
              );

              if (
                nextVisible
              ) {
                setSort(
                  "country"
                );
                setShowAll(
                  true
                );
                setLetter(
                  ""
                );
                setShowLetters(
                  false
                );
              }
            }}
          >
            Podle států
          </button>
        </div>

        {showLetters && (
          <div
            className="taste-tasting-letters"
            aria-label="Vybrat počáteční písmeno piva"
          >
            <button
              type="button"
              className="taste-button-secondary"
              aria-pressed={
                !letter
              }
              onClick={() =>
                setLetter(
                  ""
                )
              }
            >
              Všechna
            </button>

            {letters.length ===
              0 &&
            loading ? (
              <span
                style={{
                  color:
                    "var(--taste-text-muted)",
                  fontSize:
                    "11px",
                }}
              >
                Načítám…
              </span>
            ) : (
              letters.map(
                (item) => (
                  <button
                    key={
                      item
                    }
                    type="button"
                    className="taste-button-secondary"
                    aria-pressed={
                      letter ===
                      item
                    }
                    onClick={() =>
                      setLetter(
                        item
                      )
                    }
                  >
                    {item}
                  </button>
                )
              )
            )}
          </div>
        )}

        {showCountries && (
          <label className="taste-tasting-country-select">
            <span>
              Stát
            </span>

            <select
              value={
                country
              }
              onChange={(
                event
              ) =>
                setCountry(
                  event
                    .target
                    .value
                )
              }
              disabled={
                loading &&
                countries.length ===
                  0
              }
            >
              <option value="">
                {loading &&
                countries.length ===
                  0
                  ? "Načítám státy…"
                  : "Všechny státy"}
              </option>

              {countries.map(
                (item) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </label>
        )}
      </div>

      {!hasCatalogSelection ? (
        <div className="taste-card taste-beer-catalog-empty-state">
          <div
            className="taste-beer-catalog-empty-mark"
            aria-hidden="true"
          >
            ⌕
          </div>

          <div className="taste-beer-catalog-empty-copy">
            <strong>
              Vyber filtr nebo začni hledat
            </strong>

            <span>
              V evidenci je{" "}
              {catalogCount}{" "}
              {catalogCount ===
              1
                ? "pivo"
                : "piv"}
              . Výpis zobrazíme až podle tvého výběru.
            </span>
          </div>

          <button
            type="button"
            className="taste-button-secondary taste-beer-catalog-show-all"
            onClick={() => {
              setFilter(
                "all"
              );
              setSort(
                "default"
              );
              setCountry(
                ""
              );
              setLetter(
                ""
              );
              setShowCountries(
                false
              );
              setShowLetters(
                false
              );
              setShowAll(
                true
              );
            }}
          >
            Zobrazit celý lístek
          </button>
        </div>
      ) : (
        <>
          <div className="taste-beer-catalog-result-meta">
            <div
              className="taste-beer-catalog-count"
              style={{
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "12px",
              }}
            >
              {matchedCount}{" "}
              {matchedCount ===
              1
                ? "pivo"
                : "piv"}
            </div>

            <button
              type="button"
              className="taste-button-secondary taste-beer-catalog-reset"
              onClick={
                clearSelection
              }
            >
              Vyčistit výběr
            </button>
          </div>

          {loading &&
          items.length ===
            0 ? (
            <div className="taste-card taste-beer-catalog-no-results">
              Načítám piva…
            </div>
          ) : error &&
            items.length ===
              0 ? (
            <div className="taste-card taste-beer-catalog-no-results">
              <div>
                {error}
              </div>

              <button
                type="button"
                className="taste-button-secondary"
                onClick={() =>
                  setReloadNonce(
                    (value) =>
                      value +
                      1
                  )
                }
                style={{
                  marginTop:
                    "12px",
                }}
              >
                Zkusit znovu
              </button>
            </div>
          ) : matchedCount ===
            0 ? (
            <div className="taste-card taste-beer-catalog-no-results">
              Tomuto výběru neodpovídá žádné pivo.
            </div>
          ) : (
            <div className="taste-beer-catalog-grid">
              {items.map(
                (beer) => (
                  <article
                    key={
                      beer.id
                    }
                    className={`taste-card taste-beer-catalog-card${beer.myQuantity > 0 ? " taste-beer-catalog-card-mine" : ""}`}
                    style={{
                      padding:
                        "17px",
                      border:
                        beer.myQuantity >
                        0
                          ? "1px solid rgba(156,173,71,0.42)"
                          : "1px solid var(--taste-border)",
                      background:
                        beer.myQuantity >
                        0
                          ? "linear-gradient(145deg, rgba(156,173,71,0.08), transparent 62%), var(--taste-surface)"
                          : "var(--taste-surface)",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          "12px",
                        alignItems:
                          "flex-start",
                      }}
                    >
                      <div
                        style={{
                          minWidth:
                            0,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap:
                              "8px",
                          }}
                        >
                          <Link
                            prefetch={
                              false
                            }
                            href={beerHref(
                              beer.id,
                              beer
                                .brewery
                                ?.id
                            )}
                            className="taste-entity-link taste-beer-catalog-name"
                            style={{
                              color:
                                "var(--taste-text)",
                              fontSize:
                                "18px",
                              lineHeight:
                                1.15,
                              fontWeight:
                                850,
                            }}
                          >
                            {
                              beer.name
                            }
                          </Link>

                          {adminView &&
                            !beer.referenceReady && (
                              <ReferenceWarning
                                missing={
                                  beer.referenceMissing
                                }
                              />
                            )}
                        </div>

                        {beer.historicalMatch && (
                          <div
                            style={{
                              marginTop:
                                "6px",
                              color:
                                "var(--taste-amber-bright)",
                              fontSize:
                                "12px",
                            }}
                          >
                            Shoda v historické verzi
                          </div>
                        )}

                        {beer.brand && (
                          <div
                            className="taste-beer-catalog-brand"
                            style={{
                              marginTop:
                                "5px",
                              fontSize:
                                "11px",
                            }}
                          >
                            <Link
                              prefetch={
                                false
                              }
                              href={brandHref(
                                beer
                                  .brand
                                  .id,
                                beer
                                  .brewery
                                  ?.id
                              )}
                              className="taste-entity-link"
                            >
                              {
                                beer
                                  .brand
                                  .name
                              }
                            </Link>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          flexShrink:
                            0,
                          textAlign:
                            "right",
                        }}
                      >
                        <strong
                          className="taste-beer-catalog-total"
                          style={{
                            color:
                              "var(--taste-amber-bright)",
                            fontSize:
                              "19px",
                          }}
                        >
                          {
                            beer.totalQuantity
                          }
                        </strong>

                        <div
                          className="taste-beer-catalog-total-label"
                          style={{
                            color:
                              "var(--taste-text-muted)",
                            fontSize:
                              "9px",
                          }}
                        >
                          vypito
                        </div>

                        {beer.myQuantity >
                          0 && (
                          <div
                            className="taste-beer-catalog-mine"
                            style={{
                              marginTop:
                                "3px",
                              color:
                                "var(--taste-green)",
                              fontSize:
                                "9px",
                              fontWeight:
                                800,
                            }}
                          >
                            Ty:{" "}
                            {
                              beer.myQuantity
                            }
                            ×
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="taste-beer-catalog-brewery"
                      style={{
                        marginTop:
                          "12px",
                        color:
                          "var(--taste-text-soft)",
                        fontSize:
                          "11px",
                        lineHeight:
                          1.5,
                      }}
                    >
                      {beer.brewery ? (
                        <Link
                          href={`/breweries/${beer.brewery.id}`}
                          className="taste-entity-link"
                        >
                          {
                            beer
                              .brewery
                              .name
                          }
                        </Link>
                      ) : (
                        "Neznámý pivovar"
                      )}

                      {beer
                        .brewery
                        ?.country && (
                        <>
                          {" "}
                          ·{" "}
                          <Link
                            href={countryHref(
                              beer
                                .brewery
                                .country
                            )}
                            className="taste-entity-link"
                          >
                            {
                              beer
                                .brewery
                                .country
                            }
                          </Link>
                        </>
                      )}
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        flexWrap:
                          "wrap",
                        gap: "6px",
                        marginTop:
                          "12px",
                      }}
                    >
                      {beer.style && (
                        <InfoChip>
                          <Link
                            href={styleHref(
                              beer
                                .style
                                .id
                            )}
                            className="taste-entity-link"
                          >
                            {
                              beer
                                .style
                                .name
                            }
                          </Link>
                        </InfoChip>
                      )}

                      {beer.plato !=
                        null && (
                        <InfoChip>
                          {
                            beer.plato
                          }{" "}
                          °P
                        </InfoChip>
                      )}

                      {beer.abv !=
                        null && (
                        <InfoChip>
                          {
                            beer.abv
                          }{" "}
                          %
                        </InfoChip>
                      )}

                      {beer.ibu !=
                        null && (
                        <InfoChip>
                          IBU{" "}
                          {
                            beer.ibu
                          }
                        </InfoChip>
                      )}

                      {beer.isNonAlcoholic && (
                        <InfoChip>
                          Nealkoholické
                        </InfoChip>
                      )}
                    </div>

                    {beer.hops.length >
                      0 && (
                      <div
                        className="taste-beer-catalog-hops"
                        style={{
                          marginTop:
                            "11px",
                          color:
                            "var(--taste-text-muted)",
                          fontSize:
                            "10px",
                          lineHeight:
                            1.45,
                        }}
                      >
                        Chmely:{" "}
                        {beer.hops.map(
                          (
                            hop,
                            index
                          ) => (
                            <span
                              key={
                                hop.id
                              }
                            >
                              {index >
                                0 &&
                                ", "}
                              <Link
                                href={hopHref(
                                  hop.id
                                )}
                                className="taste-entity-link"
                              >
                                {
                                  hop.name
                                }
                              </Link>
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {beer.canTaste && (
                      <Link
                        href={`/tastings/new?beer=${beer.id}`}
                        className="taste-button-secondary taste-beer-catalog-action"
                        style={{
                          display:
                            "inline-flex",
                          marginTop:
                            "13px",
                          padding:
                            "7px 10px",
                          fontSize:
                            "10px",
                          fontWeight:
                            750,
                        }}
                      >
                        + Zapsat ochutnávku
                      </Link>
                    )}
                  </article>
                )
              )}
            </div>
          )}

          {error &&
            items.length >
              0 && (
              <div
                style={{
                  margin:
                    "14px 0 0",
                  textAlign:
                    "center",
                  color:
                    "var(--taste-text-muted)",
                  fontSize:
                    "11px",
                }}
              >
                {error}
              </div>
            )}

          {items.length <
            matchedCount && (
            <button
              type="button"
              onClick={() =>
                void loadMore()
              }
              disabled={
                loadingMore ||
                loading
              }
              className="taste-button-secondary"
              style={{
                display:
                  "block",
                margin:
                  "20px auto 0",
                cursor:
                  "pointer",
                fontSize:
                  "12px",
                fontWeight:
                  750,
                opacity:
                  loadingMore ||
                  loading
                    ? 0.6
                    : 1,
              }}
            >
              {loadingMore
                ? "Načítám další…"
                : "Zobrazit další piva"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function InfoChip({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span
      className="taste-beer-catalog-chip"
      style={{
        padding:
          "5px 8px",
        border:
          "1px solid rgba(231,166,47,0.18)",
        borderRadius:
          "999px",
        background:
          "rgba(231,166,47,0.055)",
        color:
          "var(--taste-text-soft)",
        fontSize:
          "10px",
        fontWeight:
          700,
      }}
    >
      {children}
    </span>
  );
}
