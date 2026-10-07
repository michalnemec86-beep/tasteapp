"use client";

import CatalogBeerModalClient from "./CatalogBeerModalClient";

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
  allowBrandAssignment,
  updateBeerAction,
  deleteBeerAction,
}: Props) {
  return (
    <CatalogBeerModalClient
      mode="edit"
      breweryName={breweryName}
      beer={beer}
      allowBrandAssignment={allowBrandAssignment}
      saveAction={updateBeerAction}
      deleteAction={deleteBeerAction}
    />
  );
}
