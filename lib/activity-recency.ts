import type { AppIconName } from "@/components/ui/AppIcon";
import {
  beerHref,
  brandHref,
  countryHref,
  hopHref,
  styleHref,
} from "@/lib/entity-navigation";
import {
  getCountryFlag,
} from "@/lib/country-flags";
import {
  getPackagingMeta,
  isPackaging,
} from "@/lib/packaging";

export const ACTIVITY_START_DATE =
  "2026-09-01";

export type ActivityRecencyItem = {
  id: string;
  name: string;
  date: string;
  logoUrl?: string;
  count?: number;
};

export type ActivityViewKey =
  | "recent-breweries"
  | "recent-styles"
  | "recent-packaging"
  | "recent-beers"
  | "recent-countries"
  | "recent-brands"
  | "recent-hops"
  | "news-breweries"
  | "news-brands"
  | "news-hops"
  | "news-styles"
  | "news-countries";

export type ActivityViewConfig = {
  group:
    | "recent"
    | "news";
  title: string;
  subtitle: string;
  icon: AppIconName;
  accent: string;
};

export const ACTIVITY_VIEW_CONFIG:
  Record<
    ActivityViewKey,
    ActivityViewConfig
  > = {
  "recent-breweries": {
    group: "recent",
    title:
      "Nedávno ochutnané pivovary",
    subtitle:
      "Podle poslední ochutnávky",
    icon: "brewery",
    accent: "#e88835",
  },
  "recent-styles": {
    group: "recent",
    title:
      "Nedávno ochutnané pivní styly",
    subtitle:
      "Poslední styly v hospodě",
    icon: "hop",
    accent: "#9cad47",
  },
  "recent-packaging": {
    group: "recent",
    title:
      "Poslední podání",
    subtitle:
      "Naposledy použité obaly a čepování",
    icon: "package",
    accent: "#e7a62f",
  },
  "recent-beers": {
    group: "recent",
    title:
      "Naposledy ochutnáno",
    subtitle:
      "Poslední různá piva",
    icon: "beer",
    accent: "#f2b63f",
  },
  "recent-countries": {
    group: "recent",
    title:
      "Nedávno ochutnané státy",
    subtitle:
      "Země podle poslední ochutnávky",
    icon: "globe",
    accent: "#d37f43",
  },
  "recent-brands": {
    group: "recent",
    title:
      "Nedávno ochutnané značky",
    subtitle:
      "Značky podle poslední ochutnávky",
    icon: "label",
    accent: "#d98a43",
  },
  "recent-hops": {
    group: "recent",
    title:
      "Nedávno ochutnané chmely",
    subtitle:
      "Chmely z posledních ochutnávek",
    icon: "hop",
    accent: "#8ea348",
  },
  "news-breweries": {
    group: "news",
    title:
      "Nové pivovary",
    subtitle:
      "Nově přidané do katalogu",
    icon: "brewery",
    accent: "#f0a44b",
  },
  "news-brands": {
    group: "news",
    title:
      "Nové značky",
    subtitle:
      "Nově přidané do katalogu",
    icon: "label",
    accent: "#e58a45",
  },
  "news-hops": {
    group: "news",
    title:
      "Nové chmely",
    subtitle:
      "Nově přidané do katalogu",
    icon: "hop",
    accent: "#9cab50",
  },
  "news-styles": {
    group: "news",
    title:
      "Nové pivní styly",
    subtitle:
      "Nově přidané do katalogu",
    icon: "beer",
    accent: "#d77755",
  },
  "news-countries": {
    group: "news",
    title:
      "Nově ochutnané státy",
    subtitle:
      "První ochutnávka země od 1. 9. 2026",
    icon: "globe",
    accent: "#c99554",
  },
};

export const RECENT_ACTIVITY_VIEWS =
  [
    "recent-breweries",
    "recent-styles",
    "recent-packaging",
    "recent-beers",
    "recent-countries",
    "recent-brands",
    "recent-hops",
  ] as const satisfies readonly ActivityViewKey[];

export const NEWS_ACTIVITY_VIEWS =
  [
    "news-breweries",
    "news-brands",
    "news-hops",
    "news-styles",
    "news-countries",
  ] as const satisfies readonly ActivityViewKey[];

export type ActivityRecencyDashboard = {
  startDate: string;
  counts: {
    units: number;
    beers: number;
    brands: number;
    breweries: number;
    styles: number;
    countries: number;
    hops: number;
  };
  recent: {
    breweries:
      ActivityRecencyItem[];
    styles:
      ActivityRecencyItem[];
    packaging:
      ActivityRecencyItem[];
    beers:
      ActivityRecencyItem[];
    countries:
      ActivityRecencyItem[];
    brands:
      ActivityRecencyItem[];
    hops:
      ActivityRecencyItem[];
  };
  news: {
    breweries:
      ActivityRecencyItem[];
    brands:
      ActivityRecencyItem[];
    hops:
      ActivityRecencyItem[];
    styles:
      ActivityRecencyItem[];
    countries:
      ActivityRecencyItem[];
  };
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
  );
}

