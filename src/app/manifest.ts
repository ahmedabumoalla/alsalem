import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FoamSales | مبيعات الفلين",
    short_name: "FoamSales",
    description: "إدارة مبيعات الفلين والفواتير والتكاليف والعملاء",
    start_url: "/sales/new",
    scope: "/",
    display: "standalone",
    background_color: "#F7F8F5",
    theme_color: "#183B36",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
