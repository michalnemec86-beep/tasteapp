import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountSettings from "./AccountSettings";
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
      />
    </main>
  );
}
