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

type Props = {
  breweryName: string;
  styles: BeerStyle[];
  hops: Hop[];
  createBeerAction: (
    formData: FormData
  ) => Promise<{
    success: boolean;
    beerId: number;
  }>;
};

export default function CatalogBeerCreateModalClient({
  breweryName,
  styles,
  hops,
  createBeerAction,
}: Props) {
  return (
    <CatalogBeerModalClient
      mode="create"
      breweryName={breweryName}
      styles={styles}
      hops={hops}
      saveAction={createBeerAction}
    />
  );
}
