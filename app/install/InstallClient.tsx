"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Copy, Download, Share, Smartphone, RefreshCw } from "lucide-react";
import { usePwa } from "@/app/PwaProvider";
import { getInstallUrl } from "@/lib/pwa";

export default function InstallClient() {
  const { platform, installed, inAppBrowser, canInstall, install } = usePwa();
  const [selected, setSelected] = useState<"android" | "ios">("android");
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (platform === "ios" || platform === "android") setSelected(platform);
  }, [platform]);

  useEffect(() => {
    let active = true;
    const installUrl = getInstallUrl(window.location.origin);
    setUrl(installUrl);
    if (platform !== "desktop") return;
    // Generated on this device; the link is never sent to a third-party QR service.
    void import("qrcode").then(QRCode => QRCode.toDataURL(installUrl, {
      width: 320, margin: 4, errorCorrectionLevel: "M", color: { dark: "#160e08", light: "#ffffff" },
    })).then(data => { if (active) setQr(data); }).catch(() => {
      if (active) setMessage("QR kód se nepodařilo vytvořit. Použij odkaz pod ním.");
    });
    return () => { active = false; };
  }, [platform]);

  async function handleInstall() {
    setBusy(true);
    setMessage("");
    try {
      const outcome = await install();
      setMessage(outcome === "accepted"
        ? "Instalace byla potvrzena. Pivník pak otevři jeho ikonou na ploše."
        : "Instalaci můžeš kdykoliv spustit znovu z menu prohlížeče podle návodu níže.");
    } catch {
      setMessage("Instalaci spusť z menu prohlížeče podle návodu níže.");
    } finally { setBusy(false); }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMessage("Odkaz je zkopírovaný. Můžeš ho otevřít v prohlížeči nebo poslat dál.");
    } catch {
      setMessage("Odkaz můžeš zkopírovat z pole níže.");
    }
  }

  const iosSteps = [
    { title: "Otevři tuto stránku v Safari", text: "Pokud jsi odkaz otevřel v jiné aplikaci, zkopíruj ho do Safari." },
    { title: "Otevři Sdílet", text: "Klepni na ikonu sdílení. Podle verze Safari může být v nabídce stránky." },
    { title: "Vyber Přidat na plochu", text: "Pokud vidíš volbu Otevřít jako webovou aplikaci, nech ji zapnutou. Potvrď Přidat." },
    { title: "Spusť Pivník z plochy", text: "Klepni na novou ikonu Pivníku a přihlas se svým účtem." },
  ];
  const androidSteps = [
    { title: "Otevři tuto stránku v Chrome", text: "Pivník můžeš nainstalovat přímo z prohlížeče v telefonu." },
    { title: "Otevři menu ⋮", text: "Vyber Nainstalovat aplikaci nebo Přidat na plochu. Název se může lišit podle telefonu." },
    { title: "Potvrď instalaci", text: "Ponech název Pivník a dokonči přidání do telefonu." },
    { title: "Spusť Pivník jeho ikonou", text: "Najdeš ho mezi aplikacemi nebo na ploše. Přihlas se svým účtem." },
  ];

  return (
    <main className="pivnik-install-page">
      <header className="pivnik-install-hero">
        <Image src="/pwa-icon/192.png" alt="" width={88} height={88} priority unoptimized className="pivnik-install-icon" />
        <div><span className="pivnik-install-eyebrow">Pivník do telefonu</span>
          <h1>Nainstalovat Pivník</h1>
          <p>Tvůj pivní deník na jedno klepnutí. Se stejným vzhledem, který už znáš.</p>
        </div>
      </header>

      <div className="pivnik-install-layout">
        <section className="pivnik-install-card" aria-labelledby="install-heading">
          {installed ? <div className="pivnik-installed-state">
            <div className="pivnik-install-success"><Check size={30} aria-hidden="true" /></div>
            <h2 id="install-heading">Pivník je nainstalovaný</h2>
            <p>Máš vše připravené. Otevři deník a pokračuj ve své pivní cestě.</p>
            <Link href="/" className="pivnik-install-button">Otevřít pivní deník</Link>
          </div> : <>
            <div className="pivnik-install-card-heading"><Smartphone size={22} aria-hidden="true" /><h2 id="install-heading">Přidej si Pivník do telefonu</h2></div>
            <p className="pivnik-install-intro">Jedna aplikace pro Android i iPhone. Instalace zabere jen pár kroků.</p>
            {inAppBrowser && <p className="pivnik-install-notice">Tento odkaz je otevřený uvnitř jiné aplikace. Pro instalaci ho otevři v {platform === "ios" ? "Safari" : "Chrome"}. Odkaz můžeš zkopírovat níže.</p>}

            {platform === "android" && !inAppBrowser && canInstall && <button type="button" onClick={handleInstall} disabled={busy} className="pivnik-install-button">
              <Download size={19} aria-hidden="true" />{busy ? "Otevírám instalaci…" : "Nainstalovat Pivník"}
            </button>}
            <div className="pivnik-install-platforms" role="group" aria-label="Postup pro telefon">
              <button type="button" aria-pressed={selected === "android"} onClick={() => setSelected("android")}>Android</button>
              <button type="button" aria-pressed={selected === "ios"} onClick={() => setSelected("ios")}>iPhone</button>
            </div>
            <ol className="pivnik-install-steps">
              {(selected === "ios" ? iosSteps : androidSteps).map((step, index) => <li key={step.title}>
                <span className="pivnik-install-step-number" aria-hidden="true">{index + 1}</span>
                <div><h3>{step.title}{selected === "ios" && index === 1 && <Share size={16} aria-hidden="true" />}</h3><p>{step.text}</p></div>
              </li>)}
            </ol>
          </>}
          <div className="pivnik-install-link-tools">
            <label htmlFor="install-url">Odkaz do telefonu</label>
            <div><input id="install-url" type="url" value={url} readOnly onFocus={event => event.target.select()} />
              <button type="button" onClick={copyLink} disabled={!url} aria-label="Zkopírovat instalační odkaz">{copied ? <Check size={19} aria-hidden="true" /> : <Copy size={19} aria-hidden="true" />}</button>
            </div>
          </div>
          <p className="pivnik-install-message" role="status" aria-live="polite">{message}</p>
        </section>

        <aside className="pivnik-install-side">
          <section className="pivnik-install-card pivnik-install-qr" aria-labelledby="qr-heading">
            <h2 id="qr-heading">Otevři telefonem</h2>
            <p>Namiř fotoaparát na QR kód. V telefonu se otevře tato stránka s postupem instalace.</p>
            <div className="pivnik-install-qr-image">{qr ? <Image src={qr} alt="QR kód pro instalaci Pivníku" width={224} height={224} unoptimized /> : <span>Připravuji QR kód…</span>}</div>
            <span className="pivnik-install-qr-caption">Android i iPhone · jeden odkaz</span>
          </section>
          <section className="pivnik-install-card pivnik-install-details">
            <div><RefreshCw size={20} aria-hidden="true" /><h2>Vždy aktuální Pivník</h2></div>
            <p>Novinky a úpravy se načtou při dalším otevření. Instalaci kvůli nim nemusíš opakovat.</p>
            <p>Deník a ukládání ochutnávek potřebují internet. Při ztrátě připojení ti Pivník dá vědět.</p>
            <p>Instalace nevytváří nový účet. Použij stejné přihlášení jako na webu.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
