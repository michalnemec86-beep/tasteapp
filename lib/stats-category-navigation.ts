export function statsCategoryHref(title: string) {
  const focus: Record<string, string> = {
    "Nejčastější pivovary": "breweries", "Pivovary": "breweries",
    "Nejčastější piva": "beers", "Piva": "beers",
    "Značky": "brands", "Pivní styly": "styles", "Státy": "countries",
    "Chmely": "hops", "Způsob podání": "packaging",
  };
  return focus[title] ? `/stats?focus=${focus[title]}` : "/stats";
}
