import TastingModalClient from "./TastingModalClient";
import { saveTastingInModal } from "./tastings/actions";

type Brewery = {
  id: number;
  name: string;
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
  brands?: { id: number; name: string } | null;
  breweries: {
    id: number;
    name: string;
  } | null;
  beer_styles: {
    id: number;
    name: string;
  } | null;
};

type TastingModalProps = {
  beers?: ExistingBeer[];
  breweries?: Brewery[];
  brandsByBrewery?: { breweryId: number; brand: { id: number; name: string } }[];
  countries?: Country[];
  styles?: BeerStyle[];
  hops?: Hop[];
  initialBeerId?: number;
  triggerLabel?: string;
  compactTrigger?: boolean;
};

export default function TastingModal({
  beers,
  breweries,
  brandsByBrewery,
  countries,
  styles,
  hops,
  initialBeerId,
  triggerLabel,
  compactTrigger,
}: TastingModalProps = {}) {
  return (
    <TastingModalClient
      beers={beers}
      breweries={breweries}
      brandsByBrewery={brandsByBrewery}
      countries={countries}
      styles={styles}
      hops={hops}
      initialBeerId={initialBeerId}
      triggerLabel={triggerLabel}
      compactTrigger={compactTrigger}
      saveTastingAction={
        saveTastingInModal
      }
    />
  );
}
