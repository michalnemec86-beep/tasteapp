"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePwa } from "../PwaProvider";
import { disablePush, enablePush, pushStatus, supportsPush } from "@/lib/push-news-client";

export default function PushNewsSettings({ userId }: { userId: string }) {
  const { installed, platform } = usePwa();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const available = supportsPush();
    setSupported(available);
    if (!available || !installed) { setLoading(false); return; }
    setLoading(true);
    void pushStatus().then(status => {
      if (cancelled) return;
      setEnabled(Boolean(status.enabled)); setPublicKey(status.publicKey ?? "");
    }).catch(() => {
      if (!cancelled) { setMessage("Nastavení oznámení se nepodařilo načíst. Obnov stránku."); setError(true); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [installed, userId]);

  async function toggle() {
    setBusy(true); setMessage(""); setError(false);
    try {
      if (enabled) { await disablePush(); setEnabled(false); setMessage("Oznámení jsou vypnutá."); }
      else { await enablePush(userId, publicKey); setEnabled(true); setMessage("Oznámení jsou zapnutá pro tento telefon."); }
    } catch (e) {
      setError(true); setMessage(e instanceof Error ? e.message : "Změna se nepodařila. Zkus to znovu.");
    } finally { setBusy(false); }
  }
  return <section className="taste-settings-card" aria-labelledby="settings-push-title">
    <h2 id="settings-push-title">Novinky na telefonu</h2>
    <p>„V Pivníku jsou novinky“ i při zavřené aplikaci. Nejvýše jednou denně, mezi 8 a 22 hodinou. Označení ikony závisí na nastavení telefonu.</p>
    {!installed ? <p><Link href="/install">Nejdřív přidej Pivník na plochu</Link>{platform === "ios" ? " a otevři ho z jeho ikony." : "."}</p>
      : !supported ? <p>Tento prohlížeč oznámení nepodporuje. Na iPhonu je potřeba iOS 16.4 nebo novější.</p>
      : <button type="button" aria-pressed={enabled} onClick={toggle} disabled={busy || loading || (!enabled && !publicKey)}>{busy ? "Nastavuji…" : loading ? "Načítám…" : enabled ? "Vypnout oznámení" : "Zapnout oznámení"}</button>}
    {message && <p className="taste-settings-feedback" role="status" data-error={error}>{message}</p>}
  </section>;
}
