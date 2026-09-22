export type ReferenceStatus = {
  ready: boolean;
  complete: boolean;
  missing: string[];
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function normalizeCountry(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isCzechCountry(value: string | null | undefined) {
  return [
    "cesko",
    "ceska republika",
    "czechia",
    "czech republic",
  ].includes(normalizeCountry(value));
}

export function getBreweryReferenceStatus(input: {
  name: string | null | undefined;
  city: string | null | undefined;
  country: string | null | undefined;
  address: string | null | undefined;
  website: string | null | undefined;
  logoUrl: string | null | undefined;
  isNomadic: boolean | null | undefined;
  foundedYear: number | null | undefined;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}): ReferenceStatus {
  const missing: string[] = [];

  if (!hasText(input.name)) missing.push("název");
  if (!hasText(input.city)) missing.push("město");
  if (!hasText(input.country)) missing.push("stát");
  if (!input.isNomadic && !hasText(input.address)) missing.push("adresa");
  if (!hasText(input.website)) missing.push("web");
  if (!hasText(input.logoUrl)) missing.push("logo");
  if (input.foundedYear == null) missing.push("rok založení");

  if (
    isCzechCountry(input.country) &&
    (
      input.latitude == null ||
      !Number.isFinite(input.latitude) ||
      input.longitude == null ||
      !Number.isFinite(input.longitude)
    )
  ) {
    missing.push("GPS");
  }

  return {
    ready: missing.length === 0,
    complete: missing.length === 0,
    missing,
  };
}

export function getBeerReferenceStatus(input: {
  name: string | null | undefined;
  brandId: number | null | undefined;
  breweryId: number | null | undefined;
  styleId: number | null | undefined;
  plato: number | null | undefined;
  abv: number | null | undefined;
  isCatalog: boolean | null | undefined;
}): ReferenceStatus {
  const missing: string[] = [];

  if (!hasText(input.name)) missing.push("název");
  if (input.brandId == null) missing.push("značka");
  if (input.breweryId == null) missing.push("pivovar");
  if (input.styleId == null) missing.push("pivní styl");
  if (input.plato == null && input.abv == null) missing.push("stupňovitost nebo ABV");

  const complete = missing.length === 0;

  if (!input.isCatalog) {
    missing.push("potvrzení katalogu");
  }

  return {
    ready: complete && Boolean(input.isCatalog),
    complete,
    missing,
  };
}
