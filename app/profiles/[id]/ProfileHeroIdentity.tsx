import Link from "next/link";

type ProfileHeroIdentityProps = {
  displayName: string;
  avatarUrl:
    | string
    | null;
  profileId: string;
  isMe: boolean;
};

export default function ProfileHeroIdentity({
  displayName,
  avatarUrl,
  profileId,
  isMe,
}: ProfileHeroIdentityProps) {
  const initial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "•";

  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gap: "10px",
      }}
    >
      <div
        style={{
          padding: "13px",
          border:
            "1px solid rgba(241,179,63,0.28)",
          borderRadius: "15px",
          background: `
            linear-gradient(
              145deg,
              rgba(242,182,63,0.13),
              rgba(196,85,58,0.05)
            ),
            rgba(15,10,7,0.70)
          `,
          backdropFilter:
            "blur(8px)",
          boxShadow: `
            0 10px 30px rgba(0,0,0,0.22),
            inset 0 1px 0 rgba(255,235,195,0.045)
          `,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "11px",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              flexShrink: 0,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              border:
                "1px solid rgba(242,182,63,0.48)",
              borderRadius: "50%",
              background:
                avatarUrl
                  ? `url(${JSON.stringify(
                      avatarUrl
                    )}) center / cover no-repeat`
                  : `
                    radial-gradient(
                      circle at 35% 25%,
                      rgba(242,182,63,0.30),
                      transparent 55%
                    ),
                    linear-gradient(
                      145deg,
                      #713b1d,
                      #27150c
                    )
                  `,
              color: "#f2b63f",
              fontSize: "21px",
              lineHeight: 1,
              fontWeight: 900,
              boxShadow:
                "0 0 22px rgba(242,182,63,0.14)",
            }}
          >
            {!avatarUrl &&
              initial}
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                color:
                  "#f2b63f",
                fontSize: "8px",
                fontWeight: 900,
                letterSpacing:
                  "0.09em",
                textTransform:
                  "uppercase",
              }}
            >
              {isMe
                ? "Můj profil"
                : "Pivní cestovatel"}
            </div>

            <div
              style={{
                marginTop: "3px",
                overflow:
                  "hidden",
                color:
                  "var(--taste-text)",
                fontSize: "16px",
                lineHeight: 1.1,
                fontWeight: 900,
                letterSpacing:
                  "-0.025em",
                textOverflow:
                  "ellipsis",
                whiteSpace:
                  "nowrap",
              }}
            >
              {displayName}
            </div>

            <div
              style={{
                marginTop: "5px",
                color:
                  "var(--taste-text-muted)",
                fontSize: "9px",
                lineHeight: 1.35,
              }}
            >
              Osobní pivní stopa
              v TasteAppu
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "7px",
        }}
      >
        <Link
          href={`/stats?user=${profileId}`}
          className="taste-button-primary"
          style={{
            fontSize: "11px",
            textAlign: "center",
          }}
        >
          Statistiky profilu
        </Link>

        <Link
          href="/profiles"
          className="taste-button-secondary"
          style={{
            fontSize: "10px",
            textAlign: "center",
            color: "var(--taste-text)",
            border:
              "1px solid rgba(242,182,63,0.28)",
            background:
              "rgba(43,27,16,0.94)",
            boxShadow:
              "inset 0 1px 0 rgba(255,235,195,0.035)",
          }}
        >
          ← Všichni uživatelé
        </Link>
      </div>
    </div>
  );
}
