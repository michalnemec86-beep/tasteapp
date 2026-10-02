# Osobní počty novinek v navigaci – 2. 10. 2026

## Chování

- Aktivita v hospodě, Pivní lístek a Pivovary mají malé červené číselné kolečko
  bez viditelného doprovodného textu. Nula se nezobrazuje; nad 99 je 99+.
- Desktop zobrazuje čísla na liště. Mobil má tečku na tlačítku menu a po
  rozbalení stejné počty vedle položek. Skryté popisky zachovávají přístupnost.
- Každý účet má vlastní návštěvy uložené v databázi, společné pro všechna zařízení.
  Počty se načtou na otevření a s odstupem při návratu/fokusu; nepoužívají polling
  ani Realtime. Focus/visibility se slučují a běžné čtení se opakuje nejdříve za minutu.
- Otevření přehledu sekce potvrdí novinky. Detail pivovaru/piva, načtení serverem
  nebo prefetch je nepotvrzuje. Návštěva jedné sekce nemaže počty ostatních.
- Katalogový odkaz s počtem otevře pouze příslušné nově přidané položky. Filtr
  newSince/newUntil nese přesný databázový čas i po vymazání kolečka. Návrat
  k celému katalogu používá existující tlačítko. Staré uložené filtry pivovarů
  neomezí čerstvý výpis a nové seznamy jsou automaticky rozbalené.
- Katalogy počítají unikátní nové identity, nikoli verze či běžné opravy. Aktivita
  počítá viditelné příspěvky ze stejných tří zdrojů jako timeline, v jejím
  tříměsíčním rozsahu. Vlastní příspěvky, beer_confirmed a skryté importy se nepočítají.
- Existující účty začínají okamžikem migrace; nové účty první inicializací.
  Starší obsah tedy nevytvoří zpětně stovky novinek.

## Databáze a nároky

Migrace `20261002172149_navigation_news_badges.sql` přidává navigation_reads
s jedním řádkem na účet, RPC navigation_news a částečný index created_at
pro viditelné ochutnávky. Existující indexy událostí a ocenění se využívají dál.
Kód RPC je SECURITY INVOKER s prázdným search_path, vyžaduje auth.uid() a je
spustitelný jen pro authenticated. RLS omezuje SELECT/INSERT/UPDATE návštěv
na vlastní účet; přidělená oprávnění nedovolují měnit majitele ani mazat řádky.

RPC vrací tři počty a časové hranice; nestahuje celé katalogy, loga, receptury
ani příspěvky. Potvrzení je monotónní, omezené serverovým časem a časem
otevřeného výpisu. Opožděné potvrzení neschová události vzniklé po tomto snímku.
Starší nebo cizí odpověď nemůže přepsat stav navigace. Při výpadku počtů se
zachová poslední stav a navigace zůstává použitelná.

Filtr novinek čte jen ID událostí a katalogové podrobnosti načítá po skupinách
nejvýše 200 ID, s nejvýše třemi současnými dotazy. Nezkrátí seznam nad limitem
API ani při souběžném smazání položky. Hlavní odkazy novinek nemají prefetch.

## Ověření

- 55 automatických testů, TypeScript a produkční build.
- Nové regrese: osobní stav, cache, duplicitní návraty, pomalé odpovědi, změna
  účtu, offline opakování, potvrzení jen správné sekce, přesnost času, novinky
  nad limitem API a číselné kolečko/tečka v HTML desktopu i mobilního menu.
- `tests/sql/navigation-news.sql` prošel proti produkčnímu schématu pod rolemi
  authenticated a anon. Testuje vlastní/cizí/skryté události, deduplikaci,
  opožděné potvrzení, nemožnost změny cizího účtu či majitele, zákaz anonymního
  RPC a první inicializaci. Všechny události a změny testu jsou vrácené ROLLBACK;
  test nevytváří ani nemění piva, pivovary, ochutnávky a ocenění.
- Měření 100 čtení po zahřátí pod authenticated: průměr 0,210 ms v databázi,
  JSON souhrnu 215 bajtů. Nejde o síťovou latenci ani čas celého zobrazení.
- RLS a oprávnění ověřeny; bezpečnostní i výkonnostní advisors nepřidaly nové
  nálezy proti výchozímu stavu. Existující nálezy správy pozvánek/funkcí a archivů
  touto změnou nejsou dotčené: [security linter](https://supabase.com/docs/guides/database/database-linter),
  [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Screenshot QA nebyla dostupná: prostředí nemá Chromium a instalace prohlížeče
  vracela neplatný archiv. HTML obou variant je otestované; fyzický telefon ani
  přihlášené vizuální klikání v produkci se tím nepotvrzuje.

Statistiky, množství, historie piv, existující serverová oprávnění a grafika
ostatních stránek se touto změnou nemění. Výchozí archiv zůstává neměnný.
