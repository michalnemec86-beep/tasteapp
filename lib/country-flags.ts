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

const COUNTRY_COLOR_PALETTES: Record<string, readonly string[]> = {
  AT: ["#ed2939", "#ffffff", "#ed2939"],
  BE: ["#171717", "#fdda24", "#ef3340"],
  CZ: ["#ffffff", "#d7141a", "#11457e"],
  DE: ["#171717", "#dd0000", "#ffce00"],
  DK: ["#c8102e", "#ffffff", "#c8102e"],
  ES: ["#aa151b", "#f1bf00", "#aa151b"],
  FI: ["#ffffff", "#003580", "#ffffff"],
  FR: ["#0055a4", "#ffffff", "#ef4135"],
  GB: ["#012169", "#ffffff", "#c8102e"],
  IE: ["#169b62", "#ffffff", "#ff883e"],
  IT: ["#009246", "#ffffff", "#ce2b37"],
  NL: ["#ae1c28", "#ffffff", "#21468b"],
  NO: ["#ba0c2f", "#ffffff", "#00205b"],
  PL: ["#ffffff", "#dc143c"],
  SE: ["#006aa7", "#fecc02", "#006aa7"],
  SK: ["#ffffff", "#0b4ea2", "#ee1c25"],
  US: ["#b31942", "#ffffff", "#0a3161"],
};

export function getCountryEvidenceHref(countryName: string) {
  return `/stats/country/${encodeURIComponent(countryName)}`;
}

export function getCountryHeroTheme(countryName: string | null | undefined) {
  const name = countryName?.trim();

  if (!name) {
    return undefined;
  }

  const normalizedName = normalizeCountryName(name);
  const specialCode =
    normalizedName === "anglie" ||
    normalizedName === "skotsko" ||
    normalizedName === "wales" ||
    normalizedName === "severni irsko"
      ? "GB"
      : normalizedName === "usa" ||
          normalizedName === "spojene staty" ||
          normalizedName === "spojene staty americke"
        ? "US"
        : normalizedName === "cesko" || normalizedName === "ceska republika"
          ? "CZ"
          : undefined;
  const countryCode = specialCode ?? countries.getAlpha2Code(name, "cs")?.toUpperCase();

  return {
    flag: getCountryFlag(name),
    colors: COUNTRY_COLOR_PALETTES[countryCode ?? ""] ?? ["#6f421f", "#f2b63f", "#d65b42"],
  };
}
