"use client";

import {
  useState,
} from "react";
import { useRouter } from "next/navigation";

type BreweryNameHistoryItemClientProps = {
  previousName: string;
  fromYear: number | null;
  changedYear: number | null;
  updateAction: (
    formData: FormData
  ) => Promise<void>;
  deleteAction: () => Promise<void>;
};

export default function BreweryNameHistoryItemClient({
  previousName,
  fromYear,
  changedYear,
  updateAction,
  deleteAction,
}: BreweryNameHistoryItemClientProps) {
  const [editing, setEditing] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const router = useRouter();

  async function handleUpdate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      await updateAction(
        new FormData(event.currentTarget)
      );
      setEditing(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Historii se nepodařilo upravit."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Opravdu smazat historický název „${previousName}“?`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteAction();
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Historii se nepodařilo smazat."
      );
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={handleUpdate}
        style={{
          padding: "10px",
          border:
            "1px solid var(--taste-border)",
          borderRadius: "9px",
          background:
            "rgba(255,255,255,0.018)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(180px,1fr) 110px 110px",
            gap: "8px",
          }}
        >
          <input
            name="previousName"
            required
            defaultValue={previousName}
            style={inputStyle}
          />

          <input
            name="fromYear"
            type="number"
            min="1000"
            max="2100"
            inputMode="numeric"
            defaultValue={fromYear ?? ""}
            placeholder="Od"
            style={inputStyle}
          />

          <input
            name="changedYear"
            type="number"
            min="1000"
            max="2100"
            inputMode="numeric"
            defaultValue={changedYear ?? ""}
            placeholder="Do"
            style={inputStyle}
          />
        </div>

        {error && (
          <div
            style={{
              marginTop: "8px",
              color: "var(--taste-text)",
              fontSize: "10px",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "7px",
            marginTop: "8px",
          }}
        >
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setEditing(false);
              setError("");
            }}
            className="taste-button-secondary"
            style={{
              fontSize: "10px",
            }}
          >
            Zrušit
          </button>

          <button
            type="submit"
            disabled={saving}
            className="taste-button-primary"
            style={{
              fontSize: "10px",
            }}
          >
            {saving
              ? "Ukládám…"
              : "Uložit"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "92px minmax(0, 1fr) auto",
          alignItems: "baseline",
          gap: "10px",
          color:
            "var(--taste-text-soft)",
          fontSize: "13px",
          lineHeight: 1.6,
        }}
      >
        <span
          style={{
            color:
              "var(--taste-text-muted)",
            fontVariantNumeric:
              "tabular-nums",
          }}
        >
          {fromYear ?? "?"}–
          {changedYear ?? "?"}
        </span>

        <span>
          {previousName}
        </span>

        <span
          style={{
            display: "inline-flex",
            gap: "7px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setError("");
            }}
            disabled={saving}
            style={actionStyle}
          >
            Upravit
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            style={actionStyle}
          >
            Smazat
          </button>
        </span>
      </div>

      {error && (
        <div
          style={{
            marginTop: "5px",
            color: "var(--taste-text)",
            fontSize: "10px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  height: "36px",
  boxSizing: "border-box",
  padding: "0 10px",
  border:
    "1px solid var(--taste-border)",
  borderRadius: "8px",
  background:
    "var(--taste-surface)",
  color: "var(--taste-text)",
  fontSize: "11px",
  outline: "none",
} as const;

const actionStyle = {
  padding: 0,
  border: 0,
  background: "transparent",
  color:
    "var(--taste-text-muted)",
  fontSize: "9px",
  fontWeight: 650,
  cursor: "pointer",
  whiteSpace: "nowrap",
} as const;
