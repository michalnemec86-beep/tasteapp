export const BEER_PORTFOLIO_STATUSES = [
  "active",
  "seasonal",
  "limited",
  "historical",
  "discontinued",
] as const;

export type BeerPortfolioStatus =
  (typeof BEER_PORTFOLIO_STATUSES)[number];

const CURRENT_STATUSES = new Set<BeerPortfolioStatus>([
  "active",
  "seasonal",
  "limited",
]);

const HISTORICAL_STATUSES = new Set<BeerPortfolioStatus>([
  "historical",
  "discontinued",
]);

export function normalizeBeerPortfolioStatus(
  value: string | null | undefined
): BeerPortfolioStatus {
  return BEER_PORTFOLIO_STATUSES.includes(value as BeerPortfolioStatus)
    ? (value as BeerPortfolioStatus)
    : "active";
}

export function isCurrentBeerPortfolioStatus(
  value: string | null | undefined
) {
  return CURRENT_STATUSES.has(normalizeBeerPortfolioStatus(value));
}

export function isHistoricalBeerPortfolioStatus(
  value: string | null | undefined
) {
  return HISTORICAL_STATUSES.has(normalizeBeerPortfolioStatus(value));
}

export function isBeerAvailableForTasting(
  portfolioStatus: string | null | undefined,
  breweryClosedYear: number | null | undefined
) {
  return breweryClosedYear == null && isCurrentBeerPortfolioStatus(portfolioStatus);
}

export function beerPortfolioStatusLabel(
  value: string | null | undefined
) {
  switch (normalizeBeerPortfolioStatus(value)) {
    case "seasonal":
      return "Sezónní";
    case "limited":
      return "Limitovaná várka";
    case "historical":
      return "Historické";
    case "discontinued":
      return "Ukončené";
    default:
      return "Současné";
  }
}
