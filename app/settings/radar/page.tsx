import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound, redirect } from "next/navigation";
import { isAdminView, isCatalogAdminUser } from "@/lib/adminView";
import { createClient } from "@/lib/supabase/server";
import { reviewRadarCandidate, scanRadar } from "./actions";

export const metadata: Metadata = { title: "Radar | Administrace" };
export const dynamic = "force-dynamic";

type Brewery = { brewery_id: number; priority: string };
type Source = { id: number; brewery_id: number; url: string; extraction_mode: string; last_checked_at: string | null; last_error: string | null; next_check_at: string };
type Candidate = { id: number; brewery_id: number; name: string; source_url: string; status: string; matched_beer_id: number | null; first_seen_at: string };
type Run = { id: number; trigger_kind: string; started_at: string; finished_at: string | null; result: string; sources_checked: number; sources_failed: number; candidates_created: number };
type CatalogBeer = { id: number; name: string; plato: number | string | null; abv: number | string | null; style_id: number | null };
type CurrentVersion = { id: number; beer_id: number; plato: number | string | null; abv: number | string | null; style_id: number | null };

const date = (value: string | null) => value
  ? new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Prague" }).format(new Date(value))
  : "Zatím neproběhl";

const numeric = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === "" || !Number.isFinite(Number(value))
    ? "—"
    : new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 2 }).format(Number(value));

// An extracted title is not a structured technical data sheet. Do not infer alcohol.
function degreesFromTitle(value: string): number | null {
  const matches = value.matchAll(/(?:^|[\s(])(\d{1,2}(?:[.,]\d+)?)\s*°?(?=$|[\s),])/g);
  for (const match of matches) {
    const amount = Number(match[1].replace(",", "."));
    if (amount >= 6 && amount <= 30) return amount;
  }
  return null;
}
function styleFromTitle(value: string): string | null {
  const title = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const styles: [RegExp, string][] = [
    [/(?:^|\s)SVETLY LEZAK(?:\s|$)/, "Světlý ležák"],
    [/(?:^|\s)POLOTMAVY LEZAK(?:\s|$)/, "Polotmavý ležák"],
    [/(?:^|\s)TMAVY LEZAK(?:\s|$)/, "Tmavý ležák"],
    [/(?:^|\s)PALE ALE(?:\s|$)/, "Pale Ale"],
    [/(?:^|\s)NEIPA(?:\s|$)/, "NEIPA"],
    [/(?:^|\s)IPL(?:\s|$)/, "IPL"],
    [/(?:^|\s)IPA(?:\s|$)/, "IPA"],
    [/(?:^|\s)SOUR(?:\s|$)/, "Sour"],
    [/(?:^|\s)STOUT(?:\s|$)/, "Stout"],
    [/(?:^|\s)PORTER(?:\s|$)/, "Porter"],
    [/(?:^|\s)ALE(?:\s|$)/, "Ale"],
    [/(?:^|\s)LEZAK(?:\s|$)/, "Ležák"],
    [/(?:^|\s)NEALKO(?:\s|$)/, "Nealkoholické"],
  ];
  return styles.find(([pattern]) => pattern.test(title))?.[1] ?? null;
}

const surface: CSSProperties = { padding: "16px", border: "1px solid rgba(231,166,47,.24)", borderRadius: 14, background: "rgba(31,23,16,.75)" };
const item: CSSProperties = { padding: 16, border: "1px solid rgba(231,166,47,.21)", borderRadius: 12, background: "rgba(255,255,255,.025)" };
const subdued: CSSProperties = { fontSize: 13, opacity: .75 };
const button: CSSProperties = { padding: "9px 13px", border: "1px solid rgba(231,166,47,.55)", borderRadius: 9, background: "rgba(231,166,47,.16)", color: "inherit", cursor: "pointer", fontWeight: 600 };
const ignoreButton: CSSProperties = { ...button, background: "transparent", borderColor: "rgba(255,255,255,.24)", fontWeight: 400 };

