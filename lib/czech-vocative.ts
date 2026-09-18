const COMMON_CZECH_VOCATIVES: Record<string, string> = {
  adam: "Adame",
  aleš: "Aleši",
  david: "Davide",
  filip: "Filipe",
  honza: "Honzo",
  jakub: "Jakube",
  jan: "Jane",
  jindřich: "Jindřichu",
  jiří: "Jiří",
  josef: "Josefe",
  karel: "Karle",
  lukáš: "Lukáši",
  marek: "Marku",
  martin: "Martine",
  matěj: "Matěji",
  michal: "Michale",
  milan: "Milane",
  ondřej: "Ondřeji",
  patrik: "Patriku",
  pavel: "Pavle",
  petr: "Petře",
  radek: "Radku",
  roman: "Romane",
  tomáš: "Tomáši",
  václav: "Václave",
  vít: "Víte",
  vojta: "Vojto",
  zdeněk: "Zdeňku",
};

export function getCzechVocative(name: string) {
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  if (!firstName) {
    return "";
  }

  const knownForm = COMMON_CZECH_VOCATIVES[firstName.toLocaleLowerCase("cs")];

  if (knownForm) {
    return knownForm;
  }

  if (firstName.endsWith("a")) {
    return `${firstName.slice(0, -1)}o`;
  }

  if (/[eiyíý]$/i.test(firstName)) {
    return firstName;
  }

  if (/[šžčřcj]$/i.test(firstName)) {
    return `${firstName}i`;
  }

  if (/[kgh]$/i.test(firstName)) {
    return `${firstName}u`;
  }

  return `${firstName}e`;
}
