# Navigace Pivníku

Připraveno 2. 10. 2026 podle Michalova zadání; zatím bez nasazení.

| Klik na název | Cíl |
| --- | --- |
| Pivovar | `/breweries/:id` |
| Značka | Pivovar s vybranou značkou a jejím sortimentem |
| Pivo | Pivovar, sekce Ochutnaná piva, otevřený detail a zvýraznění piva |
| Stát | Stávající profil `/stats/country/:country` |
| Uživatel | `/profiles/:id` |
| Styl | Pivní lístek s filtrem stylu |
| Chmel | Pivní lístek s filtrem chmele |

Stejná pravidla platí pro deník, timeline, Hodnocení, katalog, osobní přehledy,
žebříčky a mapy. Osobní statistické filtry se nepřenášejí do profilu objektu.
Číselné analytické ovládání a souhrnné prokliky zůstávají statistikami; u kategorií
Hodnocení filtruje číselné skóre, zatímco název země/stylu otevírá odpovídající cíl.

## Historie a kompatibilita

- Staré `/beers/:id` a `/brands/:id` jsou kompatibilní resolver odkazy, nikoliv
  samostatné produktové profily. Staré styly a `/hops/:id` přesměrují na lístek.
- Obecný odkaz na pivo volí výrobce aktuální verze, náhradně kompatibilní
  `beers.brewery_id`. Odkaz z ochutnávky/hodnocení používá dobový výrobní pivovar.
- Přímé URL obsahují `portfolio=all`, ID piva/značky a fragment. Cílová stránka
  vybranou položku otevře, zvýrazní a odscrolluje do zobrazení.
- Pivo vyrobené dříve jiným pivovarem lze zobrazit u dobového výrobce přes
  `beer_versions`. Doplněné položky slouží navigaci; nepřepočítávají původní hero
  počty z jiného výrobce. Nedostupné úpravy starého výrobce nejsou nabízeny.
- Historické parametry, aktuální údaje a zapsání dostupné ochutnávky jsou přímo
  v pivovaru. Přesun detailu nemění uložené záznamy ani pravidla hodnocení.
- Značka preferuje aktuální výrobce nad historickými vazbami. Při více aktuálních
  výrobcích nabídne existující přehled odpovídajících pivovarů; výběr uživatele
  otevře konkrétní značku. Značky bez piv využívají `brewery_brands`.
- Výpisy stylu/chmele zahrnují současné i evidované historické verze. Pivo se
  zobrazuje jednou; při shodě pouze v historii je to označeno u aktuálních údajů.
- Historická piva ani uzavřené pivovary tím nezískávají možnost nové ochutnávky.

## Ověření

- TypeScript a produkční sestavení s ověřovacími hodnotami veřejné konfigurace.
- Automatické testy stávajících výpočtů, oprávnění, hodnocení, PWA a log.
- Nové testy cílů navigace, více výrobců značky, dobového výrobce, kompatibilního
  beer resolveru, neplatného ID a nepřihlášeného přístupu.
- Bez databázových zápisů a migrací. Živé přihlášené prokliky a mobilní scroll
  nejsou dosud ověřené; ověřit v náhledu před nasazením.
