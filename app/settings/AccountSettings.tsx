"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateOwnRealName } from "@/app/profiles/actions";

export default function AccountSettings({
  displayName,
  realName,
  email,
}: {
  displayName: string;
  realName: string | null;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(realName ?? "");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  async function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameMessage("");
    const value = name.trim();
    if (value.length > 60) {
      setNameError(true);
      setNameMessage("Jméno může mít maximálně 60 znaků.");
      return;
    }

    setNameBusy(true);
    try {
      const form = new FormData();
      form.set("real_name", value);
      await updateOwnRealName(form);
      setName(value);
      setNameError(false);
      setNameMessage(value ? "Jméno je uložené." : "Jméno bylo odstraněno.");
      router.refresh();
    } catch {
      setNameError(true);
      setNameMessage("Jméno se nepodařilo uložit. Zkus to znovu.");
    } finally {
      setNameBusy(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError(true);

    if (newPassword.length < 8) {
      setPasswordMessage("Nové heslo musí mít alespoň 8 znaků.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Nová hesla se neshodují.");
      return;
    }
    if (!email) {
      setPasswordMessage("Účet nemá přiřazený e-mail pro ověření hesla.");
      return;
    }

    setPasswordBusy(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        setPasswordMessage("Současné heslo není správné, nebo ověření selhalo.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(false);
      setPasswordMessage("Heslo bylo změněno.");
    } catch {
      setPasswordMessage("Heslo se nepodařilo změnit. Zkontroluj požadavky na heslo a zkus to znovu.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="taste-settings-grid">
      <section className="taste-settings-card" aria-labelledby="settings-name-title">
        <h2 id="settings-name-title">Jméno v profilu</h2>
        <p>Přezdívka <strong>{displayName}</strong> se nemění. Jméno se zobrazí pod ní a můžeš ho kdykoliv upravit nebo smazat.</p>
        <form onSubmit={saveName}>
          <label htmlFor="profile-real-name">Jméno</label>
          <input id="profile-real-name" name="real_name" type="text" autoComplete="name" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="Tvoje jméno" />
          <button type="submit" disabled={nameBusy}>{nameBusy ? "Ukládám…" : "Uložit jméno"}</button>
          {nameMessage && <p className="taste-settings-feedback" role="status" data-error={nameError}>{nameMessage}</p>}
        </form>
      </section>

      <section className="taste-settings-card" aria-labelledby="settings-password-title">
        <h2 id="settings-password-title">Změna hesla</h2>
        <p>Nejdřív potvrď současné heslo. Nové heslo musí mít alespoň 8 znaků.</p>
        <form onSubmit={changePassword}>
          <label htmlFor="current-password">Současné heslo</label>
          <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          <label htmlFor="new-password">Nové heslo</label>
          <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          <label htmlFor="confirm-password">Nové heslo znovu</label>
          <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          <button type="submit" disabled={passwordBusy}>{passwordBusy ? "Měním heslo…" : "Změnit heslo"}</button>
          {passwordMessage && <p className="taste-settings-feedback" role="status" data-error={passwordError}>{passwordMessage}</p>}
        </form>
      </section>
    </div>
  );
}
