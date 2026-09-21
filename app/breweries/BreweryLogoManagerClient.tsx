"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { BreweryLogoCandidate } from "./logo-actions";
import AdminBadge from "@/components/ui/AdminBadge";

type SaveLogoResult = {
  logoUrl: string;
  breweryName: string;
};

type BreweryLogoManagerClientProps = {
  breweryId: number;
  breweryName: string;
  website: string | null;
  initialLogoUrl: string | null;
  findCandidatesAction: (
    breweryId: number
  ) => Promise<BreweryLogoCandidate[]>;
  saveCandidateAction: (
    breweryId: number,
    candidateUrl: string
  ) => Promise<SaveLogoResult>;
  inspectManualUrlAction: (
    breweryId: number,
    inputUrl: string
  ) => Promise<BreweryLogoCandidate[]>;
  saveManualUrlAction: (
    breweryId: number,
    imageUrl: string
  ) => Promise<SaveLogoResult>;
  removeLogoAction: (
    breweryId: number
  ) => Promise<{ success: boolean }>;
};

export default function BreweryLogoManagerClient({
  breweryId,
  breweryName,
  website,
  initialLogoUrl,
  findCandidatesAction,
  saveCandidateAction,
  inspectManualUrlAction,
  saveManualUrlAction,
  removeLogoAction,
}: BreweryLogoManagerClientProps) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] =
    useState(initialLogoUrl);
  const [candidates, setCandidates] =
    useState<BreweryLogoCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] =
    useState(false);
  const [savingUrl, setSavingUrl] =
    useState<string | null>(null);
  const [manualUrl, setManualUrl] =
    useState("");
  const [manualPreviewError, setManualPreviewError] =
    useState(false);
  const [manualCandidates, setManualCandidates] =
    useState<BreweryLogoCandidate[]>([]);
  const [inspectingManualUrl, setInspectingManualUrl] =
    useState(false);
  const [removing, setRemoving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");

  async function handleFind() {
    setError("");
    setMessage("");

    if (!website?.trim()) {
      setCandidates([]);
      setError(
        "Pivovar zatím nemá uložený oficiální web. Doplň ho přes „Upravit pivovar“ a potom můžeme logo automaticky dohledat."
      );
      return;
    }

    setLoadingCandidates(true);

    try {
      const found =
        await findCandidatesAction(
          breweryId
        );
      setCandidates(found);
      setMessage(
        `Nalezeno kandidátů: ${found.length}. Vyber logo, které odpovídá pivovaru.`
      );
    } catch (caughtError) {
      setCandidates([]);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Logo se nepodařilo vyhledat."
      );
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function handleSave(
    candidateUrl: string
  ) {
    setSavingUrl(candidateUrl);
    setError("");
    setMessage("");

    try {
      const result =
        await saveCandidateAction(
          breweryId,
          candidateUrl
        );
      setLogoUrl(result.logoUrl);
      setCandidates([]);
      setMessage(
        `Logo pro ${result.breweryName} je uložené v TasteAppu.`
      );
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Logo se nepodařilo uložit."
      );
    } finally {
      setSavingUrl(null);
    }
  }

  async function handleInspectManualUrl() {
    const inputUrl = manualUrl.trim();

    setError("");
    setMessage("");
    setManualCandidates([]);

    if (!inputUrl) {
      setError("Vlož URL obrázku nebo stránky s logem.");
      return;
    }

    setInspectingManualUrl(true);

    try {
      const found =
        await inspectManualUrlAction(
          breweryId,
          inputUrl
        );
      setManualCandidates(found);
      setMessage(
        found.length === 1
          ? "Odkaz je v pořádku. Potvrď nalezené logo."
          : `Na odkazu jsem našel ${found.length} kandidátů. Vyber správné logo.`
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Odkaz se nepodařilo prověřit."
      );
    } finally {
      setInspectingManualUrl(false);
    }
  }

  async function handleSaveManualUrl() {
    const candidateUrl = manualUrl.trim();

    setError("");
    setMessage("");

    if (!candidateUrl) {
      setError("Vlož přímou URL obrázku s logem.");
      return;
    }

    setSavingUrl(candidateUrl);

    try {
      const result =
        await saveManualUrlAction(
          breweryId,
          candidateUrl
        );
      setLogoUrl(result.logoUrl);
      setManualUrl("");
      setManualPreviewError(false);
      setManualCandidates([]);
      setCandidates([]);
      setMessage(
        `Logo pro ${result.breweryName} je uložené v TasteAppu.`
      );
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Logo se nepodařilo uložit z vložené URL."
      );
    } finally {
      setSavingUrl(null);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    setError("");
    setMessage("");

    try {
      await removeLogoAction(
        breweryId
      );
      setLogoUrl(null);
      setCandidates([]);
      setMessage(
        "Logo bylo z pivovaru odebráno."
      );
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Logo se nepodařilo odebrat."
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "72px",
              height: "52px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              border:
                "1px solid var(--taste-border)",
              borderRadius: "10px",
              background:
                "rgba(255,255,255,.025)",
              overflow: "hidden",
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo ${breweryName}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  padding: "5px",
                }}
              />
            ) : (
              <span
                style={{
                  color:
                    "var(--taste-text-muted)",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                BEZ LOGA
              </span>
            )}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                marginBottom: "4px",
              }}
            >
              <div className="taste-label">
                Logo pivovaru
              </div>
              <AdminBadge />
            </div>
            <div
              style={{
                color:
                  "var(--taste-text-muted)",
                fontSize: "10px",
                lineHeight: 1.45,
              }}
            >
              {website
                ? "Kandidáty hledáme na uloženém oficiálním webu pivovaru."
                : "Nejdřív doplň web pivovaru, podle něj logo dohledáme."}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="taste-button-secondary"
            onClick={handleFind}
            disabled={
              loadingCandidates ||
              savingUrl !== null ||
              removing
            }
            style={{
              fontSize: "11px",
              cursor:
                loadingCandidates ||
                savingUrl !== null ||
                removing
                  ? "wait"
                  : "pointer",
              opacity:
                loadingCandidates ||
                savingUrl !== null ||
                removing
                  ? 0.65
                  : 1,
            }}
          >
            {loadingCandidates
              ? "Hledám…"
              : logoUrl
                ? "Najít jiné logo"
                : "Najít logo na webu"}
          </button>

          {logoUrl && (
            <button
              type="button"
              className="taste-button-secondary"
              onClick={handleRemove}
              disabled={
                removing ||
                loadingCandidates ||
                savingUrl !== null
              }
              style={{
                fontSize: "11px",
              }}
            >
              {removing
                ? "Odebírám…"
                : "Odebrat logo"}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "9px",
          padding: "12px",
          border: "1px solid var(--taste-border)",
          borderRadius: "10px",
          background: "rgba(255,255,255,.018)",
        }}
      >
        <div>
          <div
            className="taste-label"
            style={{ marginBottom: "4px" }}
          >
            Vložit logo z odkazu
          </div>
          <div
            style={{
              color: "var(--taste-text-muted)",
              fontSize: "10px",
              lineHeight: 1.45,
            }}
          >
            Vlož přímou URL obrázku nalezeného jinde. Po uložení se logo zkopíruje do TasteAppu, takže nezůstane závislé na cizím webu.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) auto",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <input
            type="url"
            inputMode="url"
            value={manualUrl}
            onChange={(event) => {
              setManualUrl(event.target.value);
              setManualPreviewError(false);
              setManualCandidates([]);
              setError("");
              setMessage("");
            }}
            placeholder="https://example.cz/logo.png"
            aria-label="Přímá URL loga pivovaru"
            style={{
              width: "100%",
              minWidth: 0,
              padding: "9px 10px",
              border: "1px solid var(--taste-border)",
              borderRadius: "9px",
              background: "rgba(0,0,0,.14)",
              color: "var(--taste-text)",
              fontSize: "11px",
              outline: "none",
            }}
          />
          <button
            type="button"
            className="taste-button-primary"
            onClick={handleInspectManualUrl}
            disabled={
              !manualUrl.trim() ||
              inspectingManualUrl ||
              savingUrl !== null ||
              loadingCandidates ||
              removing
            }
            style={{
              fontSize: "10px",
              whiteSpace: "nowrap",
            }}
          >
            {inspectingManualUrl
              ? "Prověřuji…"
              : "Prověřit odkaz"}
          </button>
        </div>

        {manualUrl.trim() && (
          <div
            style={{
              minHeight: "92px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--taste-border)",
              borderRadius: "9px",
              background: "rgba(255,255,255,.025)",
              overflow: "hidden",
            }}
          >
            {manualPreviewError ? (
              <div
                style={{
                  padding: "12px",
                  color: "var(--taste-text-muted)",
                  fontSize: "10px",
                  textAlign: "center",
                  lineHeight: 1.45,
                }}
              >
                Přímý náhled se nepodařilo načíst. Pokud jde o běžnou webovou stránku, použij „Prověřit odkaz“ a BeerApp z ní zkusí logo najít.
              </div>
            ) : (
              <img
                src={manualUrl.trim()}
                alt="Náhled ručně vloženého loga"
                referrerPolicy="no-referrer"
                onError={() => setManualPreviewError(true)}
                style={{
                  maxWidth: "100%",
                  maxHeight: "120px",
                  objectFit: "contain",
                  padding: "7px",
                }}
              />
            )}
          </div>
        )}

        {manualCandidates.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "9px",
            }}
          >
            {manualCandidates.map((candidate) => (
              <div
                key={candidate.url}
                style={{
                  display: "grid",
                  gap: "8px",
                  padding: "9px",
                  border: "1px solid var(--taste-border)",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,.018)",
                }}
              >
                <div
                  style={{
                    height: "86px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,.035)",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={candidate.url}
                    alt={candidate.label}
                    referrerPolicy="no-referrer"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      padding: "5px",
                    }}
                  />
                </div>

                <div
                  style={{
                    color: "var(--taste-text)",
                    fontSize: "10px",
                    fontWeight: 750,
                  }}
                >
                  {candidate.label}
                </div>

                <button
                  type="button"
                  className="taste-button-primary"
                  disabled={
                    savingUrl !== null ||
                    removing
                  }
                  onClick={() => {
                    setManualUrl(candidate.url);
                    void handleSaveManualUrl();
                  }}
                  style={{
                    width: "100%",
                    fontSize: "10px",
                  }}
                >
                  {savingUrl === candidate.url
                    ? "Ukládám…"
                    : "Použít"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "9px 11px",
            border:
              "1px solid rgba(220,100,75,0.35)",
            borderRadius: "9px",
            background:
              "rgba(220,100,75,0.08)",
            color:
              "var(--taste-text)",
            fontSize: "11px",
            lineHeight: 1.45,
          }}
        >
          {error}
        </div>
      )}

      {message && !error && (
        <div
          style={{
            color:
              "var(--taste-text-muted)",
            fontSize: "10px",
          }}
        >
          {message}
        </div>
      )}

      {candidates.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "9px",
          }}
        >
          {candidates.map(
            (candidate) => {
              let hostname =
                candidate.url;
              try {
                hostname =
                  new URL(
                    candidate.url
                  ).hostname;
              } catch {
                // Keep URL as fallback.
              }

              return (
                <div
                  key={candidate.url}
                  style={{
                    display: "grid",
                    gap: "8px",
                    padding: "9px",
                    border:
                      "1px solid var(--taste-border)",
                    borderRadius:
                      "10px",
                    background:
                      "rgba(255,255,255,.018)",
                  }}
                >
                  <div
                    style={{
                      height: "86px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      borderRadius:
                        "8px",
                      background:
                        "rgba(255,255,255,.035)",
                      overflow:
                        "hidden",
                    }}
                  >
                    <img
                      src={candidate.url}
                      alt={
                        candidate.label
                      }
                      referrerPolicy="no-referrer"
                      style={{
                        maxWidth:
                          "100%",
                        maxHeight:
                          "100%",
                        objectFit:
                          "contain",
                        padding: "5px",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        color:
                          "var(--taste-text)",
                        fontSize:
                          "10px",
                        fontWeight:
                          750,
                      }}
                    >
                      {
                        candidate.label
                      }
                    </div>
                    <div
                      title={
                        candidate.url
                      }
                      style={{
                        marginTop:
                          "2px",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                        color:
                          "var(--taste-text-muted)",
                        fontSize:
                          "9px",
                      }}
                    >
                      {hostname}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="taste-button-primary"
                    disabled={
                      savingUrl !==
                        null ||
                      removing
                    }
                    onClick={() =>
                      handleSave(
                        candidate.url
                      )
                    }
                    style={{
                      width: "100%",
                      fontSize:
                        "10px",
                    }}
                  >
                    {savingUrl ===
                    candidate.url
                      ? "Ukládám…"
                      : "Použít"}
                  </button>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
