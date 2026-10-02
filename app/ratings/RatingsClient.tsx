"use client";

import { beerHref, styleHref, countryHref } from "@/lib/entity-navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import HomeStatIcon from "@/components/home/HomeStatIcon";
import AutoLogoFrame from "@/components/ui/AutoLogoFrame";
import RatingStars, { RatingStar } from "@/components/ui/RatingStars";
import { PACKAGING_OPTIONS, getPackagingMeta } from "@/lib/packaging";
import { filterRatings, formatRating, rankRatings, type RatedTasting, type RatingFilters, type RatingGroup, type RatingRank } from "@/lib/ratings";

const EMPTY_FILTERS: RatingFilters = { country: "", style: "", packaging: "", beer: "" };
const PAGE_SIZE = 10;

export default function RatingsClient({ rows, initialBeer = "" }: { rows: RatedTasting[]; initialBeer?: string }) {
  const [filters, setFilters] = useState<RatingFilters>({ ...EMPTY_FILTERS, beer: initialBeer });
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => filterRatings(rows, filters), [rows, filters]);
  const reviews = useMemo(() => [...filtered].sort((a, b) => Date.parse(b.ratedAt) - Date.parse(a.ratedAt) || b.id - a.id), [filtered]);
  const best = useMemo(() => rankRatings(filtered, "beer"), [filtered]);
  const worst = useMemo(() => rankRatings(filtered, "beer", true), [filtered]);
  const countries = useMemo(() => [...new Set(rows.map(row => row.country))].sort((a,b) => a.localeCompare(b,"cs")), [rows]);
  const styles = useMemo(() => [...new Set(rows.map(row => row.style))].sort((a,b) => a.localeCompare(b,"cs")), [rows]);
  const average = filtered.length ? filtered.reduce((sum, row) => sum + row.rating, 0) / filtered.length : null;
  const pageCount = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  function changeFilter(key: keyof RatingFilters, value: string) {
    setFilters(previous => ({ ...previous, [key]: value })); setPage(1);
  }
  const hasFilters = Object.values(filters).some(Boolean);
  const selectedBeer = rows.find(row => String(row.beerId) === filters.beer);

  return <>
    <PageHero eyebrow="Jak nám chutná" title="Hodnocení" subtitle="Piva očima štamgastů. Každá hodnocená ochutnávka má jeden hlas."
      imageUrl="/images/heroes/ratings-tasting.webp" visualVariant="stats" hideRightContent mobileCompact
      stats={[
        { icon: <HomeStatIcon kind="mug"/>, value: best.length, label: "Hodnocených piv" },
        { icon: <RatingStar/>, value: filtered.length, label: "Hodnocení" },
        { icon: <HomeStatIcon kind="medal"/>, value: average === null ? "—" : <span>{formatRating(average)}<span>/5</span></span>, label: "Průměrné hodnocení" },
      ]}/>

    <section className="taste-ratings-filters" aria-label="Filtry hodnocení">
      <label>Země<select aria-label="Země" value={filters.country} onChange={event => changeFilter("country", event.target.value)}>
        <option value="">Všechny země</option>{countries.map(country => <option key={country}>{country}</option>)}
      </select></label>
      <label>Pivní styl<select aria-label="Pivní styl" value={filters.style} onChange={event => changeFilter("style", event.target.value)}>
        <option value="">Všechny styly</option>{styles.map(style => <option key={style}>{style}</option>)}
      </select></label>
      <label>Podání / obal<select aria-label="Podání / obal" value={filters.packaging} onChange={event => changeFilter("packaging", event.target.value)}>
        <option value="">Všechna podání</option>{PACKAGING_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      {hasFilters && <button className="taste-ratings-reset" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>Zrušit filtry</button>}
      {filters.beer && <div className="taste-ratings-selected-beer">Pivo: {selectedBeer?.beerName || "Vybrané pivo"}<button onClick={() => changeFilter("beer", "")} aria-label="Zrušit filtr piva">×</button></div>}
    </section>

    <RatingCarousel labels={["Nejlepší piva", "Nejhorší piva"]} variant="main">
      <BeerRanking title="10 nejlepších piv" items={best.slice(0,10)} worst={false}/>
      <BeerRanking title="10 nejhorších piv" items={worst.slice(0,10)} worst/>
    </RatingCarousel>

    <div className="taste-ratings-section-heading"><h2>Hodnocení podle kategorií</h2><p>Průměry hodnocených ochutnávek. Přepni si nejlepší a nejhorší.</p></div>
    <RatingCarousel labels={["Země", "Pivní styly", "Podání"]} variant="categories">
      <CategoryRanking rows={filtered} group="country" title="Země" icon={<HomeStatIcon kind="globe"/>} onSelect={value => changeFilter("country", value)}/>
      <CategoryRanking rows={filtered} group="style" title="Pivní styly" icon={<HomeStatIcon kind="hop"/>} onSelect={value => changeFilter("style", value)}/>
      <CategoryRanking rows={filtered} group="packaging" title="Podání / obal" icon={<HomeStatIcon kind="bottle"/>} onSelect={value => changeFilter("packaging", value)}/>
    </RatingCarousel>

    <section className="taste-rating-reviews" aria-labelledby="rating-reviews-title">
      <div className="taste-ratings-section-heading"><h2 id="rating-reviews-title">Poslední hodnocení</h2><span className="taste-ratings-review-count">{reviews.length.toLocaleString("cs-CZ")} hodnocení</span></div>
      {!reviews.length ? <EmptyRatings hasFilters={hasFilters}/> : <>
        <div className="taste-rating-review-list">{reviews.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE).map(row => <article key={row.id} className="taste-rating-review">
          <Link href={`/profiles/${row.userId}`} className="taste-rating-avatar" aria-label={`Profil ${row.userName}`}>
            {row.avatarUrl ? <img src={row.avatarUrl} alt="" width="42" height="42"/> : <HomeStatIcon kind="crest"/>}
          </Link>
          <div className="taste-rating-review-content">
            <div className="taste-rating-review-sentence"><Link href={`/profiles/${row.userId}`} className="taste-rating-user">{row.userName}</Link> <span>ohodnotil pivo</span> <Link href={beerHref(row.beerId, row.breweryId)} className="taste-rating-beer">{row.beerName}</Link></div>
            <div className="taste-rating-review-meta">{row.breweryId ? <Link href={`/breweries/${row.breweryId}`}>{row.breweryName}</Link> : row.breweryName}<span> · {getPackagingMeta(row.packaging)?.label || "Jiné"}</span><time dateTime={row.ratedAt}>{new Date(row.ratedAt).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>
          </div>
          <RatingStars rating={row.rating}/>
        </article>)}</div>
        {pageCount > 1 && <nav className="taste-ratings-pagination" aria-label="Stránky hodnocení">
          <button disabled={currentPage === 1} onClick={() => setPage(currentPage-1)}>Předchozí</button>
          <span aria-live="polite">{currentPage} / {pageCount}</span>
          <button disabled={currentPage === pageCount} onClick={() => setPage(currentPage+1)}>Další</button>
        </nav>}
      </>}
    </section>
  </>;
}

