import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist } from "next/font/google";

import AppNav from "./AppNav";
import AuthSessionSync from "./AuthSessionSync";
import BreweryListStatePersistence from "./BreweryListStatePersistence";
import PivnikLaunchScreen from "./PivnikLaunchScreen";
import PwaProvider from "./PwaProvider";
import NavigationFeedback from "./NavigationFeedback";
import ModalBehaviorManager from "./ModalBehaviorManager";
import AchievementCelebrationClient from "./AchievementCelebrationClient";
import { getCurrentUser } from "@/lib/supabase/current-user";

import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./homepage-timeline-theme.css";
import "./preimport-ui-tweaks.css";
import "./modal-responsive.css";
import "./app-nav.css";
import "./mobile-ux.css";
import "./desktop-polish.css";
import "./home-concept.css";
import "./visual-system.css";
import "./rating-controls.css";
import "./tasting-form-compact.css";
import "./achievement-celebration.css";
import "./pwa.css";

const defaultUrl =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://127.0.0.1:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "Pivník",
    template: "%s | Pivník",
  },
  applicationName: "Pivník",
  description:
    "Pivní deník, statistiky, pivovary a společné ochutnávky.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Pivník",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      {
        url: "/pwa-icon/192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/pwa-icon/512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/pwa-icon/180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#160e08",
  colorScheme: "dark",
  viewportFit: "cover",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="cs">
      <body
        className={`${geistSans.className} antialiased`}
      >
        <PwaProvider>
          <PivnikLaunchScreen />
          <Suspense fallback={null}>
            <NavigationFeedback />
          </Suspense>
          <ModalBehaviorManager />
          {user && <Suspense fallback={null}>
            <AchievementCelebrationClient key={user.id} userId={user.id} />
          </Suspense>}
          <AuthSessionSync />
          <BreweryListStatePersistence />
          <div className="taste-app-shell">
            <AppNav currentUserId={user?.id ?? null} />
            {children}
          </div>
        </PwaProvider>
      </body>
    </html>
  );
}
