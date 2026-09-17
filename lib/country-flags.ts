import countries from "i18n-iso-countries";
import cs from "i18n-iso-countries/langs/cs.json";

countries.registerLocale(cs);

const SPECIAL_FLAGS: Record<string, string> = {
  Anglie: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Skotsko: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Severní Irsko": "🇬🇧",
  Kosovo: "🇽🇰",
  Česko: "🇨🇿",
  "Česká republika": "🇨🇿",
  USA: "🇺🇸",
  "Spojené státy": "🇺🇸",
  "Spojené státy americké": "🇺🇸",
};

const NORMALIZED_SPECIAL_FLAGS = Object.fromEntries(
  Object.entries(SPECIAL_FLAGS).map(([name, flag]) => [normalizeCountryName(name), flag])
) as Record<string, string>;

export function normalizeCountryName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getCountryFlag(countryName: string | null | undefined) {
  const name = countryName?.trim();

  if (!name) {
    return "";
  }

  const specialFlag = SPECIAL_FLAGS[name] ?? NORMALIZED_SPECIAL_FLAGS[normalizeCountryName(name)];

  if (specialFlag) {
    return specialFlag;
  }

  const alpha2 = countries.getAlpha2Code(name, "cs");

  if (!alpha2 || alpha2.length !== 2) {
    return "";
  }

  return String.fromCodePoint(
    ...alpha2
      .toUpperCase()
      .split("")
      .map((letter) => 127397 + letter.charCodeAt(0))
  );
}