function RatingCarousel({ children, labels, variant }: { children: ReactNode; labels: string[]; variant: "main" | "categories" }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  function scrollTo(index: number) {
    const node = track.current;
    const target = node?.children[index] as HTMLElement | undefined;
    if (node && target) node.scrollTo({ left: target.offsetLeft - (node.children[0] as HTMLElement).offsetLeft, behavior: "smooth" });
  }
  return <section className={`taste-ratings-carousel taste-ratings-carousel-${variant}`} aria-label={variant === "main" ? "Žebříčky piv" : "Žebříčky kategorií"}>
    <div className="taste-ratings-carousel-tabs" role="group" aria-label="Vybrat žebříček">{labels.map((label,index) => <button key={label} aria-pressed={active === index} onClick={() => scrollTo(index)}>{label}</button>)}</div>
    <div ref={track} className="taste-ratings-carousel-track" onScroll={() => {
      const node = track.current;
      if (node && node.children.length > 1) {
        const distance = (node.children[1] as HTMLElement).offsetLeft - (node.children[0] as HTMLElement).offsetLeft;
        if (distance) setActive(Math.max(0, Math.min(labels.length-1, Math.round(node.scrollLeft / distance))));
      }
    }}>{children}</div>
  </section>;
}

function BeerRanking({ title, items, worst }: { title: string; items: RatingRank[]; worst: boolean }) {
  return <article className={`taste-rating-card taste-rating-main-card${worst ? " taste-rating-worst" : ""}`}>
    <header><HomeStatIcon kind={worst ? "mug" : "medal"}/><div><h2>{title}</h2><p>Podle průměrného hodnocení</p></div></header>
    {!items.length ? <p className="taste-ratings-empty">Zatím tu nejsou hodnocená piva.</p> : <ol className="taste-rating-ranking-list">{items.map((item,index) => <li key={item.id}>
      <span className="taste-rating-position">{index+1}</span>
      {item.tasting.logoUrl ? <AutoLogoFrame src={item.tasting.logoUrl} alt="" size={34}/> : <span className="taste-rating-beer-icon"><HomeStatIcon kind="mug"/></span>}
      <div className="taste-rating-rank-name"><Link href={beerHref(item.id, item.tasting.breweryId)}>{item.name}</Link><span>{item.tasting.breweryId ? <Link href={`/breweries/${item.tasting.breweryId}`}>{item.tasting.breweryName}</Link> : item.tasting.breweryName}</span></div>
      <Link href={`/ratings?beer=${item.id}`} aria-label={`Hodnocení piva ${item.name}`}><RankScore item={item}/></Link>
    </li>)}</ol>}
  </article>;
}

