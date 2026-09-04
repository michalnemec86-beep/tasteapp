import type { Metadata } from "next";
import { Geist } from "next/font/google";

import AppNav from "./AppNav";
import AuthSessionSync from "./AuthSessionSync";

import "leaflet/dist/leaflet.css";
import "./globals.css";

const defaultUrl =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://127.0.0.1:3000";

export const metadata: Metadata = {
  metadataBase: new URL(
    defaultUrl
  ),

  title: "TasteApp",

  description:
    "Pivní deník, statistiky a společné ochutnávky.",
};

const geistSans =
  Geist({
    variable:
      "--font-geist-sans",

    display:
      "swap",

    subsets:
      ["latin"],
  });

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body
        className={`${geistSans.className} antialiased`}
      >
        <AuthSessionSync />
        <AppNav />

        {children}
      </body>
    </html>
  );
}