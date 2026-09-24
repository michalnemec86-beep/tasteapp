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

  async function sendInvitation(targetEmail: string, clearInput = false) {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    if (!normalizedEmail || inviteBusyEmail) return;

    setInviteBusyEmail(normalizedEmail);
    setInviteMessage("");
    setInviteMessageError(false);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("admin-invitations", {
        body: { action: "invite", email: normalizedEmail },
      });

      if (error) throw error;

      if (!data?.ok) {
        setInviteMessageError(true);
        setInviteMessage(data?.message ?? "Pozvánku se nepodařilo odeslat.");
        return;
      }

      setInviteMessage(data.message ?? "Pozvánka byla odeslána.");
      if (clearInput) setInviteEmail("");
      await loadInvitations();
    } catch {
      setInviteMessageError(true);
      setInviteMessage("Pozvánku se nepodařilo odeslat. Zkus to znovu.");
    } finally {
      setInviteBusyEmail(null);
    }
  }

  async function submitInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendInvitation(inviteEmail, true);
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
        <h2 id="settings-invite-title">Správa pozvánek</h2>
        <p>Pozvánky se odesílají přes zabezpečenou serverovou funkci. Aktivní účet se znovu nepozve a žádný existující účet se při opakovaném odeslání nemaže.</p>

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
          <button type="submit" disabled={inviteBusyEmail !== null || !inviteEmail.trim()}>
            {inviteBusyEmail === inviteEmail.trim().toLowerCase() ? "Odesílám…" : "Odeslat pozvánku"}
          </button>
        </form>

        {inviteMessage && <p className="taste-settings-feedback taste-settings-invite-feedback" role="status" data-error={inviteMessageError}>{inviteMessage}</p>}

        <div className="taste-settings-invite-list" aria-live="polite">
          <div className="taste-settings-invite-list-heading">
            <h3>Odeslané pozvánky</h3>
            <button
              type="button"
              className="taste-settings-secondary-button"
              onClick={() => void loadInvitations()}
              disabled={invitationsLoading || inviteBusyEmail !== null}
            >
              {invitationsLoading ? "Načítám…" : "Obnovit stav"}
            </button>
          </div>

          {invitationsError ? (
            <p className="taste-settings-feedback" role="alert" data-error="true">{invitationsError}</p>
          ) : invitationsLoading && invitations.length === 0 ? (
            <p className="taste-settings-invite-empty">Načítám pozvánky…</p>
          ) : invitations.length === 0 ? (
            <p className="taste-settings-invite-empty">Zatím tu nejsou žádné odeslané pozvánky.</p>
          ) : (
            <div className="taste-settings-invite-rows">
              {invitations.map((invitation) => {
                const accepted = Boolean(invitation.confirmedAt);
                const sentAt = invitation.confirmationSentAt ?? invitation.invitedAt;
                return (
                  <div className="taste-settings-invite-row" key={invitation.id}>
                    <div className="taste-settings-invite-address">
                      <strong>{invitation.email}</strong>
                      <span>Odesláno {formatInvitationDate(sentAt)}</span>
                    </div>
                    <div className="taste-settings-invite-status-wrap">
                      <span className="taste-settings-invite-status" data-status={accepted ? "accepted" : "pending"}>
                        {accepted ? "Přijata" : "Čeká na přijetí"}
                      </span>
                      {accepted && invitation.confirmedAt && (
                        <span className="taste-settings-invite-confirmed">Potvrzeno {formatInvitationDate(invitation.confirmedAt)}</span>
                      )}
                    </div>
                    {!accepted && (
                      <button
                        type="button"
                        className="taste-settings-secondary-button"
                        disabled={inviteBusyEmail !== null}
                        onClick={() => void sendInvitation(invitation.email)}
                      >
                        {inviteBusyEmail === invitation.email.toLowerCase() ? "Odesílám…" : "Odeslat znovu"}
                      </button>
                    )}
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
