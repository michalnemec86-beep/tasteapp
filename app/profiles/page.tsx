import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .order("display_name");

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px",
      }}
    >
      <h1>👥 Uživatelé TasteAppu</h1>

      <p style={{ marginBottom: "30px" }}>
        Vyber uživatele a zobraz jeho pivní profil.
      </p>

      <div
        style={{
          display: "grid",
          gap: "16px",
        }}
      >
        {profiles?.map((profile) => {
          const isMe = profile.id === user.id;

          return (
            <Link
              key={profile.id}
              href={`/profiles/${profile.id}`}
              style={{
                display: "block",
                padding: "20px",
                border: "1px solid #aaa",
                borderRadius: "12px",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    border: "1px solid #aaa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  {profile.display_name
                    ?.charAt(0)
                    .toUpperCase() || "?"}
                </div>

                <div>
                  <strong
                    style={{
                      fontSize: "20px",
                    }}
                  >
                    {profile.display_name}
                  </strong>

                  {isMe && (
                    <div
                      style={{
                        fontSize: "13px",
                        opacity: 0.7,
                      }}
                    >
                      Tvůj profil
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}