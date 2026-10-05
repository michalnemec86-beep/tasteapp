# Úplné kategorie a procházení pivovarů – 5. 10. 2026

## Aktivita a statistiky

Odkazy Zobrazit všechny na kartách Aktivity vedou přímo na /stats?focus=…
pro piva, značky, pivovary, styly, státy a způsoby podání. Totéž platí pro
souhrnná čísla v záhlaví; spotřeba zachovává metric=quantity. Kategorie
zobrazuje všechny odpovídající položky, bez omezení na deset a dalšího modalu.
Hlavní přehled Co a jak pijeme dál používá krátké náhledy a celý žebříček
s vlastním krokem historie. Styl a chmel z názvu dál otevírají Pivní lístek;
názvy ostatních objektů respektují dosavadní pravidla entity-navigation.md.

## Předchozí a další pivovar

Detail obsahuje levou/pravou šipku, pořadí v seznamu a návrat na seznam.
Pivovary se posouvají podle přesného pořadí a filtrů zdrojového výpisu:
společné žebříčky a jejich rozbalené dialogy, statistika státu, katalog
včetně stránkování/státu a osobní pivovary. Katalog a osobní pohled zachycují
při odchodu také lokální hledání, řazení a výběr; návrat je obnoví z URL.
Katalogová obnova přeskakuje starší opožděné DOM přehrávání, které by snapshot
resetovalo. Na krajích seznamu je příslušná šipka vypnutá. Každý posun vytváří
normální krok historie; Zpět v prohlížeči dál vrací předchozí zobrazení.

Kontext vzniká při běžné navigaci odkazem uvnitř aplikace. Přímý odkaz či
otevření do nové karty ponechá běžný profil bez kontextových šipek. Pokud
prohlížeč blokuje sessionStorage, odkaz dál funguje jako dřív. Není zavedené
náhradní přeskakování do nesouvisejícího seznamu. U jednoho výsledku nejsou
šipky potřeba. Kontext přetrvá přepnutí sortimentu a detail piva/značky.

## Výkon a bezpečnost

Ukládají se pouze už načtená číselná ID, označení seznamu, lokální návratová URL,
ověřený identifikátor aktuálního účtu a čas. Kontext má náhodný token v URL,
platí nejvýše dvě hodiny a uchovává se nejvýše osm seznamů v dané kartě.
Změna účtu nemůže použít předchozího uživatele; cizí/poškozené/expirující
kontexty se nezobrazí. Návratová URL připouští pouze lokální zdrojové seznamy.
ID z prohlížeče nepředstavují oprávnění; detail dál ověřuje přihlášení a RLS.

Vytvoření kontextu ani šipky nemají vlastní databázový dotaz. Cílový detail
načítá běžnou stránku až po kliknutí; přednačítání sousedních detailů je vypnuté.
Neukládají se katalogové detaily, session tokeny či privátní HTML. Nevzniká
databázová migrace a nemění se ochutnávky, agregace quantity, historické verze
ani katalogová/právová pravidla.

## Ověření

85 automatických testů včetně devíti nových: přesné pořadí a přechod přes
hranici stránky, krajní šipky, účet/expirace/neplatná data, povolené návraty,
omezení počtu kontextů, obnovení filtrů, dokončení odkazu, blokované úložiště,
vykreslení ovládání, kategoriální odkazy a celý výpis přes deset položek.
Regrese předchozí opravy historie jsou zahrnuté v plném test suite.
TypeScript, produkční build a cílený lint změněných komponent/helperů.
Skutečný přihlášený prohlížeč a fyzický telefon zde nebyly ověřené.
