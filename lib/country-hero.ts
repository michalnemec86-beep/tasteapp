const COUNTRY_HERO_TILES: Record<string, readonly string[]> = {
  Francie: [
    "/images/countries/france/part-00.webp",
    "/images/countries/france/part-01.webp",
    "/images/countries/france/part-02.webp",
    "/images/countries/france/part-03.webp",
    "/images/countries/france/part-04.webp",
    "/images/countries/france/part-05.webp",
    "/images/countries/france/part-06.webp",
    "/images/countries/france/part-07.webp",
    "/images/countries/france/part-08.webp",
    "/images/countries/france/part-09.webp",
  ],
};

export function getCountryHeroTiles(
  country: string | null | undefined
) {
  if (!country) {
    return undefined;
  }

  return COUNTRY_HERO_TILES[country];
}
