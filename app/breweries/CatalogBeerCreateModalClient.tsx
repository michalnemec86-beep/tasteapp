"use client";

import CatalogBeerModalClient from "./CatalogBeerModalClient";

type Props = {
  breweryName: string;
  createBeerAction: (
    formData: FormData
  ) => Promise<{
    success: boolean;
    beerId: number;
  }>;
};

export default function CatalogBeerCreateModalClient({
  breweryName,
  createBeerAction,
}: Props) {
  return (
    <CatalogBeerModalClient
      mode="create"
      breweryName={breweryName}
      saveAction={createBeerAction}
    />
  );
}
