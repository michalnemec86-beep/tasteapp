export const PACKAGING_OPTIONS = [
  {
    value: "draft",
    label: "Čepované",
    icon: "🍺",
  },
  {
    value: "bottle",
    label: "Láhev",
    icon: "🍾",
  },
  {
    value: "can",
    label: "Plechovka",
    icon: "🥫",
  },
  {
    value: "pet",
    label: "PET",
    icon: "🧴",
  },
  {
    value: "other",
    label: "Jiné",
    icon: "📦",
  },
] as const;

export type Packaging =
  (typeof PACKAGING_OPTIONS)[number]["value"];

export function isPackaging(
  value: string
): value is Packaging {
  return PACKAGING_OPTIONS.some(
    (option) => option.value === value
  );
}

export function getPackagingMeta(
  value: string | null | undefined
) {
  if (!value) {
    return null;
  }

  return (
    PACKAGING_OPTIONS.find(
      (option) => option.value === value
    ) ?? null
  );
}