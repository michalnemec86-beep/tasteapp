export type BrandEvidence = { id: number; name: string };
export type BeerBrandEvidence = { name: string; brandId: number | null };

function normalize(value: string) {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Infer only from records belonging to the selected brewery. */
export function inferBrandFromEvidence(
  beerName: string,
  brands: BrandEvidence[],
  beers: BeerBrandEvidence[]
): BrandEvidence | null {
  const name = normalize(beerName);
  if (!name) return null;

  const distinctBrands = [...new Map(brands.map((brand) => [brand.id, brand])).values()];
  const exactBeers = beers.filter((beer) => normalize(beer.name) === name);
  if (exactBeers.length > 0) {
    const ids = [...new Set(exactBeers.map((beer) => beer.brandId))];
    return ids.length === 1 && ids[0] != null
      ? distinctBrands.find((brand) => brand.id === ids[0]) ?? null
      : null;
  }

  const prefixMatches = distinctBrands.filter((brand) => {
    const prefix = normalize(brand.name);
    return prefix && (name === prefix || name.startsWith(`${prefix} `));
  });
  if (prefixMatches.length > 0) {
    const longest = Math.max(...prefixMatches.map((brand) => normalize(brand.name).length));
    const best = prefixMatches.filter((brand) => normalize(brand.name).length === longest);
    return best.length === 1 ? best[0] : null;
  }

  // A single brand backed by at least one beer is useful evidence, but a
  // brewery merely listing a brand without beers is not enough to assign it.
  if (distinctBrands.length === 1 && beers.some((beer) => beer.brandId === distinctBrands[0].id)) {
    return distinctBrands[0];
  }
  return null;
}
