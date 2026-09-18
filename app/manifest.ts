import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pivník",
    short_name: "Pivník",
    description:
      "Pivní deník, statistiky, pivovary a společné ochutnávky.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#160e08",
    theme_color: "#160e08",
    lang: "cs",
    categories: ["food", "lifestyle"],
    icons: [
      {
        src: "/pwa-icon/192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
