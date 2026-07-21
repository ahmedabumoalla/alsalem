import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import { AppHeader } from "@/components/layout/app-header";
import { ToastProvider } from "@/components/ui/toast-provider";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { DataConnectionBanner } from "@/components/data/data-connection-banner";
import { LocalDataMigration } from "@/components/data/local-data-migration";
import "./globals.css";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "FoamSales | مبيعات الفلين",
  description: "منصة إدارة مبيعات الفلين — تسجيل الفواتير وحساب الأرباح ومتابعة التسليمات",
  applicationName: "FoamSales",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FoamSales",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#183B36",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ToastProvider>
          <PwaRegister />
          <AppHeader />
          <DataConnectionBanner />
          <LocalDataMigration />
          <main className="flex-1">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
