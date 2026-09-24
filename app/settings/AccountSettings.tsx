"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateOwnRealName } from "@/app/profiles/actions";
import { updateCatalogView } from "./view-actions";

type InvitationRow = {
  id: string;
  email: string;
  invitedAt: string | null;
  confirmationSentAt: string | null;
  confirmedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string | null;
};

type QrInvitation = {
  id: string;
  email: string;
  url: string;
  qrSvg: string;
  expiresAt: string;
};

const invitationDateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatInvitationDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : invitationDateFormatter.format(date);
}

export default function AccountSettings({
  displayName,
  realName,
  email,
  canSwitchView,
  adminView,
}: {
  displayName: string;
  realName: string | null;
  email: string;
  canSwitchView: boolean;
  adminView: boolean;
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
  const [view, setView] = useState<"admin" | "normal">(adminView ? "admin" : "normal");
  const [viewBusy, setViewBusy] = useState(false);
  const [viewError, setViewError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusyEmail, setInviteBusyEmail] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteMessageError, setInviteMessageError] = useState(false);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(canSwitchView);
  const [invitationsError, setInvitationsError] = useState("");
  const [qrInvitation, setQrInvitation] = useState<QrInvitation | null>(null);
  const [inviteBusyKind, setInviteBusyKind] = useState<"qr" | "account" | "cancel" | null>(null);
  const [inviteLinkMessage, setInviteLinkMessage] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualPasswordAgain, setManualPasswordAgain] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [manualMessageError, setManualMessageError] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [credentialsMessage, setCredentialsMessage] = useState("");

  const loadInvitations = useCallback(async () => {
    if (!canSwitchView) return;

    setInvitationsLoading(true);
    setInvitationsError("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("admin-invitations", {
        body: { action: "list" },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message ?? "Pozvánky se nepodařilo načíst.");

      setInvitations(Array.isArray(data.invitations) ? data.invitations : []);
    } catch {
      setInvitationsError("Pozvánky se nepodařilo načíst. Zkus stránku obnovit.");
    } finally {
      setInvitationsLoading(false);
    }
  }, [canSwitchView]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  async function changeView(next: "admin" | "normal") {
    if (viewBusy || next === view) return;
    setViewBusy(true);
    setViewError("");
    try {
      await updateCatalogView(next);
      setView(next);
      router.refresh();
    } catch {
      setViewError("Zobrazení se nepodařilo změnit. Zkus to znovu.");
    } finally {
      setViewBusy(false);
    }
  }

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

  async function createQrInvitation(targetEmail: string, clearInput = false) {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    if (!normalizedEmail || inviteBusyEmail) return;

    setInviteBusyEmail(normalizedEmail);
    setInviteBusyKind("qr");
    setInviteMessage("");
    setInviteMessageError(false);
    setInviteLinkMessage("");
    setQrInvitation(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("admin-invitations", {
        body: { action: "qr", email: normalizedEmail },
      });

      if (error) throw error;

      if (!data?.ok || !data?.invitation?.url || !data?.invitation?.qrSvg) {
        setInviteMessageError(true);
        setInviteMessage(data?.message ?? "QR pozvánku se nepodařilo vytvořit.");
        return;
      }

      setQrInvitation(data.invitation as QrInvitation);
      setInviteMessage(data.message ?? "QR pozvánka je připravená.");
      if (clearInput) setInviteEmail("");
      await loadInvitations();
    } catch {
      setInviteMessageError(true);
      setInviteMessage("QR pozvánku se nepodařilo vytvořit. Zkus to znovu.");
    } finally {
      setInviteBusyEmail(null);
      setInviteBusyKind(null);
    }
  }

  async function createManualAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = manualEmail.trim().toLowerCase();

    setManualMessage("");
    setManualMessageError(false);
    setCredentialsMessage("");
    setCreatedCredentials(null);

    if (!normalizedEmail) return;
    if (manualPassword.length < 10) {
      setManualMessageError(true);
      setManualMessage("Dočasné heslo musí mít alespoň 10 znaků.");
      return;
    }
    if (manualPassword !== manualPasswordAgain) {
      setManualMessageError(true);
      setManualMessage("Zadaná dočasná hesla se neshodují.");
      return;
    }

    setManualBusy(true);
    setInviteBusyKind("account");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("admin-invitations", {
        body: {
          action: "create_account",
          email: normalizedEmail,
          password: manualPassword,
        },
      });

      if (error) throw error;
      if (!data?.ok) {
        setManualMessageError(true);
        setManualMessage(data?.message ?? "Účet se nepodařilo vytvořit.");
        return;
      }

      setCreatedCredentials({
        email: normalizedEmail,
        password: manualPassword,
      });
      setManualMessage(data.message ?? "Účet byl vytvořen.");
      setManualEmail("");
      setManualPassword("");
      setManualPasswordAgain("");
      await loadInvitations();
    } catch {
      setManualMessageError(true);
      setManualMessage("Účet se nepodařilo vytvořit. Zkus to znovu.");
    } finally {
      setManualBusy(false);
      setInviteBusyKind(null);
    }
  }

  async function copyCreatedCredentials() {
    if (!createdCredentials) return;
    const text = [
      "Pivník",
      "Přihlášení: " + window.location.origin + "/auth/login",
      "E-mail: " + createdCredentials.email,
      "Dočasné heslo: " + createdCredentials.password,
      "",
      "Po prvním přihlášení si aplikace vyžádá nastavení vlastního hesla.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCredentialsMessage("Přihlašovací údaje jsou zkopírované.");
    } catch {
      setCredentialsMessage("Údaje se nepodařilo zkopírovat.");
    }
  }

  async function cancelInvitation(invitation: InvitationRow) {
    if (inviteBusyEmail || manualBusy) return;

    const confirmed = window.confirm(
      "Opravdu zrušit pozvánku pro " + invitation.email + "? Starý QR kód i původní invite odkaz přestanou fungovat.",
    );
    if (!confirmed) return;

    setInviteBusyEmail(invitation.email.toLowerCase());
    setInviteBusyKind("cancel");
    setInviteMessage("");
    setInviteMessageError(false);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("admin-invitations", {
        body: { action: "cancel", userId: invitation.id },
      });

      if (error) throw error;
      if (!data?.ok) {
        setInviteMessageError(true);
        setInviteMessage(data?.message ?? "Pozvánku se nepodařilo zrušit.");
        return;
      }

      if (qrInvitation?.email.toLowerCase() === invitation.email.toLowerCase()) {
        setQrInvitation(null);
        setInviteLinkMessage("");
      }

      setInviteMessage(data.message ?? "Pozvánka byla zrušena.");
      await loadInvitations();
    } catch {
      setInviteMessageError(true);
      setInviteMessage("Pozvánku se nepodařilo zrušit. Zkus to znovu.");
    } finally {
      setInviteBusyEmail(null);
      setInviteBusyKind(null);
    }
  }

  async function submitInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createQrInvitation(inviteEmail, true);
  }

  async function copyInvitationLink() {
    if (!qrInvitation) return;
    try {
      await navigator.clipboard.writeText(qrInvitation.url);
      setInviteLinkMessage("Odkaz je zkopírovaný.");
    } catch {
      setInviteLinkMessage("Odkaz se nepodařilo zkopírovat.");
    }
  }

  async function shareInvitationLink() {
    if (!qrInvitation) return;

    if (typeof navigator.share !== "function") {
      await copyInvitationLink();
      return;
    }

    try {
      await navigator.share({
        title: "Pozvánka do Pivníku",
        text: "Tady je tvoje pozvánka do Pivníku.",
        url: qrInvitation.url,
      });
      setInviteLinkMessage("Pozvánka je připravená ke sdílení.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setInviteLinkMessage("Sdílení se nepodařilo. Můžeš použít kopírování odkazu.");
    }
  }
  return (
    <div className="taste-settings-grid">
      {canSwitchView && <section className="taste-settings-card taste-settings-view-card" aria-labelledby="settings-view-title">
        <h2 id="settings-view-title">Zobrazení katalogu</h2>
        <p>V běžném pohledu uvidíš hotové záznamy bez správcovských značek. Správcovský pohled označí ty, které ještě potřebují doplnit.</p>
        <div className="taste-settings-view-options" role="group" aria-label="Režim zobrazení">
          <button type="button" aria-pressed={view === "normal"} disabled={viewBusy} onClick={() => changeView("normal")}>Běžné zobrazení</button>
          <button type="button" aria-pressed={view === "admin"} disabled={viewBusy} onClick={() => changeView("admin")}>Admin zobrazení</button>
        </div>
        {viewError && <p className="taste-settings-feedback" role="alert" data-error="true">{viewError}</p>}
      </section>}

      {canSwitchView && <section className="taste-settings-card taste-settings-invite-card" aria-labelledby="settings-invite-title">
        <h2 id="settings-invite-title">Registrace nového štamgasta</h2>
        <p>Do Pivníku vedou jen dvě cesty: bezpečná QR pozvánka, nebo účet vytvořený správcem s dočasným heslem. Aktivní uživatelé se v seznamu čekajících registrací nezobrazují.</p>

        <div className="taste-settings-registration-paths">
          <div className="taste-settings-registration-path">
            <span className="taste-settings-registration-number">1</span>
            <div>
              <h3>QR pozvánka</h3>
              <p>Vytvoř jednorázový QR kód. Uživatel ho přijme a nastaví si vlastní heslo.</p>
            </div>

            <form className="taste-settings-invite-form" onSubmit={submitInvitation}>
              <div className="taste-settings-invite-field">
                <label htmlFor="invite-email">E-mail nového štamgasta</label>
                <input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="jmeno@example.cz"
                />
              </div>
              <button type="submit" disabled={inviteBusyEmail !== null || manualBusy || !inviteEmail.trim()}>
                {inviteBusyKind === "qr" && inviteBusyEmail === inviteEmail.trim().toLowerCase() ? "Vytvářím…" : "Vytvořit QR pozvánku"}
              </button>
            </form>

            {inviteMessage && <p className="taste-settings-feedback taste-settings-invite-feedback" role="status" data-error={inviteMessageError}>{inviteMessage}</p>}

            {qrInvitation && (
              <div className="taste-settings-qr-card">
                <div className="taste-settings-qr-image-wrap">
                  <img
                    className="taste-settings-qr-image"
                    src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(qrInvitation.qrSvg)}
                    alt={"QR pozvánka pro " + qrInvitation.email}
                    width={280}
                    height={280}
                  />
                </div>
                <div className="taste-settings-qr-copy">
                  <span className="taste-settings-qr-kicker">Připraveno pro</span>
                  <strong>{qrInvitation.email}</strong>
                  <p>QR platí do {formatInvitationDate(qrInvitation.expiresAt)}. Nový QR pro stejný e-mail předchozí automaticky zneplatní.</p>
                  <div className="taste-settings-qr-actions">
                    <button type="button" onClick={() => void copyInvitationLink()}>Kopírovat odkaz</button>
                    <button type="button" className="taste-settings-secondary-button" onClick={() => void shareInvitationLink()}>Sdílet</button>
                  </div>
                  {inviteLinkMessage && <span className="taste-settings-qr-message">{inviteLinkMessage}</span>}
                </div>
              </div>
            )}
          </div>

          <div className="taste-settings-registration-path">
            <span className="taste-settings-registration-number">2</span>
            <div>
              <h3>Účet s dočasným heslem</h3>
              <p>Zadej e-mail a dočasné heslo. Po prvním přihlášení si uživatel povinně vytvoří vlastní.</p>
            </div>

            <form className="taste-settings-manual-form" onSubmit={createManualAccount}>
              <label htmlFor="manual-email">E-mail uživatele</label>
              <input
                id="manual-email"
                type="email"
                autoComplete="off"
                required
                maxLength={254}
                value={manualEmail}
                onChange={(event) => setManualEmail(event.target.value)}
                placeholder="jmeno@example.cz"
              />
              <label htmlFor="manual-password">Dočasné heslo</label>
              <input
                id="manual-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
                value={manualPassword}
                onChange={(event) => setManualPassword(event.target.value)}
                placeholder="Alespoň 10 znaků"
              />
              <label htmlFor="manual-password-again">Dočasné heslo znovu</label>
              <input
                id="manual-password-again"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
                value={manualPasswordAgain}
                onChange={(event) => setManualPasswordAgain(event.target.value)}
              />
              <button type="submit" disabled={manualBusy || inviteBusyEmail !== null}>
                {manualBusy ? "Vytvářím účet…" : "Vytvořit účet"}
              </button>
            </form>

            {manualMessage && <p className="taste-settings-feedback taste-settings-invite-feedback" role="status" data-error={manualMessageError}>{manualMessage}</p>}

            {createdCredentials && (
              <div className="taste-settings-credentials">
                <span className="taste-settings-qr-kicker">Údaje k předání</span>
                <strong>{createdCredentials.email}</strong>
                <code>{createdCredentials.password}</code>
                <p>Heslo je viditelné jen tady v prohlížeči. Pivník ho v čitelné podobě neukládá.</p>
                <div className="taste-settings-qr-actions">
                  <button type="button" onClick={() => void copyCreatedCredentials()}>Kopírovat údaje</button>
                  <button type="button" className="taste-settings-secondary-button" onClick={() => setCreatedCredentials(null)}>Skrýt</button>
                </div>
                {credentialsMessage && <span className="taste-settings-qr-message">{credentialsMessage}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="taste-settings-invite-list" aria-live="polite">
          <div className="taste-settings-invite-list-heading">
            <h3>Čekající QR registrace</h3>
            <button
              type="button"
              className="taste-settings-secondary-button"
              onClick={() => void loadInvitations()}
              disabled={invitationsLoading || inviteBusyEmail !== null || manualBusy}
            >
              {invitationsLoading ? "Načítám…" : "Obnovit stav"}
            </button>
          </div>

          {invitationsError ? (
            <p className="taste-settings-feedback" role="alert" data-error="true">{invitationsError}</p>
          ) : invitationsLoading && invitations.length === 0 ? (
            <p className="taste-settings-invite-empty">Načítám čekající registrace…</p>
          ) : invitations.length === 0 ? (
            <p className="taste-settings-invite-empty">Žádná QR registrace teď nečeká na přijetí.</p>
          ) : (
            <div className="taste-settings-invite-rows">
              {invitations.map((invitation) => {
                const createdAt = invitation.confirmationSentAt ?? invitation.invitedAt;
                const busy = inviteBusyEmail === invitation.email.toLowerCase();
                return (
                  <div className="taste-settings-invite-row" key={invitation.id}>
                    <div className="taste-settings-invite-address">
                      <strong>{invitation.email}</strong>
                      <span>Vytvořeno {formatInvitationDate(createdAt)}</span>
                    </div>
                    <div className="taste-settings-invite-status-wrap">
                      <span className="taste-settings-invite-status" data-status="pending">Čeká na přijetí</span>
                    </div>
                    <div className="taste-settings-invite-actions">
                      <button
                        type="button"
                        className="taste-settings-secondary-button"
                        disabled={inviteBusyEmail !== null || manualBusy}
                        onClick={() => void createQrInvitation(invitation.email)}
                      >
                        {busy && inviteBusyKind === "qr" ? "Vytvářím…" : "Nový QR"}
                      </button>
                      <button
                        type="button"
                        className="taste-settings-danger-button"
                        disabled={inviteBusyEmail !== null || manualBusy}
                        onClick={() => void cancelInvitation(invitation)}
                      >
                        {busy && inviteBusyKind === "cancel" ? "Ruším…" : "Zrušit pozvánku"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>}

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
