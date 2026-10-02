export type ReferenceStatus = {
  ready: boolean;
  complete: boolean;
  missing: string[];
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getBreweryReferenceStatus(input: {
  name: string | null | undefined;
  country: string | null | undefined;
}): ReferenceStatus {
  const missing: string[] = [];
  if (!hasText(input.name)) missing.push("název");
  if (!hasText(input.country)) missing.push("stát");
  return { ready: missing.length === 0, complete: missing.length === 0, missing };
}

export function getBeerReferenceStatus(input: {
  name: string | null | undefined;
  brandId: number | null | undefined;
  breweryId: number | null | undefined;
  styleId: number | null | undefined;
  plato: number | null | undefined;
  abv: number | null | undefined;
}): ReferenceStatus {
  const missing: string[] = [];
  if (!hasText(input.name)) missing.push("název");
  if (input.brandId == null) missing.push("značka");
  if (input.breweryId == null) missing.push("pivovar");
  if (input.styleId == null) missing.push("pivní styl");
  const hasStrength = [input.plato, input.abv].some(
    (value) => value != null && Number.isFinite(value)
  );
  if (!hasStrength) missing.push("stupňovitost nebo ABV");
  return { ready: missing.length === 0, complete: missing.length === 0, missing };
}

// Autocomplete follows the same automatic rules as the catalog and detail pages.
// The historical administrator confirmation flag is no longer a prerequisite.
export function getBeerSuggestionReferenceStatus(input: {
  name: string | null | undefined;
  brands?: { id: number } | null;
  breweries?: { id: number } | null;
  beer_styles?: { id: number } | null;
  plato?: number | null;
  abv?: number | null;
}): ReferenceStatus {
  return getBeerReferenceStatus({
    name: input.name,
    brandId: input.brands?.id,
    breweryId: input.breweries?.id,
    styleId: input.beer_styles?.id,
    plato: input.plato,
    abv: input.abv,
  });
}
