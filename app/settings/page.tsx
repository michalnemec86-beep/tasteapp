import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminView, isCatalogAdminUser } from "@/lib/adminView";
import AccountSettings from "./AccountSettings";
import PushNewsSettings from "./PushNewsSettings";
import "./settings.css";

export const metadata: Metadata = { title: "Nastavení" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, real_name")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return <main className="taste-settings-page"><p>Profil se nepodařilo načíst. Zkus stránku obnovit.</p></main>;
  }

  return (
    <main className="taste-settings-page">
      <div className="taste-settings-heading">
        <h1>Nastavení</h1>
      </div>
      <AccountSettings
        displayName={profile.display_name}
        realName={profile.real_name}
        email={user.email ?? ""}
        canSwitchView={isCatalogAdminUser(user.id)}
        adminView={await isAdminView(user.id)}
      />
      <div className="taste-settings-grid taste-settings-push-grid"><PushNewsSettings userId={user.id} /></div>
      <section className="taste-settings-install-card" aria-label="Instalace aplikace">
        <div>
          <h2>Instalace Pivníku</h2>
          <p>Otevři návod k instalaci aplikace na iPhone nebo Android.</p>
        </div>
        <Link href="/install" className="taste-settings-install-link">
          <Download size={18} aria-hidden="true" />
          Nainstalovat Pivník
        </Link>
      </section>
    </main>
  );
}
