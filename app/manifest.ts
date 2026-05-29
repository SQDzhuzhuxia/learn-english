import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Learn English",
    short_name: "English",
    description: "Personal AI English immersion app.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f7f8",
    theme_color: "#f7f7f8",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/pwa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