function CategoryRanking({ rows, group, title, icon, onSelect }: { rows: RatedTasting[]; group: Exclude<RatingGroup,"beer">; title: string; icon: ReactNode; onSelect: (value:string) => void }) {
  const [worst, setWorst] = useState(false);
  const items = useMemo(() => rankRatings(rows, group, worst).slice(0,10), [rows, group, worst]);
  return <article className="taste-rating-card taste-rating-category-card">
    <header>{icon}<div><h2>{title}</h2><p aria-live="polite">{worst ? "Nejhorší" : "Nejlepší"} hodnocení</p></div>
      <button className="taste-rating-toggle" onClick={() => setWorst(value => !value)} aria-label={`Zobrazit ${worst ? "nejlepší" : "nejhorší"} hodnocení: ${title}`}>{worst ? "Nejlepší" : "Nejhorší"}</button>
    </header>
    {!items.length ? <p className="taste-ratings-empty">Zatím bez hodnocení.</p> : <ol className="taste-rating-ranking-list">{items.map((item,index) => <li key={item.id}>
      <span className="taste-rating-position">{index+1}</span>
      {group === "packaging" && <HomeStatIcon kind={item.id === "draft" ? "mug" : item.id === "bottle" ? "bottle" : item.id === "can" ? "can" : item.id === "pet" ? "pet" : "package"}/>}
      {group === "country" ? <Link className="taste-rating-category-name" href={countryHref(item.name)}>{item.name}</Link> : group === "style" && item.tasting.styleId ? <Link className="taste-rating-category-name" href={styleHref(item.tasting.styleId)}>{item.name}</Link> : <button className="taste-rating-category-name" onClick={() => onSelect(item.id)}>{group === "packaging" ? getPackagingMeta(item.name)?.label || "Jiné" : item.name}</button>}
      <button className="taste-rating-score-filter" onClick={() => onSelect(item.id)} aria-label={`Filtrovat hodnocení: ${item.name}`}><RankScore item={item}/></button>
    </li>)}</ol>}
  </article>;
}

function RankScore({ item }: { item: RatingRank }) {
  return <div className="taste-rating-rank-score"><span><RatingStar/>{formatRating(item.average)}<small>/5</small></span><span>{item.count.toLocaleString("cs-CZ")} hodnocení</span></div>;
}

function EmptyRatings({ hasFilters }: { hasFilters: boolean }) {
  return <div className="taste-ratings-empty-state"><RatingStar/><h3>{hasFilters ? "Pro tento výběr zatím žádné hodnocení" : "První hvězdy jsou na tobě"}</h3>
    <p>{hasFilters ? "Zkus změnit filtry nebo zobrazit všechna hodnocení." : "Při přidání nebo úpravě ochutnávky vyber 1–5 hvězd. Hodnocené pivo se objeví tady."}</p>
    {!hasFilters && <Link href="/">Otevřít můj pivní deník</Link>}
  </div>;
}