export function parseActivityRecencyItems(
  value: unknown
): ActivityRecencyItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(
    (entry) => {
      if (
        !isRecord(entry)
      ) {
        return [];
      }

      const rawId =
        entry.id;
      const name =
        typeof entry.name ===
        "string"
          ? entry.name
          : "";
      const date =
        typeof entry.date ===
        "string"
          ? entry.date
          : "";
      const logoUrl =
        typeof entry.logoUrl ===
          "string" &&
        entry.logoUrl.trim()
          ? entry.logoUrl
          : undefined;
      const parsedCount =
        Number(entry.count);
      const count =
        Number.isFinite(
          parsedCount
        ) &&
        parsedCount > 0
          ? parsedCount
          : undefined;

      if (
        (
          typeof rawId !==
            "string" &&
          typeof rawId !==
            "number"
        ) ||
        !name ||
        !/^\d{4}-\d{2}-\d{2}$/.test(
          date
        )
      ) {
        return [];
      }

      return [{
        id: String(rawId),
        name,
        date,
        ...(logoUrl
          ? { logoUrl }
          : {}),
        ...(count
          ? { count }
          : {}),
      }];
    }
  );
}

function readItems(
  value: unknown,
  key: string
) {
  if (!isRecord(value)) {
    return [];
  }

  return parseActivityRecencyItems(
    value[key]
  );
}

function readCount(
  value: unknown,
  key: string
) {
  if (!isRecord(value)) {
    return 0;
  }

  const count =
    Number(value[key]);

  return Number.isFinite(
    count
  )
    ? count
    : 0;
}

export function parseActivityRecencyDashboard(
  value: unknown
): ActivityRecencyDashboard {
  if (!isRecord(value)) {
    throw new Error(
      "Data aktivity mají neplatný formát."
    );
  }

  const recent =
    isRecord(value.recent)
      ? value.recent
      : {};

  const news =
    isRecord(value.news)
      ? value.news
      : {};

  const counts =
    isRecord(value.counts)
      ? value.counts
      : {};

  return {
    startDate:
      typeof value.startDate ===
        "string"
        ? value.startDate
        : ACTIVITY_START_DATE,
    counts: {
      units:
        readCount(
          counts,
          "units"
        ),
      beers:
        readCount(
          counts,
          "beers"
        ),
      brands:
        readCount(
          counts,
          "brands"
        ),
      breweries:
        readCount(
          counts,
          "breweries"
        ),
      styles:
        readCount(
          counts,
          "styles"
        ),
      countries:
        readCount(
          counts,
          "countries"
        ),
      hops:
        readCount(
          counts,
          "hops"
        ),
    },
    recent: {
      breweries:
        readItems(
          recent,
          "breweries"
        ),
      styles:
        readItems(
          recent,
          "styles"
        ),
      packaging:
        readItems(
          recent,
          "packaging"
        ),
      beers:
        readItems(
          recent,
          "beers"
        ),
      countries:
        readItems(
          recent,
          "countries"
        ),
      brands:
        readItems(
          recent,
          "brands"
        ),
      hops:
        readItems(
          recent,
          "hops"
        ),
    },
    news: {
      breweries:
        readItems(
          news,
          "breweries"
        ),
      brands:
        readItems(
          news,
          "brands"
        ),
      hops:
        readItems(
          news,
          "hops"
        ),
      styles:
        readItems(
          news,
          "styles"
        ),
      countries:
        readItems(
          news,
          "countries"
        ),
    },
  };
}

export function getActivityViewItems(
  dashboard:
    ActivityRecencyDashboard,
  view:
    ActivityViewKey
) {
  switch (view) {
    case "recent-breweries":
      return dashboard.recent.breweries;
    case "recent-styles":
      return dashboard.recent.styles;
    case "recent-packaging":
      return dashboard.recent.packaging;
    case "recent-beers":
      return dashboard.recent.beers;
    case "recent-countries":
      return dashboard.recent.countries;
    case "recent-brands":
      return dashboard.recent.brands;
    case "recent-hops":
      return dashboard.recent.hops;
    case "news-breweries":
      return dashboard.news.breweries;
    case "news-brands":
      return dashboard.news.brands;
    case "news-hops":
      return dashboard.news.hops;
    case "news-styles":
      return dashboard.news.styles;
    case "news-countries":
      return dashboard.news.countries;
  }
}

export function isActivityViewKey(
  value: string
): value is ActivityViewKey {
  return Object.prototype
    .hasOwnProperty.call(
      ACTIVITY_VIEW_CONFIG,
      value
    );
}

export function activityOverviewHref(
  view: ActivityViewKey
) {
  return (
    "/activity/prehled/" +
    view
  );
}

export function activityItemHref(
  view: ActivityViewKey,
  item: ActivityRecencyItem
) {
  switch (view) {
    case "recent-breweries":
    case "news-breweries":
      return (
        "/breweries/" +
        item.id
      );
    case "recent-styles":
    case "news-styles":
      return styleHref(
        item.id
      );
    case "recent-packaging":
      return (
        "/stats/packaging/" +
        encodeURIComponent(
          item.id
        )
      );
    case "recent-beers":
      return beerHref(
        item.id
      );
    case "recent-countries":
    case "news-countries":
      return countryHref(
        item.name
      );
    case "recent-brands":
    case "news-brands":
      return brandHref(
        item.id
      );
    case "recent-hops":
    case "news-hops":
      return hopHref(
        item.id
      );
  }
}

export function activityItemDisplayName(
  view: ActivityViewKey,
  item: ActivityRecencyItem
) {
  if (
    view ===
      "recent-packaging" &&
    isPackaging(item.id)
  ) {
    return (
      getPackagingMeta(
        item.id
      )?.label ??
      item.name
    );
  }

  return item.name;
}

export function activityItemFlag(
  view: ActivityViewKey,
  item: ActivityRecencyItem
) {
  if (
    view ===
      "recent-countries" ||
    view ===
      "news-countries"
  ) {
    return getCountryFlag(
      item.name
    );
  }

  return "";
}
