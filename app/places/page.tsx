import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { isCatalogAdminUser } from "@/lib/adminView";
import { createPlace, updatePlace } from "./actions";

export const metadata: Metadata = { title: "Místa" };

function categoryLabel(category: string) {
  return category === "pub" ? "Hospoda" : category === "festival" ? "Festival" : "Nezařazeno";
}

export default async function PlacesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [catalogResult, history] = await Promise.all([
    supabase.from("places").select("id, name, city, country, category, approved")
      .order("name", { ascending: true }),
    fetchAllRows((from, to) => supabase.from("tastings")
      .select("place_id, place, place_category").range(from, to), 500),
  ]);
  if (catalogResult.error) throw new Error(catalogResult.error.message);

  const counts = new Map<number, number>();
  const legacy = new Map<string, { name: string; count: number }>();
  for (const tasting of history) {
    if (tasting.place_id != null) {
      counts.set(tasting.place_id, (counts.get(tasting.place_id) ?? 0) + 1);
    } else if (tasting.place?.trim() && tasting.place_category !== "home" &&
               tasting.place.trim().toLocaleLowerCase("cs") !== "doma") {
      const name = tasting.place.trim();
      const key = name.toLocaleLowerCase("cs");
      const found = legacy.get(key);
      if (found) found.count++;
      else legacy.set(key, { name, count: 1 });
    }
  }

  const places = (catalogResult.data ?? []).sort((a,b) =>
    (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name, "cs"));
  const oldPlaces = [...legacy.values()].sort((a,b) => b.count - a.count || a.name.localeCompare(b.name,"cs"));
  const admin = isCatalogAdminUser(user.id);

  return (
    <main className="taste-stats-concept" style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 16px 80px" }}>
      <header style={{ marginBottom: 25 }}>
        <div className="taste-label">Kam chodíme na pivo</div>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "8px 0" }}>Místa</h1>
        <p style={{ color: "var(--taste-text-muted)", fontSize: 13 }}>
          Hospody a festivaly zaznamenané při ochutnávkách. Domácí ochutnávky jsou soukromé
          a veřejná adresa se k nim nikdy nevytváří.
        </p>
      </header>

      {admin && (
        <details className="taste-form-optional" style={{ marginBottom: 20 }}>
          <summary>Přidat místo do katalogu</summary>
          <form action={createPlace} className="taste-form-optional-body"
            style={{ display: "grid", gap: 9, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <input name="name" aria-label="Název" placeholder="Jméno místa" required minLength={2} maxLength={160} className="taste-place-input" />
            <input name="city" aria-label="Město" placeholder="Město" maxLength={120} className="taste-place-input" />
            <input name="country" aria-label="Stát" placeholder="Stát" maxLength={120} className="taste-place-input" />
            <select name="category" className="taste-place-input" aria-label="Kategorie">
              <option value="pub">Hospoda</option>
              <option value="festival">Festival</option>
            </select>
            <button type="submit" className="taste-place-choice taste-place-choice-active">Přidat</button>
          </form>
        </details>
      )}

      <section>
        <h2 style={{ fontSize: 19, marginBottom: 12 }}>Společný katalog ({places.length})</h2>
        <div style={{ overflowX: "auto", border: "1px solid var(--taste-border)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 580 }}>
            <thead><tr style={{ textAlign: "left", borderBottom: "1px solid var(--taste-border)" }}>
              {["Jméno", "Město", "Stát", "Kategorie", "Ochutnávky", ...(admin ? ["Správa"] : [])].map(h =>
                <th key={h} scope="col" style={{ padding: "12px 10px" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {places.map(place => (
                <tr key={place.id} style={{ borderBottom: "1px solid var(--taste-border)" }}>
                  <td style={{ padding: "12px 10px", fontWeight: 650 }}>
                    {place.name}
                    {!place.approved && <small style={{ color: "var(--taste-text-muted)", display: "block" }}>Čeká na ověření</small>}
                  </td>
                  <td style={{ padding: "12px 10px" }}>{place.city || "–"}</td>
                  <td style={{ padding: "12px 10px" }}>{place.country || "–"}</td>
                  <td style={{ padding: "12px 10px" }}>{categoryLabel(place.category)}</td>
                  <td style={{ padding: "12px 10px", fontWeight: 700 }}>{counts.get(place.id) ?? 0}</td>
                  {admin && <td style={{ padding: "8px 10px" }}>
                    <details>
                      <summary style={{ cursor: "pointer" }}>Upravit</summary>
                      <form action={updatePlace} style={{ display: "grid", gap: 5, minWidth: 210, paddingTop: 8 }}>
                        <input type="hidden" name="placeId" value={place.id} />
                        <input className="taste-place-input" name="name" aria-label="Název" defaultValue={place.name} required minLength={2} maxLength={160}/>
                        <input className="taste-place-input" name="city" aria-label="Město" defaultValue={place.city} maxLength={120}/>
                        <input className="taste-place-input" name="country" aria-label="Stát" defaultValue={place.country} maxLength={120}/>
                        <select className="taste-place-input" name="category" aria-label="Kategorie" defaultValue={place.category}>
                          <option value="pub">Hospoda</option><option value="festival">Festival</option>
                        </select>
                        <label style={{ fontSize: 12 }}><input type="checkbox" name="approved" defaultChecked={place.approved} /> Ověřené</label>
                        <button type="submit" className="taste-place-choice taste-place-choice-active">Uložit</button>
                      </form>
                    </details>
                  </td>}
                </tr>
              ))}
              {places.length === 0 && <tr><td colSpan={admin ? 6 : 5} style={{ padding: 20, color: "var(--taste-text-muted)" }}>
                Zatím žádné katalogové místo. Přidá se první konkrétní hospodou či festivalem při nové ochutnávce.
              </td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Historická místa bez ověřené vazby ({oldPlaces.length})</h2>
        <p style={{ color: "var(--taste-text-muted)", fontSize: 12, lineHeight: 1.6 }}>
          Původní názvy se zobrazují odděleně, bez automatického přiřazení města či kategorie.
          Počty odpovídají původním záznamům. Připojení ke společnému katalogu vyžaduje ruční ověření.
        </p>
        <div style={{ overflowX: "auto", border: "1px solid var(--taste-border)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ textAlign: "left" }}>
              <th scope="col" style={{ padding: 10 }}>Původní název</th>
              <th scope="col" style={{ padding: 10, textAlign: "right" }}>Ochutnávky</th>
            </tr></thead>
            <tbody>{oldPlaces.map(place => (
              <tr key={place.name} style={{ borderTop: "1px solid var(--taste-border)" }}>
                <td style={{ padding: "9px 10px" }}>{place.name}</td>
                <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700 }}>{place.count}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
