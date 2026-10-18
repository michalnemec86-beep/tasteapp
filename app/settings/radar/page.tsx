import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound, redirect } from "next/navigation";
import { isAdminView, isCatalogAdminUser } from "@/lib/adminView";
import { createClient } from "@/lib/supabase/server";
import { reviewRadarCandidate, scanRadar } from "./actions";

export const metadata: Metadata = { title: "Radar | Administrace" };
export const dynamic = "force-dynamic";

const date = (value: string | null) => value
  ? new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Prague" }).format(new Date(value))
  : "Dosud neověřeno";

type Brewery = { brewery_id: number; priority: string };
type Source = { id: number; brewery_id: number; url: string; extraction_mode: string; last_checked_at: string | null; last_error: string | null; next_check_at: string };
type Candidate = { id: number; brewery_id: number; name: string; source_url: string; status: string; matched_beer_id: number | null; first_seen_at: string; admin_note: string | null };
type Run = { id: number; trigger_kind: string; started_at: string; result: string; sources_checked: number; sources_failed: number; candidates_created: number };

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ scan?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth/login");
  if (!isCatalogAdminUser(user.id) || !(await isAdminView(user.id))) notFound();

  const [breweriesResult, sourcesResult, candidatesResult, runsResult, countResult] = await Promise.all([
    db.from("radar_breweries").select("brewery_id,priority").order("priority").order("brewery_id"),
    db.from("radar_sources").select("id,brewery_id,url,extraction_mode,last_checked_at,last_error,next_check_at").order("id").limit(100),
    db.from("radar_candidates").select("id,brewery_id,name,source_url,status,matched_beer_id,first_seen_at,admin_note").order("first_seen_at",{ascending:false}).limit(100),
    db.from("radar_runs").select("id,trigger_kind,started_at,result,sources_checked,sources_failed,candidates_created").order("id",{ascending:false}).limit(10),
    db.from("radar_candidates").select("id",{count:"exact",head:true}).in("status",["new","possible_match"]),
  ]);
  if ([breweriesResult, sourcesResult, candidatesResult, runsResult, countResult].some(r=>r.error)) {
    return <main className="taste-settings-page"><h1>Radar</h1><p>Pracovní data se nepodařilo načíst. Zkontroluj oprávnění a zkus stránku obnovit.</p></main>;
  }
  const breweries = (breweriesResult.data ?? []) as Brewery[];
  const sources = (sourcesResult.data ?? []) as Source[];
  const candidates = (candidatesResult.data ?? []) as Candidate[];
  const runs = (runsResult.data ?? []) as Run[];
  const { data: canonical } = await db.from("breweries").select("id,name").in("id",breweries.map(x=>x.brewery_id));
  const labels = new Map((canonical ?? []).map(b=>[b.id,b.name] as const));
  const pending = candidates.filter(c=>c.status==="new"||c.status==="possible_match");
  const matchedBeerIds = [...new Set(pending.map(c=>c.matched_beer_id).filter((id): id is number => id !== null))];
  const matchingResult = matchedBeerIds.length
    ? await db.from("beers").select("id,name").in("id", matchedBeerIds)
    : { data: [] as { id: number; name: string }[], error: null };
  if (matchingResult.error) {
    return <main className="taste-settings-page"><h1>Radar</h1><p>Porovnání s katalogem se nepodařilo načíst. Zkus stránku obnovit.</p></main>;
  }
  const matchedNames = new Map((matchingResult.data ?? []).map(b=>[b.id,b.name] as const));
  const newCount = pending.filter(c=>c.status==="new" && c.matched_beer_id===null).length;
  const existingCount = pending.filter(c=>c.matched_beer_id!==null).length;
  const uncertainCount = pending.length - newCount - existingCount;
  const { scan } = await searchParams;
  const card: CSSProperties = { padding:"16px",border:"1px solid rgba(231,166,47,.25)",borderRadius:"14px",background:"rgba(31,23,16,.75)",marginBottom:"14px" };
  const button: CSSProperties = { padding:"8px 12px",border:"1px solid rgba(231,166,47,.45)",borderRadius:"8px",background:"rgba(231,166,47,.12)",color:"inherit",cursor:"pointer" };

  return (
    <main className="taste-settings-page" style={{maxWidth:1100}}>
      <p><Link href="/settings">← Nastavení</Link></p>
      <h1>🍺 PIVNÍK RADAR</h1>
      <p>Interní pilot. Nálezy nikdy samy nezakládají piva ani neupravují existující katalog, verze nebo ochutnávky.</p>
      <section style={card}>
        <p><strong>{breweries.length}</strong> sledovaných pivovarů · <strong>{sources.length}</strong> zdrojů · <strong>{countResult.count ?? 0}</strong> otevřených nálezů</p>
        <p>Automatická kontrola vybírá nejvýše dvě stránky za běh. Domovské stránky bez produktového adaptéru pouze hlásí změny.</p>
        <form action={scanRadar}><button type="submit" style={button}>Spustit kontrolu nyní (max. 2 zdroje)</button></form>
        {scan==="ok" && <p role="status">Kontrola doběhla. Výsledky jsou uvedeny níže.</p>}
        {scan==="error" && <p role="alert">Kontrola se nepodařila. Zkontroluj poslední záznam a log funkce.</p>}
      </section>
      <section style={card}>
        <h2>Ke kontrole ({countResult.count ?? pending.length})</h2>
        <p><strong>Nová piva (návrhy): {newCount}</strong> · <strong>Existující piva k prověření: {existingCount}</strong>{uncertainCount>0 ? ` · Neurčené: ${uncertainCount}` : ""}</p>
        <p>Nové pivo znamená, že Radar nenašel dostatečnou shodu v katalogu. U existujícího piva zatím rozpoznal pouze možnou shodu názvu, nikoliv prokázanou změnu receptury nebo parametrů.</p>
        <p>„Vyřízeno“ pouze uzavře pracovní nález. Neschvaluje automatickou změnu katalogu ani založení piva.</p>
        {pending.length===0 ? <p>Žádné otevřené nálezy.</p> : pending.map(c=>(
          <article key={c.id} style={{padding:"12px 0",borderTop:"1px solid rgba(231,166,47,.18)"}}>
            <p style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <strong>{c.name}</strong>
              <span style={{fontSize:12,padding:"3px 9px",border:"1px solid rgba(231,166,47,.4)",borderRadius:999}}>
                {c.matched_beer_id !== null ? "Existující pivo · prověřit případnou změnu" : c.status==="new" ? "Nové pivo · návrh" : "Neurčený typ · prověřit"}
              </span>
            </p>
            <p style={{fontSize:13}}>{labels.get(c.brewery_id) ?? `Pivovar #${c.brewery_id}`} · nalezeno {date(c.first_seen_at)} · <a href={c.source_url} target="_blank" rel="noopener noreferrer">Ověřit zdroj ↗</a></p>
            {c.matched_beer_id !== null ? (
              <div style={{fontSize:13,padding:"8px 12px",borderLeft:"2px solid rgba(231,166,47,.4)",marginBottom:12}}>
                <p><strong>Zdroj uvádí:</strong> {c.name}</p>
                <p><strong>V katalogu:</strong> <Link href={`/beers?beer=${c.matched_beer_id}`}>{matchedNames.get(c.matched_beer_id) ?? `Pivo #${c.matched_beer_id}`}</Link></p>
                <p style={{opacity:.8}}>Aktualizace údajů zatím není potvrzena. Parametry na zdroji Radar v této fázi ještě neporovnává.</p>
              </div>
            ) : <p style={{fontSize:13,opacity:.8}}>Radar zatím nenašel dostatečnou shodu. Před založením ověř, zda nejde o jiný název nebo variantu existujícího piva.</p>}
            <form action={reviewRadarCandidate} style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <input type="hidden" name="id" value={c.id} />
              <button style={button} type="submit" name="status" value="reviewed">Vyřízeno</button>
              <button style={button} type="submit" name="status" value="ignored">Ignorovat</button>
            </form>
          </article>
        ))}
      </section>
      <section style={card}>
        <h2>Sledované pivovary</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
          {breweries.map(b=><div key={b.brewery_id}><strong>{labels.get(b.brewery_id) ?? `#${b.brewery_id}`}</strong> · priorita {b.priority}</div>)}
        </div>
      </section>
      <section style={card}>
        <h2>Zdroje a stav kontroly</h2>
        {sources.map(s=><div key={s.id} style={{padding:"9px 0",borderTop:"1px solid rgba(231,166,47,.18)",overflowWrap:"anywhere"}}>
          <strong>{labels.get(s.brewery_id) ?? s.brewery_id}</strong> · {s.extraction_mode} · <a href={s.url} target="_blank" rel="noopener noreferrer">zdroj ↗</a>
          <div style={{fontSize:12,opacity:.8}}>Poslední kontrola: {date(s.last_checked_at)} · další nejdříve {date(s.next_check_at)} {s.last_error ? `· Chyba: ${s.last_error}` : ""}</div>
        </div>)}
      </section>
      <section style={card}>
        <h2>Poslední běhy</h2>
        {runs.length===0 ? <p>Zatím žádný běh.</p> : runs.map(r=><p key={r.id}>#{r.id} · {date(r.started_at)} · {r.trigger_kind} · {r.result} · zkontrolováno {r.sources_checked} · nalezeno {r.candidates_created} · chyby {r.sources_failed}</p>)}
      </section>
    </main>
  );
}
