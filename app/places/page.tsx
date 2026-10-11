import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { isCatalogAdminUser } from "@/lib/adminView";
import "./places-concept.css";
import { createPlace, updatePlace } from "./actions";

export const metadata: Metadata = { title: "Místa" };

function categoryLabel(category: string) {
  return category === "pub" ? "Hospoda" : category === "festival" ? "Festival" : "Nezařazeno";
}

export default async function PlacesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = isCatalogAdminUser(user.id);
  const [catalogResult, linkedTastings, legacyTastings] = await Promise.all([
    supabase.from("places").select("id, name, city, country, category, approved")
      .order("name", { ascending: true }),
    fetchAllRows((from, to) => supabase.from("tastings")
      .select("place_id").not("place_id", "is", null).range(from, to), 500),
    admin
      ? fetchAllRows((from, to) => supabase.from("tastings")
          .select("place, place_category").is("place_id", null)
          .not("place", "is", null).range(from, to), 500)
      : Promise.resolve([] as { place: string | null; place_category: string | null }[]),
  ]);
  if (catalogResult.error) throw new Error(catalogResult.error.message);

  const counts = new Map<number, number>();
  for (const tasting of linkedTastings) {
    if (tasting.place_id != null) {
      counts.set(tasting.place_id, (counts.get(tasting.place_id) ?? 0) + 1);
    }
  }
  const legacy = new Map<string, { name: string; count: number }>();
  for (const tasting of legacyTastings) {
    if (tasting.place?.trim() && tasting.place_category !== "home" &&
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

  return (
    <main className="taste-places-concept">
      <header className="taste-places-intro">
        <div className="taste-label">Kam chodíme na pivo</div>
        <h1>Místa</h1>
        <p>
          Hospody a festivaly zaznamenané při ochutnávkách. Domácí ochutnávky jsou soukromé
          a veřejná adresa se k nim nikdy nevytváří.
        </p>
      </header>

      {admin && (
        <details className="taste-places-add taste-places-card">
          <summary>Přidat místo do katalogu</summary>
          <form action={createPlace} className="taste-places-optional-body"
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

      <section className="taste-places-catalog taste-places-card">
        <h2>Společný katalog ({places.length})</h2>
        <div className="taste-places-table-scroll">
          <table className="taste-places-table">
            <thead><tr>
              {["Jméno", "Město", "Stát", "Kategorie", "Ochutnávky", ...(admin ? ["Správa"] : [])].map(h =>
                <th key={h} scope="col">{h}</th>)}
            </tr></thead>
            <tbody>
              {places.map(place => (
                <tr key={place.id}>
                  <td>
                    {place.name}
                    {!place.approved && <small style={{ color: "var(--taste-text-muted)", display: "block" }}>Čeká na ověření</small>}
                  </td>
                  <td>{place.city || "–"}</td>
                  <td>{place.country || "–"}</td>
                  <td>{categoryLabel(place.category)}</td>
                  <td className="taste-places-count">{counts.get(place.id) ?? 0}</td>
                  {admin && <td>
                    <details className="taste-places-row-editor">
                      <summary>Upravit</summary>
                      <form action={updatePlace} className="taste-places-edit-form">
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
              {places.length === 0 && <tr><td colSpan={admin ? 6 : 5} className="taste-places-table-empty">
                Zatím žádné katalogové místo. Přidá se první konkrétní hospodou či festivalem při nové ochutnávce.
              </td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {admin && <section className="taste-places-history-section">
        <details className="taste-places-history taste-places-card">
          <summary>Historická místa bez ověřené vazby ({oldPlaces.length})</summary>
          <div className="taste-places-optional-body">
            <p className="taste-places-help">
              Původní názvy se zobrazují odděleně, bez automatického přiřazení města či kategorie.
              Počty odpovídají původním záznamům. Připojení ke společnému katalogu vyžaduje ruční ověření.
            </p>
            <div className="taste-places-table-scroll">
              <table className="taste-places-table">
                <thead><tr>
                  <th scope="col">Původní název</th>
                  <th scope="col" style={{ textAlign: "right" }}>Ochutnávky</th>
                </tr></thead>
                <tbody>{oldPlaces.map(place => (
                  <tr key={place.name}>
                    <td>{place.name}</td>
                    <td className="taste-places-count" style={{ textAlign: "right" }}>{place.count}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </details>
      </section>}
    </main>
  );
}
