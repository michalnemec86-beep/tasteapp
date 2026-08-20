import TastingModalClient from "./TastingModalClient";
import { saveTastingInModal } from "./tastings/actions";

type Brewery = {
  id: number;
  name: string;
};

type BeerStyle = {
  id: number;
  name: string;
};

type Hop = {
  id: number;
  name: string;
};

type ExistingBeer = {
  id: number;
  name: string;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
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
  beers: ExistingBeer[];
  breweries: Brewery[];
  styles: BeerStyle[];
  hops: Hop[];
};

export default function TastingModal({
  beers,
  breweries,
  styles,
  hops,
}: TastingModalProps) {
  return (
    <TastingModalClient
      beers={beers}
      breweries={breweries}
      styles={styles}
      hops={hops}
      saveTastingAction={
        saveTastingInModal
      }
    />
  );
}