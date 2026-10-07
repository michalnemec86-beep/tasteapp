"use client";

import Link from "next/link";
import {
  useState,
  type FormEvent,
} from "react";
import {
  useRouter,
} from "next/navigation";

type Props = {
  name: string;
  href: string;
  focused?: boolean;
  adminView: boolean;
  updateAction: (
    formData: FormData
  ) => Promise<void>;
  deleteAction: () => Promise<void>;
};

export default function BreweryBrandItemClient({
  name,
  href,
  focused = false,
  adminView,
  updateAction,
  deleteAction,
}: Props) {
  const router =
    useRouter();
  const [editing, setEditing] =
    useState(false);
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");

  async function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await updateAction(
        new FormData(
          event.currentTarget
        )
      );
      setEditing(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Značku se nepodařilo upravit."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const confirmed =
      window.confirm(
        `Opravdu smazat značku „${name}“? Smazání proběhne jen tehdy, pokud ji nepoužívá žádné pivo ani jiný pivovar.`
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await deleteAction();
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Značku se nepodařilo smazat."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!adminView) {
    return (
      <Link
        prefetch={false}
        href={href}
        data-focused={
          focused
            ? "true"
            : undefined
        }
        className="taste-button-secondary"
        style={{
          padding:
            "6px 9px",
          fontSize:
            "10px",
        }}
      >
        {name}
      </Link>
    );
  }

  if (editing) {
    return (
      <div
        style={{
          minWidth:
            "220px",
        }}
      >
        <form
          onSubmit={submit}
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "6px",
          }}
        >
          <input
            name="brandName"
            required
            maxLength={120}
            defaultValue={name}
            autoFocus
            aria-label="Název značky"
            style={{
              minWidth:
                "140px",
              height:
                "32px",
              boxSizing:
                "border-box",
              padding:
                "0 9px",
              border:
                "1px solid rgba(232,136,53,.48)",
              borderRadius:
                "8px",
              background:
                "var(--taste-surface)",
              color:
                "var(--taste-text)",
              fontSize:
                "10px",
              outline:
                "none",
            }}
          />

          <button
            type="submit"
            disabled={busy}
            className="taste-button-primary"
            style={{
              padding:
                "6px 8px",
              fontSize:
                "9px",
            }}
          >
            {busy
              ? "…"
              : "Uložit"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setEditing(
                false
              );
              setError("");
            }}
            className="taste-button-secondary"
            style={{
              padding:
                "6px 8px",
              fontSize:
                "9px",
            }}
          >
            Zrušit
          </button>
        </form>

        {error && (
          <div
            role="alert"
            style={{
              maxWidth:
                "360px",
              marginTop:
                "5px",
              color:
                "var(--taste-amber-bright)",
              fontSize:
                "9px",
              lineHeight:
                1.4,
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display:
          "inline-flex",
        flexDirection:
          "column",
        gap:
          "4px",
      }}
    >
      <div
        style={{
          display:
            "inline-flex",
          alignItems:
            "center",
          gap:
            "4px",
        }}
      >
        <Link
          prefetch={false}
          href={href}
          data-focused={
            focused
              ? "true"
              : undefined
          }
          className="taste-button-secondary"
          style={{
            padding:
              "6px 9px",
            fontSize:
              "10px",
          }}
        >
          {name}
        </Link>

        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setError("");
          }}
          disabled={busy}
          title="Upravit značku v celé aplikaci"
          style={actionStyle}
        >
          Upravit
        </button>

        <button
          type="button"
          onClick={remove}
          disabled={busy}
          title="Smazat nepoužívanou značku"
          style={{
            ...actionStyle,
            color:
              "rgba(225,90,61,0.9)",
          }}
        >
          Smazat
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            maxWidth:
              "360px",
            color:
              "var(--taste-amber-bright)",
            fontSize:
              "9px",
            lineHeight:
              1.4,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

const actionStyle = {
  padding:
    "3px 4px",
  border: 0,
  background:
    "transparent",
  color:
    "var(--taste-text-muted)",
  fontSize:
    "8px",
  fontWeight:
    750,
  cursor:
    "pointer",
  whiteSpace:
    "nowrap",
} as const;
