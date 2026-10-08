"use client";

import { getBeerSuggestionReferenceStatus } from "@/lib/referenceStatus";

import StarRatingInput from "@/components/ui/StarRatingInput";
import RatingStars from "@/components/ui/RatingStars";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { PACKAGING_OPTIONS } from "@/lib/packaging";
import { inferBrandFromEvidence } from "@/lib/brandInference";

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
  remoteCatalogSearch?: boolean;
};

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mergeById<T extends { id: number }>(
  current: T[],
  incoming: T[]
) {
  const byId = new Map(
    current.map((item) => [item.id, item])
  );

  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return [...byId.values()];
}

function mergeBreweries(
  current: Brewery[],
  incoming: Brewery[]
) {
  const byId = new Map(
    current.map((brewery) => [brewery.id, brewery])
  );

  for (const brewery of incoming) {
    const existing = byId.get(brewery.id);
    byId.set(brewery.id, {
      ...existing,
      ...brewery,
      aliases: [
        ...new Set([
          ...(existing?.aliases ?? []),
          ...(brewery.aliases ?? []),
        ]),
      ],
    });
  }

  return [...byId.values()];
}

function mergeBreweryBrands(
  current: BreweryBrand[],
  incoming: BreweryBrand[]
) {
  const byKey = new Map(
    current.map((link) => [
      `${link.breweryId}:${link.brand.id}`,
      link,
    ])
  );

  for (const link of incoming) {
    byKey.set(
      `${link.breweryId}:${link.brand.id}`,
      link
    );
  }

  return [...byKey.values()];
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
  remoteCatalogSearch = false,
}: TastingFormProps) {
  const [catalogBeers, setCatalogBeers] = useState(beers);
  const [catalogBreweries, setCatalogBreweries] = useState(breweries);
  const [catalogBrandsByBrewery, setCatalogBrandsByBrewery] =
    useState(brandsByBrewery);
  const [recommendedBeerIds] = useState(
    () => new Set(beers.map((beer) => beer.id))
  );

  const [brewerySearchLoading, setBrewerySearchLoading] = useState(false);
  const [collaboratorSearchLoading, setCollaboratorSearchLoading] = useState(false);
  const [brandSearchLoading, setBrandSearchLoading] = useState(false);
  const [beerSearchLoading, setBeerSearchLoading] = useState(false);

  const [brewerySearchError, setBrewerySearchError] = useState(false);
  const [brandSearchError, setBrandSearchError] = useState(false);
  const [beerSearchError, setBeerSearchError] = useState(false);

  const initialBeer = beers.find((beer) => beer.id === initialBeerId) ?? null;
  const [beerName, setBeerName] = useState(initialBeer?.name ?? "");
  const [existingBeerId, setExistingBeerId] = useState(initialBeer ? String(initialBeer.id) : "");
  const [brandName, setBrandName] = useState(initialBeer?.brands?.name ?? "");
  const [brandManuallyEdited, setBrandManuallyEdited] = useState(false);
  const [brandWasAuto, setBrandWasAuto] = useState(false);
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
  const [validationError, setValidationError] = useState("");
  const [lastRating, setLastRating] = useState<{ beerId: string; rating: number; ratedAt: string; tastedOn: string } | null>(null);
  const [ratingLookupCompletedFor, setRatingLookupCompletedFor] = useState("");
  const [ratingLookupFailedFor, setRatingLookupFailedFor] = useState("");
  const [rateAgain, setRateAgain] = useState(false);
  // Keep one stable key for this form, including retries after a lost response.
  const submissionIdRef = useRef<string | null>(null);
  const submitInFlightRef = useRef(false);

  // Load only this logged-in user's latest score for the selected catalog beer.
  // The historical score is informative, never prefilled into the new rating.
  useEffect(() => {
    setRateAgain(false);
    setLastRating(null);
    setRatingLookupCompletedFor("");
    setRatingLookupFailedFor("");
    if (!existingBeerId) return;

    const controller = new AbortController();
    async function loadPersonalLastRating() {
      try {
        const response = await fetch(`/api/tasting-last-rating?beerId=${encodeURIComponent(existingBeerId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not read previous rating");
        const result = (await response.json()) as {
          lastRating: { rating: number; ratedAt: string; tastedOn: string } | null;
        };
        if (!controller.signal.aborted) {
          setLastRating(result.lastRating ? { ...result.lastRating, beerId: existingBeerId } : null);
        }
      } catch {
        if (!controller.signal.aborted) setRatingLookupFailedFor(existingBeerId);
      } finally {
        if (!controller.signal.aborted) setRatingLookupCompletedFor(existingBeerId);
      }
    }
    void loadPersonalLastRating();
    return () => controller.abort();
  }, [existingBeerId]);

  const personalLastRating = lastRating?.beerId === existingBeerId ? lastRating : null;
  const ratingLookupReady = !existingBeerId || ratingLookupCompletedFor === existingBeerId;

  const normalizedBrewery = normalizeText(breweryName);
  const activeBrewery =
    catalogBreweries.find((brewery) =>
      brewery.id === selectedBreweryId && normalizeText(brewery.name) === normalizedBrewery
    ) ?? catalogBreweries.find((brewery) =>
      normalizeText(brewery.name) === normalizedBrewery ||
      (brewery.aliases ?? []).some((alias) => normalizeText(alias) === normalizedBrewery)
    );
  const activeBreweryId = activeBrewery?.id;

  const brandOptions = useMemo(() => {
    if (!activeBreweryId) return [];
    const options = new Map<number, BreweryBrand["brand"]>();
    for (const link of catalogBrandsByBrewery) {
      if (link.breweryId === activeBreweryId) options.set(link.brand.id, link.brand);
    }
    for (const beer of catalogBeers) {
      if (beer.breweries?.id === activeBreweryId && beer.brands) {
        options.set(beer.brands.id, beer.brands);
      }
    }
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [activeBreweryId, catalogBrandsByBrewery, catalogBeers]);

  const globalBrandOptions = useMemo(() => {
    const breweriesById = new Map(catalogBreweries.map((brewery) => [brewery.id, brewery]));
    const options = new Map<string, { brewery: Brewery; brand: BreweryBrand["brand"] }>();
    for (const link of catalogBrandsByBrewery) {
      const brewery = breweriesById.get(link.breweryId);
      if (brewery) options.set(`${brewery.id}:${link.brand.id}`, { brewery, brand: link.brand });
    }
    for (const beer of catalogBeers) {
      const brewery = breweriesById.get(beer.breweries?.id ?? -1);
      if (brewery && beer.brands) {
        options.set(`${brewery.id}:${beer.brands.id}`, { brewery, brand: beer.brands });
      }
    }
    return [...options.values()];
  }, [catalogBrandsByBrewery, catalogBreweries, catalogBeers]);

  const matchingBrands = brandOptions.filter(
    (brand) => normalizeText(brand.name) === normalizeText(brandName)
  );
  const activeBrand =
    matchingBrands.find((brand) => brand.id === selectedBrandId) ??
    (matchingBrands.length === 1 ? matchingBrands[0] : null);


  useEffect(() => {
    if (!remoteCatalogSearch) return;

    const query = breweryName.trim();

    if (query.length < 3 || selectedBreweryId != null) {
      setBrewerySearchLoading(false);
      setBrewerySearchError(false);
      return;
    }

    setBrewerySearchLoading(true);
    setBrewerySearchError(false);

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {

      try {
        const response = await fetch(
          `/api/tasting-search?type=brewery&q=${encodeURIComponent(query)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Brewery search failed");
        }

        const data = (await response.json()) as {
          breweries?: Brewery[];
        };

        setCatalogBreweries((current) =>
          mergeBreweries(current, data.breweries ?? [])
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        setBrewerySearchError(true);
      } finally {
        if (!controller.signal.aborted) {
          setBrewerySearchLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    remoteCatalogSearch,
    breweryName,
    selectedBreweryId,
  ]);

  useEffect(() => {
    if (!remoteCatalogSearch) return;

    const query = collaboratorQuery.trim();

    if (query.length < 3) {
      setCollaboratorSearchLoading(false);
      return;
    }

    setCollaboratorSearchLoading(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {

      try {
        const response = await fetch(
          `/api/tasting-search?type=brewery&q=${encodeURIComponent(query)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Collaborator search failed");
        }

        const data = (await response.json()) as {
          breweries?: Brewery[];
        };

        setCatalogBreweries((current) =>
          mergeBreweries(current, data.breweries ?? [])
        );
      } catch {
        // Kolaboraci nelze vytvořit ručně, takže při výpadku pouze
        // nezobrazíme neověřené výsledky.
      } finally {
        if (!controller.signal.aborted) {
          setCollaboratorSearchLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    remoteCatalogSearch,
    collaboratorQuery,
  ]);

  const remoteBrandQuery =
    activeBreweryId
      ? ""
      : brandName.trim();

  useEffect(() => {
    if (!remoteCatalogSearch) return;

    if (
      !activeBreweryId &&
      remoteBrandQuery.length < 3
    ) {
      setBrandSearchLoading(false);
      setBrandSearchError(false);
      return;
    }

    setBrandSearchLoading(true);
    setBrandSearchError(false);

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {

      const params = new URLSearchParams({
        type: "brand",
      });

      if (remoteBrandQuery) {
        params.set("q", remoteBrandQuery);
      }

      if (activeBreweryId) {
        params.set("breweryId", String(activeBreweryId));
      }

      try {
        const response = await fetch(
          `/api/tasting-search?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Brand search failed");
        }

        const data = (await response.json()) as {
          breweries?: Brewery[];
          brandsByBrewery?: BreweryBrand[];
        };

        setCatalogBreweries((current) =>
          mergeBreweries(current, data.breweries ?? [])
        );

        setCatalogBrandsByBrewery((current) =>
          mergeBreweryBrands(
            current,
            data.brandsByBrewery ?? []
          )
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        setBrandSearchError(true);
      } finally {
        if (!controller.signal.aborted) {
          setBrandSearchLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    remoteCatalogSearch,
    activeBreweryId,
    remoteBrandQuery,
  ]);

  useEffect(() => {
    if (!remoteCatalogSearch) return;

    const query = beerName.trim();

    if (
      existingBeerId ||
      (
        !activeBreweryId &&
        query.length < 3
      )
    ) {
      setBeerSearchLoading(false);
      setBeerSearchError(false);
      return;
    }

    setBeerSearchLoading(true);
    setBeerSearchError(false);

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {

      const params = new URLSearchParams({
        type: "beer",
      });

      if (query) {
        params.set("q", query);
      }

      if (activeBreweryId) {
        params.set("breweryId", String(activeBreweryId));
      }

      if (activeBrand?.id) {
        params.set("brandId", String(activeBrand.id));
      }

      try {
        const response = await fetch(
          `/api/tasting-search?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Beer search failed");
        }

        const data = (await response.json()) as {
          beers?: ExistingBeer[];
        };

        const incomingBeers = data.beers ?? [];

        setCatalogBeers((current) =>
          mergeById(current, incomingBeers)
        );

        setCatalogBreweries((current) =>
          mergeBreweries(
            current,
            incomingBeers.flatMap((beer) =>
              beer.breweries
                ? [
                    {
                      id: beer.breweries.id,
                      name: beer.breweries.name,
                      country: beer.breweries.country ?? null,
                      aliases: [],
                    },
                  ]
                : []
            )
          )
        );

        setCatalogBrandsByBrewery((current) =>
          mergeBreweryBrands(
            current,
            incomingBeers.flatMap((beer) =>
              beer.breweries && beer.brands
                ? [
                    {
                      breweryId: beer.breweries.id,
                      brand: beer.brands,
                    },
                  ]
                : []
            )
          )
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        setBeerSearchError(true);
      } finally {
        if (!controller.signal.aborted) {
          setBeerSearchLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    remoteCatalogSearch,
    beerName,
    existingBeerId,
    activeBreweryId,
    activeBrand?.id,
  ]);

  const brandQuery = normalizeText(brandName);
  const brandSuggestions = (activeBrewery
    ? brandOptions.map((brand) => ({ brewery: activeBrewery, brand }))
    : brandQuery.length >= 3 ? globalBrandOptions : []
  )
    .filter(({ brand }) => normalizeText(brand.name).includes(brandQuery))
    .sort((a, b) => {
      const aStarts = normalizeText(a.brand.name).startsWith(brandQuery);
      const bStarts = normalizeText(b.brand.name).startsWith(brandQuery);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.brand.name.localeCompare(b.brand.name, "cs") ||
        a.brewery.name.localeCompare(b.brewery.name, "cs");
    });

  // ==================================================
  // PIVO
  // ==================================================

  const beerQuery = normalizeText(beerName);
  const showingRecommendations =
    remoteCatalogSearch &&
    !activeBrewery &&
    beerQuery.length === 0;

  const beerSuggestions = showingRecommendations
    ? catalogBeers.filter((beer) => recommendedBeerIds.has(beer.id))
    : (
        activeBrewery && (!brandName.trim() || activeBrand) ||
        !activeBrewery && beerQuery.length >= 3
      )
      ? catalogBeers
          .filter((beer) => {
            if (activeBrewery && beer.breweries?.id !== activeBrewery.id) return false;
            if (activeBrand && beer.brands?.id !== activeBrand.id) return false;
            return normalizeText(beer.name).includes(beerQuery) ||
              (!activeBrewery && normalizeText(beer.brands?.name ?? "").includes(beerQuery));
          })
          .sort((a, b) => {
            const aDirect = normalizeText(a.name).includes(beerQuery);
            const bDirect = normalizeText(b.name).includes(beerQuery);
            if (aDirect !== bDirect) return aDirect ? -1 : 1;
            const aReady = getBeerSuggestionReferenceStatus(a).ready;
            const bReady = getBeerSuggestionReferenceStatus(b).ready;
            if (aReady !== bReady) return aReady ? -1 : 1;

            return a.name.localeCompare(b.name, "cs", { sensitivity: "base" });
          })
      : [];

  function selectBeer(beer: ExistingBeer) {
    setExistingBeerId(String(beer.id));
    setBeerName(beer.name);
    setBrandName(beer.brands?.name ?? "");
    setBrandManuallyEdited(false);
    setBrandWasAuto(false);
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
    if (!brandManuallyEdited && (brandWasAuto || !brandName.trim())) {
      const inferred = activeBreweryId
        ? inferBrandFromEvidence(
            value,
            brandOptions,
            catalogBeers.filter((beer) => beer.breweries?.id === activeBreweryId)
              .map((beer) => ({ name: beer.name, brandId: beer.brands?.id ?? null }))
          )
        : null;
      setBrandName(inferred?.name ?? "");
      setSelectedBrandId(inferred?.id ?? null);
      setBrandWasAuto(Boolean(inferred));
    }
    setBeerOpen(true);
  }

  // ==================================================
  // PIVOVAR
  // ==================================================

  const brewerySuggestions = catalogBreweries.filter((brewery) => {
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
      setBrandManuallyEdited(false);
      setBrandWasAuto(false);
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
      setBrandManuallyEdited(false);
      setBrandWasAuto(false);
      setSelectedBrandId(null);
      setSelectedBreweryId(null);
      setBreweryCountry("");
      setBrandOpen(false);
    }
    setBreweryName(value);
    setBreweryOpen(true);
  }

  function selectBrand(brewery: Brewery, brand: BreweryBrand["brand"]) {
    if (activeBreweryId !== brewery.id || activeBrand?.id !== brand.id) clearBeerDetails();
    setBreweryName(brewery.name);
    setSelectedBreweryId(brewery.id);
    setBreweryCountry(brewery.country ?? "");
    setSelectedBrandId(brand.id);
    setBrandName(brand.name);
    setBrandManuallyEdited(true);
    setBrandWasAuto(false);
    setBrandOpen(false);
    setBreweryOpen(false);
  }

  function changeBrandName(value: string) {
    if (value !== brandName) {
      clearBeerDetails();
      setSelectedBrandId(null);
    }
    setBrandName(value);
    setBrandManuallyEdited(true);
    setBrandWasAuto(false);
    setBrandOpen(true);
  }

  const collaboratorSuggestions = catalogBreweries.filter((brewery) => {
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

  async function submitTasting(formData: FormData) {
    try {
      await saveTastingAction(formData);
    } catch (error) {
      submitInFlightRef.current = false;
      setValidationError(
        error instanceof Error ? error.message : "Ochutnávku se nepodařilo uložit. Zkus to znovu."
      );
    }
  }

  return (
    <form
      action={submitTasting}
      onSubmit={(event) => {
        const catalogCheckInProgress =
          remoteCatalogSearch &&
          !existingBeerId &&
          (
            brewerySearchLoading ||
            beerSearchLoading ||
            (
              Boolean(brandName.trim()) &&
              brandSearchLoading
            )
          );

        const catalogCheckFailed =
          remoteCatalogSearch &&
          !existingBeerId &&
          (
            (
              !activeBrewery &&
              breweryName.trim().length >= 3 &&
              brewerySearchError
            ) ||
            beerSearchError ||
            (
              Boolean(brandName.trim()) &&
              brandSearchError
            )
          );

        if (catalogCheckInProgress) {
          event.preventDefault();
          setValidationError(
            "Ještě ověřuji katalog. Počkej okamžik a ulož ochutnávku znovu."
          );
        } else if (catalogCheckFailed) {
          event.preventDefault();
          setValidationError(
            "Katalog se nepodařilo ověřit. Zkontroluj připojení a zkus to znovu, aby nevznikla duplicitní data."
          );
        } else if (!existingBeerId && !plato.trim() && !abv.trim()) {
          event.preventDefault();
          setValidationError("U nového piva vyplň stupňovitost nebo alkohol.");
        } else if (submitInFlightRef.current) {
          // React may not have rendered the pending state before a rapid second tap.
          event.preventDefault();
        } else {
          submitInFlightRef.current = true;
          if (!submissionIdRef.current) submissionIdRef.current = crypto.randomUUID();
          const input = event.currentTarget.elements.namedItem("submissionId");
          if (input instanceof HTMLInputElement) input.value = submissionIdRef.current;
          setValidationError("");
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="submissionId" />
      <input type="hidden" name="existingBeerId" value={existingBeerId} />
      <input type="hidden" name="skipBrandInference" value={brandManuallyEdited && !brandName.trim() ? "on" : ""} />

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

          {breweryOpen &&
            breweryName.trim().length >= 3 &&
            brewerySuggestions.length === 0 &&
            brewerySearchLoading && (
            <div style={dropdownStyle}>
              <div style={{ padding: "10px 12px", color: "var(--taste-text-muted)" }}>
                Hledám pivovar v evidenci…
              </div>
            </div>
          )}

          {breweryOpen &&
            breweryName.trim().length >= 3 &&
            brewerySuggestions.length === 0 &&
            !brewerySearchLoading &&
            brewerySearchError && (
            <div style={dropdownStyle}>
              <div style={{ padding: "10px 12px", color: "#8b2f23" }}>
                Evidenci pivovarů se nepodařilo ověřit. Zkus hledání znovu.
              </div>
            </div>
          )}

          {breweryOpen &&
            breweryName.trim().length >= 3 &&
            brewerySuggestions.length === 0 &&
            !brewerySearchLoading &&
            !brewerySearchError && (
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

            {collaboratorOpen &&
              collaboratorQuery.trim().length >= 3 &&
              collaboratorSuggestions.length === 0 &&
              collaboratorSearchLoading && (
              <div style={dropdownStyle}>
                <div style={{ padding: "10px 12px", color: "var(--taste-text-muted)" }}>
                  Hledám pivovar v evidenci…
                </div>
              </div>
            )}

            {collaboratorOpen &&
              collaboratorQuery.trim().length >= 3 &&
              collaboratorSuggestions.length === 0 &&
              !collaboratorSearchLoading && (
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
        <label style={labelStyle}>Značka (volitelné u nového piva)</label>
        <div style={{ position: "relative" }}>
          <input
            name="brandName"
            value={brandName}
            onChange={(event) => changeBrandName(event.target.value)}
            onFocus={() => setBrandOpen(true)}
            onBlur={() => setTimeout(() => setBrandOpen(false), 150)}
            placeholder={activeBrewery ? "Vyber značku pivovaru nebo napiš novou" : "Napiš alespoň 3 písmena značky"}
            autoComplete="off"
            style={inputStyle}
          />
          {brandOpen && brandSuggestions.length > 0 && (
            <div style={dropdownStyle}>
              {brandSuggestions.slice(0, 40).map(({ brewery, brand }) => (
                <button
                  key={`${brewery.id}-${brand.id}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectBrand(brewery, brand)}
                  style={suggestionButtonStyle}
                >
                  {brand.name}
                  {!activeBrewery && (
                    <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "2px" }}>
                      {brewery.name}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {brandOpen &&
            brandSuggestions.length === 0 &&
            brandSearchLoading && (
            <div style={dropdownStyle}>
              <div style={{ padding: "10px 12px", color: "var(--taste-text-muted)" }}>
                Hledám značku v evidenci…
              </div>
            </div>
          )}

          {brandOpen &&
            brandSuggestions.length === 0 &&
            !brandSearchLoading &&
            brandSearchError && (
            <div style={dropdownStyle}>
              <div style={{ padding: "10px 12px", color: "#8b2f23" }}>
                Evidenci značek se nepodařilo ověřit.
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: "5px", color: "var(--taste-text-muted)", fontSize: "10px", lineHeight: 1.4 }}>
          {brandWasAuto && <span>Značka doplněna z evidence. Můžeš ji změnit. </span>}
          {activeBrewery
            ? "Značky v nabídce patří vybranému pivovaru. Novou značku můžeš napsat ručně."
            : "Po třech písmenech nabídneme značky z katalogu. Výběr doplní i pivovar."}
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
            placeholder={activeBrewery ? "Vyber pivo pivovaru nebo napiš nové" : "Napiš alespoň 3 písmena názvu piva"}
            autoComplete="off"
            required
            style={inputStyle}
          />

          {beerOpen && beerSuggestions.length > 0 && (
            <div style={dropdownStyle}>
              {showingRecommendations && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #eee",
                    color: "#776b60",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Nedávné a časté
                </div>
              )}
              {beerSuggestions.slice(0, 30).map((beer) => (
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
                          {beer.brands.name}{getBeerSuggestionReferenceStatus(beer).ready ? " · ověřené" : ""}
                        </span>
                      </>
                    )}
                    {!activeBrewery && beer.breweries?.name && (
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

          {beerOpen &&
            beerSuggestions.length === 0 &&
            beerSearchLoading && (
            <div style={dropdownStyle}>
              <div style={{ padding: "10px 12px", color: "var(--taste-text-muted)" }}>
                Hledám pivo v evidenci…
              </div>
            </div>
          )}

          {beerOpen &&
            beerSuggestions.length === 0 &&
            !beerSearchLoading &&
            beerSearchError && (
            <div style={dropdownStyle}>
              <div style={{ padding: "10px 12px", color: "#8b2f23" }}>
                Evidenci piv se nepodařilo ověřit. Zkus hledání znovu.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ZEMĚ */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Země původu pivovaru{!existingBeerId && !activeBrewery ? " *" : ""}</label>
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
            required={!existingBeerId && !activeBrewery}
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
                Nový styl „{styleName.trim()}“ se přidá při uložení ochutnávky.
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
                addHop(hopSuggestions.length > 0 ? hopSuggestions[0].name : hopValue);
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
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addHop(hopValue)} style={suggestionButtonStyle}>
                Přidat nový chmel „{hopValue.trim()}“
              </button>
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
        <label style={labelStyle}>Podání / obal *</label>
        <select name="packaging" defaultValue="" required style={inputStyle}>
          <option value="" disabled>Vyber způsob podání</option>
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

      {!ratingLookupReady && (
        <p role="status" style={{ ...fieldStyle, color: "var(--taste-text-muted)", fontSize: 12 }}>
          Ověřuji předchozí hodnocení…
        </p>
      )}
      {ratingLookupFailedFor === existingBeerId && existingBeerId && (
        <p role="status" style={{ ...fieldStyle, color: "var(--taste-text-muted)", fontSize: 12 }}>
          Předchozí hodnocení se nepodařilo načíst. Nové můžeš zadat nezávisle.
        </p>
      )}
      {personalLastRating && (
        <div style={{ ...fieldStyle, padding: "12px 14px", border: "1px solid var(--taste-border)", borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            Naposledy hodnoceno {new Date(personalLastRating.ratedAt).toLocaleDateString("cs-CZ")}
          </div>
          <RatingStars rating={personalLastRating.rating} />
          <p style={{ margin: "7px 0 10px", fontSize: 12, color: "var(--taste-text-muted)" }}>
            Původní hodnocení zůstane zachované. Nový hlas vznikne pouze změnou počtu hvězd.
          </p>
          <button type="button" onClick={() => setRateAgain(value => !value)}
            style={{ ...inputStyle, width: "auto", padding: "8px 12px", cursor: "pointer", borderRadius: 8 }}>
            {rateAgain ? "Bez nového hodnocení" : "Hodnotit znovu"}
          </button>
        </div>
      )}
      {ratingLookupReady && (!personalLastRating || rateAgain) && (
        <StarRatingInput key={`rating:${existingBeerId}:${rateAgain}`} previousRating={personalLastRating?.rating} />
      )}

      <TastingSubmitButton />
      {validationError && <p role="alert" style={{ color: "var(--taste-amber-bright)", marginTop: 10 }}>{validationError}</p>}
    </form>
  );
}

function TastingSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      style={{
        width: "100%",
        padding: "14px 18px",
        border: "1px solid currentColor",
        borderRadius: "10px",
        background: "transparent",
        color: "inherit",
        fontSize: "16px",
        fontWeight: "bold",
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.72 : 1,
        marginTop: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
    >
      {pending ? (
        <span role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          Ukládám ochutnávku…
        </span>
      ) : (
        "🍺 Uložit ochutnávku"
      )}
    </button>
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
  maxHeight: "280px",
  overflowY: "auto" as const,
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
