"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { getPwaPlatform, isInAppBrowser, type PwaPlatform } from "@/lib/pwa";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaState = {
  platform: PwaPlatform | null;
  installed: boolean;
  inAppBrowser: boolean;
  canInstall: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

const PwaContext = createContext<PwaState | null>(null);

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("PwaProvider is missing");
  return context;
}

export default function PwaProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<PwaPlatform | null>(null);
  const [installed, setInstalled] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const detectInstalled = () => setInstalled(displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const syncConnection = () => setOffline(!navigator.onLine);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };

    setPlatform(getPwaPlatform(navigator.userAgent, navigator.maxTouchPoints));
    setInAppBrowser(isInAppBrowser(navigator.userAgent));
    detectInstalled();
    syncConnection();
    displayMode.addEventListener("change", detectInstalled);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);

    // Keep a filled form on screen instead of starting an impossible save or navigation.
    const guardOffline = (event: Event) => {
      if (navigator.onLine) return;
      if (event.type === "click") {
        const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
        if (!(anchor instanceof HTMLAnchorElement) || anchor.origin !== window.location.origin ||
          (anchor.pathname === window.location.pathname && anchor.search === window.location.search && anchor.hash)) return;
      }
      event.preventDefault();
      event.stopPropagation();
      setOffline(true);
    };
    document.addEventListener("submit", guardOffline, true);
    document.addEventListener("click", guardOffline, true);

    let registration: ServiceWorkerRegistration | undefined;
    let lastUpdate = Date.now();
    const checkUpdate = () => {
      if (registration && navigator.onLine && document.visibilityState === "visible" && Date.now() - lastUpdate > 60 * 60 * 1000) {
        lastUpdate = Date.now();
        void registration.update().catch(() => undefined);
      }
    };
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(value => { registration = value; })
        .catch(error => console.warn("Pivník service worker:", error));
      document.addEventListener("visibilitychange", checkUpdate);
    }

    return () => {
      displayMode.removeEventListener("change", detectInstalled);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
      document.removeEventListener("submit", guardOffline, true);
      document.removeEventListener("click", guardOffline, true);
      document.removeEventListener("visibilitychange", checkUpdate);
    };
  }, []);

  async function install(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!prompt) return "unavailable";
    const current = prompt;
    setPrompt(null);
    // Must run directly from the user's tap (before awaiting anything else).
    await current.prompt();
    return (await current.userChoice).outcome;
  }

  return (
    <PwaContext.Provider value={{ platform, installed, inAppBrowser, canInstall: Boolean(prompt) && !installed, install }}>
      {offline && <div className="pivnik-connection-banner" role="status" aria-live="polite">
        <WifiOff size={18} aria-hidden="true" />
        <span><strong>Bez připojení</strong> · Ochutnávku ulož až po návratu internetu. Vyplněný formulář můžeš nechat otevřený.</span>
      </div>}
      {children}
    </PwaContext.Provider>
  );
}
