import countries from "i18n-iso-countries";
import cs from "i18n-iso-countries/langs/cs.json";

countries.registerLocale(cs);

const SPECIAL_FLAGS: Record<string, string> = {
  Anglie: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Skotsko: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Severní Irsko": "🇬🇧",
  Kosovo: "🇽🇰",
};

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

  if (SPECIAL_FLAGS[name]) {
    return SPECIAL_FLAGS[name];
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
