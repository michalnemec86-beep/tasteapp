export function getBreweryOfDayCandidates<T extends { country: string | null }>(breweries: T[]) {
  return breweries.filter((brewery) => brewery.country === "Česko");
}
