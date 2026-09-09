const COUNTRY_HERO_TILES: Record<string, readonly string[]> = {
  Francie: ["/images/countries/france.jpg"],
};

export function getCountryHeroTiles(
  country: string | null | undefined
) {
  if (!country) {
    return undefined;
  }

  return COUNTRY_HERO_TILES[country];
}
