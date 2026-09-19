import TastingModalClient from "./TastingModalClient";
import { saveTastingInModal } from "./tastings/actions";
import { createClient } from "@/lib/supabase/server";

type Brewery = {
  id: number;
  name: string;
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
  countries: Country[];
  styles: BeerStyle[];
  hops: Hop[];
};

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function TastingModal({
  beers,
  breweries,
  countries,
  styles,
  hops,
}: TastingModalProps) {
  const supabase = await createClient();

  const beerIds = beers.map((beer) => beer.id);
  const brandByBeerId = new Map<number, { id: number; name: string } | null>();

  if (beerIds.length > 0) {
    const { data, error } = await supabase
      .from("beers")
      .select(`
        id,
        brands (
          id,
          name
        )
      `)
      .in("id", beerIds);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      brandByBeerId.set(row.id, singleRelation(row.brands));
    }
  }

  const enrichedBeers = beers.map((beer) => ({
    ...beer,
    brands: brandByBeerId.get(beer.id) ?? null,
  }));

  return (
    <TastingModalClient
      beers={enrichedBeers}
      breweries={breweries}
      countries={countries}
      styles={styles}
      hops={hops}
      saveTastingAction={
        saveTastingInModal
      }
    />
  );
}
