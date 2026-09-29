"use client";

import CatalogBeerModalClient from "./CatalogBeerModalClient";

type BeerStyle = {
  id: number;
  name: string;
  aliases: string[] | null;
};

type Hop = {
  id: number;
  name: string;
  aliases: string[] | null;
};

type Beer = {
  id: number;
  name: string;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  isNonAlcoholic: boolean;
  styleName: string;
  hopNames: string[];
  tastingCount: number;
  portfolioStatus: string;
};

type Props = {
  breweryName: string;
  beer: Beer;
  styles: BeerStyle[];
  hops: Hop[];
  allowBrandAssignment?: boolean;
  updateBeerAction: (
    formData: FormData
  ) => Promise<{
    success: boolean;
    beerId: number;
  }>;
  deleteBeerAction: () => Promise<{
    success: boolean;
    beerId: number;
  }>;
};

export default function CatalogBeerEditModalClient({
  breweryName,
  beer,
  styles,
  hops,
  allowBrandAssignment,
  updateBeerAction,
  deleteBeerAction,
}: Props) {
  return (
    <CatalogBeerModalClient
      mode="edit"
      breweryName={breweryName}
      beer={beer}
      styles={styles}
      hops={hops}
      allowBrandAssignment={allowBrandAssignment}
      saveAction={updateBeerAction}
      deleteAction={deleteBeerAction}
    />
  );
}