function Facts({ plato, abv, style }: { plato: number | string | null | undefined; abv: number | string | null | undefined; style: string | null | undefined }) {
  const facts: [string, string][] = [
    ["Stupně", numeric(plato) === "—" ? "—" : numeric(plato) + "°"],
    ["Alkohol", numeric(abv) === "—" ? "—" : numeric(abv) + " %"],
    ["Styl", style || "—"],
  ];
  return <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:10}}>
    {facts.map(([label,value])=><div key={label} style={{minWidth:0}}>
      <div style={{...subdued,fontSize:11,marginBottom:3}}>{label}</div>
      <strong style={{fontSize:14,overflowWrap:"anywhere"}}>{value}</strong>
    </div>)}
  </div>;
}
function CandidateActions({ candidate, label }: { candidate: Candidate; label: string }) {
  return <form action={reviewRadarCandidate} style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
    <input type="hidden" name="id" value={candidate.id} />
    <button type="submit" name="status" value="reviewed" style={button}>{label}</button>
    <button type="submit" name="status" value="ignored" style={ignoreButton}>Ignorovat</button>
  </form>;
}

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ scan?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth/login");
  if (!isCatalogAdminUser(user.id) || !(await isAdminView(user.id))) notFound();

  const [breweriesResult, sourcesResult, candidatesResult, runsResult, countResult] = await Promise.all([
    db.from("radar_breweries").select("brewery_id,priority").order("priority").order("brewery_id"),
    db.from("radar_sources").select("id,brewery_id,url,extraction_mode,last_checked_at,last_error,next_check_at").order("id").limit(100),
    db.from("radar_candidates").select("id,brewery_id,name,source_url,status,matched_beer_id,first_seen_at").in("status",["new","possible_match"]).order("first_seen_at",{ascending:false}).limit(200),
    db.from("radar_runs").select("id,trigger_kind,started_at,finished_at,result,sources_checked,sources_failed,candidates_created").order("id",{ascending:false}).limit(5),
    db.from("radar_candidates").select("id",{count:"exact",head:true}).in("status",["new","possible_match"]),
  ]);
  if ([breweriesResult,sourcesResult,candidatesResult,runsResult,countResult].some(result=>result.error)) {
    return <main className="taste-settings-page"><h1>Radar</h1><p>Data Radaru se nepodařilo načíst. Zkus stránku obnovit.</p></main>;
  }

  const breweries = (breweriesResult.data ?? []) as Brewery[];
  const sources = (sourcesResult.data ?? []) as Source[];
  const pending = (candidatesResult.data ?? []) as Candidate[];
  const runs = (runsResult.data ?? []) as Run[];
  const latest = runs[0];
  const matchedIds = [...new Set(pending.map(c=>c.matched_beer_id).filter((id):id is number=>id !== null))];
  const [breweryLabelsResult, catalogResult, versionsResult] = await Promise.all([
    breweries.length ? db.from("breweries").select("id,name").in("id",breweries.map(b=>b.brewery_id)) : Promise.resolve({data:[],error:null}),
    matchedIds.length ? db.from("beers").select("id,name,plato,abv,style_id").in("id",matchedIds) : Promise.resolve({data:[],error:null}),
    matchedIds.length ? db.from("beer_versions").select("id,beer_id,plato,abv,style_id").in("beer_id",matchedIds).eq("is_current",true).order("id",{ascending:false}) : Promise.resolve({data:[],error:null}),
  ]);
  if (breweryLabelsResult.error || catalogResult.error || versionsResult.error) {
    return <main className="taste-settings-page"><h1>Radar</h1><p>Porovnání s katalogem se nepodařilo načíst.</p></main>;
  }
  const labels = new Map((breweryLabelsResult.data ?? []).map(b=>[b.id,b.name] as const));
  const beers = (catalogResult.data ?? []) as CatalogBeer[];
  const versions = (versionsResult.data ?? []) as CurrentVersion[];
  const beerById = new Map(beers.map(b=>[b.id,b] as const));
  const currentByBeer = new Map<number,CurrentVersion>();
  for (const version of versions) if (!currentByBeer.has(version.beer_id)) currentByBeer.set(version.beer_id,version);
  const styleIds = [...new Set([...beers.map(b=>b.style_id),...versions.map(v=>v.style_id)].filter((id):id is number=>id!==null))];
  const stylesResult = styleIds.length
    ? await db.from("beer_styles").select("id,name").in("id",styleIds)
    : { data: [] as {id:number;name:string}[], error: null };
  if (stylesResult.error) {
    return <main className="taste-settings-page"><h1>Radar</h1><p>Styly piv se nepodařilo načíst.</p></main>;
  }
  const styleNames = new Map((stylesResult.data ?? []).map(s=>[s.id,s.name] as const));
  const newBeers = pending.filter(c=>c.status==="new" && c.matched_beer_id===null);
  const existingBeers = pending.filter(c=>!newBeers.includes(c));
  const { scan } = await searchParams;

  return <main className="taste-settings-page" style={{maxWidth:980}}>
    <p style={{marginBottom:10}}><Link href="/settings">← Nastavení</Link></p>
    <h1 style={{marginBottom:18}}>🍺 PIVNÍK RADAR</h1>

    <section style={{...surface,display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:16}}>
      <div>
        <div style={{...subdued,fontSize:12,letterSpacing:".05em",textTransform:"uppercase"}}>Poslední scan</div>
        <div style={{fontSize:20,fontWeight:700,marginTop:3}}>{date(latest?.finished_at ?? latest?.started_at ?? null)}</div>
        <div style={{...subdued,marginTop:4}}>{latest ? latest.sources_checked+" zkontrolováno"+(latest.sources_failed ? " · "+latest.sources_failed+" chyba/y" : "") : "Čeká na první kontrolu"}</div>
      </div>
      <form action={scanRadar}><button style={button} type="submit">↻ Spustit scan</button></form>
      {scan==="ok" && <p role="status" style={{width:"100%",margin:0}}>Kontrola dokončena.</p>}
      {scan==="error" && <p role="alert" style={{width:"100%",margin:0}}>Kontrola se nepodařila. Podrobnosti najdeš níže.</p>}
    </section>

    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:22}}>
      <div style={{...surface,padding:13}}><div style={subdued}>Nová piva</div><strong style={{fontSize:26}}>{newBeers.length}</strong></div>
      <div style={{...surface,padding:13}}><div style={subdued}>Existující piva k prověření</div><strong style={{fontSize:26}}>{existingBeers.length}</strong></div>
    </div>

    <section style={{marginBottom:26}}>
      <h2 style={{fontSize:20,marginBottom:10}}>Nová piva <span style={{opacity:.6}}>({newBeers.length})</span></h2>
      <div style={{display:"grid",gap:10}}>
        {newBeers.length ? newBeers.map(c=><article key={c.id} style={item}>
          <strong style={{fontSize:17,display:"block",overflowWrap:"anywhere"}}>{c.name}</strong>
          <div style={{...subdued,marginTop:3}}>{labels.get(c.brewery_id) ?? "Pivovar #"+c.brewery_id}</div>
          <Facts plato={degreesFromTitle(c.name)} abv={null} style={styleFromTitle(c.name)} />
          <div style={{...subdued,fontSize:12,marginTop:12}}>
            Nalezeno {date(c.first_seen_at)} · <a href={c.source_url} target="_blank" rel="noopener noreferrer">Zdroj ↗</a>
          </div>
          <CandidateActions candidate={c} label="Potvrdit nález" />
        </article>) : <div style={{...surface,...subdued}}>Žádná nová piva ke kontrole.</div>}
      </div>
    </section>

    <section style={{marginBottom:24}}>
      <h2 style={{fontSize:20,marginBottom:6}}>Aktualizace stávajících piv <span style={{opacity:.6}}>({existingBeers.length})</span></h2>
      <p style={{...subdued,marginBottom:12}}>Zatím jde o možné shody názvů, nikoliv potvrzené změny parametrů.</p>
      <div style={{display:"grid",gap:10}}>
        {existingBeers.length ? existingBeers.map(c=>{
          const beer = c.matched_beer_id !== null ? beerById.get(c.matched_beer_id) : undefined;
          const version = c.matched_beer_id !== null ? currentByBeer.get(c.matched_beer_id) : undefined;
          const actualPlato = version ? version.plato : beer?.plato;
          const actualAbv = version ? version.abv : beer?.abv;
          const actualStyle = version ? version.style_id : beer?.style_id;
          return <article key={c.id} style={item}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",alignItems:"baseline",marginBottom:10}}>
              <strong>{labels.get(c.brewery_id) ?? "Pivovar #"+c.brewery_id}</strong>
              <span style={{...subdued,fontSize:12}}>Změna nepotvrzena</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
              <div style={{padding:12,borderRadius:10,background:"rgba(255,255,255,.045)",minWidth:0}}>
                <div style={{...subdued,fontSize:11,letterSpacing:".04em",marginBottom:8}}>PŮVODNÍ · PIVNÍK</div>
                <strong style={{display:"block",minHeight:39,overflowWrap:"anywhere"}}>
                  {beer ? <Link href={"/beers/"+beer.id}>{beer.name}</Link> : "Katalogová karta nedostupná"}
                </strong>
                <Facts plato={actualPlato} abv={actualAbv} style={actualStyle!==null && actualStyle!==undefined ? styleNames.get(actualStyle) : null} />
              </div>
              <div style={{padding:12,border:"1px solid rgba(231,166,47,.3)",borderRadius:10,background:"rgba(231,166,47,.055)",minWidth:0}}>
                <div style={{...subdued,fontSize:11,letterSpacing:".04em",marginBottom:8}}>NOVÝ NÁLEZ · WEB</div>
                <strong style={{display:"block",minHeight:39,overflowWrap:"anywhere"}}>{c.name}</strong>
                <Facts plato={degreesFromTitle(c.name)} abv={null} style={styleFromTitle(c.name)} />
              </div>
            </div>
            <div style={{...subdued,fontSize:12,marginTop:11}}>
              Nalezeno {date(c.first_seen_at)} · <a href={c.source_url} target="_blank" rel="noopener noreferrer">Zdroj ↗</a>
            </div>
            <CandidateActions candidate={c} label="Potvrdit kontrolu" />
          </article>;
        }) : <div style={{...surface,...subdued}}>Žádné existující pivo k prověření.</div>}
      </div>
    </section>

    <p style={{...subdued,fontSize:12,lineHeight:1.5,marginBottom:18}}>
      — znamená, že Radar údaj zatím nezískal. Stupně a styl na straně webu jsou rozpoznané pouze z názvu.
      Potvrzení nyní uzavírá nález v Radaru, nevytváří pivo ani nepřepisuje katalog.
    </p>

    <details style={{...surface,marginBottom:14}}>
      <summary style={{cursor:"pointer",fontWeight:600}}>Technické informace · {breweries.length} pivovarů / {sources.length} zdrojů</summary>
      <div style={{marginTop:14}}>
        <strong>Poslední kontroly</strong>
        {runs.map(run=><p key={run.id} style={{...subdued,margin:"8px 0"}}>{date(run.finished_at ?? run.started_at)} · {run.sources_checked} zdrojů · {run.candidates_created} nálezů · {run.sources_failed} chyb</p>)}
        <details style={{marginTop:16}}>
          <summary style={{cursor:"pointer"}}>Sledované zdroje ({sources.length})</summary>
          <div style={{marginTop:10,display:"grid",gap:10}}>
            {sources.map(s=><div key={s.id} style={{...subdued,overflowWrap:"anywhere"}}>
              <strong>{labels.get(s.brewery_id) ?? "Pivovar #"+s.brewery_id}</strong> · <a href={s.url} target="_blank" rel="noopener noreferrer">Web ↗</a>
              <div>Kontrola: {date(s.last_checked_at)}{s.last_error ? " · Chyba: "+s.last_error : ""}</div>
            </div>)}
          </div>
        </details>
      </div>
    </details>
    {(countResult.count ?? pending.length)>pending.length && <p style={subdued}>Zobrazeno prvních {pending.length} otevřených nálezů.</p>}
  </main>;
}
