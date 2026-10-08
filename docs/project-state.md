# Pivník - současný stav a návaznost práce

Aktualizováno: 8. 10. 2026. Toto je výchozí přehled pro další práci na projektu.

## Dohodnutý stav

Michal považuje základní podobu aplikace za hotovou. Mobilní i desktopová grafika
jsou sjednocené. Další práce má řešit případné opravy podle uživatelských komentářů.
Nové funkce přidávat podle dalšího zadání.

Aplikace používá jednu PWA instalační cestu pro Android i iPhone. Michal dne
2. 10. 2026 potvrdil instalaci a běh na iPhonu. Skutečná instalace na Androidu
zatím nebyla potvrzena. Není to potvrzení všech fyzických testů z docs/pwa.md.

Produkce: https://tasteapp-eosin.vercel.app
Repozitář: michalnemec86-beep/tasteapp
Supabase projekt: nsnvryyocwzfwxiwhqca
Funkční základ archivované verze: 65ed1f0f6938ae4a87d53623e2123485c52812e6.
Pozdější commit přidává tuto dokumentaci; nemění funkce archivované verze.

## Následné změny

- 8. 10. 2026: na přání upraveny oba modaly zapsání i editace
  ochutnávky. Rozbalovací panel má jednotný nadpis „Informace o ochutnaném
  pivu“ a je při každém otevření výchozí sbalený. Pro nové pivo s
  chybějící povinnou zemí nebo parametrem ho validace sama rozbalí.
  Datum a počet mají vlastní nekolizní mobilní sloupce se zmenšeným
  datovým inputem. Hodnocení a místo jsou dvě nezávislé části; poznámka
  byla odstraněna z uživatelských formulářů, ale server starší
  `tastings.notes` zachovává při ostatních editacích. Přepínače místa:
  Hospoda/Festival otevřou vyhledávací pole, Doma jen aktivní volbu a
  neveřejný textový příznak. Bez migrace a změn existujících dat.

- 8. 10. 2026: mobilní nový i editační formulář ochutnávky má oddělené
  povinné údaje a sbalitelné doplňkové informace. Pivovar/značka/pivo
  zůstávají vpředu; parametry katalogového piva se vizuálně upozadí a
  po zvolení existujícího piva sbalí, ale hodnoty formuláře zůstávají
  zachované. Stupňovitost, alkohol a IBU jsou v kompaktním řádku.
  Nepovinné místo používá společný výběr Hospoda/Doma/Festival,
  našeptávání katalogových míst i nedávných vlastních názvů; Doma se
  nikdy nezakládá jako veřejná katalogová entita. Poznámka je dostupná
  v novém i editačním formuláři, beze změny starých poznámek.

- 8. 10. 2026: první fáze systémového katalogu Místa.
  `public.places` eviduje jméno, město, stát, kategorii, ověření a autora;
  tabulka má RLS, návrhy mohou vytvářet přihlášení, správu smí jen
  katalogový administrátor. Ochutnávky mají nepovinné `place_id` a
  `place_category`, ale starý text `tastings.place` zůstává zachován.
  Stránka `/places` ukazuje počet záznamů (ne součet quantity) u vazeb
  na katalog, oddělenou starou nezařazenou evidenci vidí pouze admin.
  Žádná stará hodnota se automaticky nepáruje ani nepřepisuje; město a
  stát nevyplněných návrhů může později doplnit admin. Migrace
  `20261008071548_places_catalog_and_optional_tasting_links.sql`.
  Mobilní PWA vyžaduje fyzický test hledání, editace a ukládání.

- 8. 10. 2026: oprava doložené dvojité ochutnávky ze 7. 10. 2026.
  Dva prakticky totožné záznamy téhož uživatele a piva vznikly přibližně
  2,5 sekundy po sobě, oba s quantity=2 a rating=3/5. Ponechána starší
  ochutnávka id=2611; novější id=2612 odstraněna až po transakčním
  ověření všech údajů a uložení původního řádku do neveřejné tabulky
  `private.tasting_correction_audit` (retained_tasting_id=2611).
  Výsledek: u dané dvojice z 4 na 2 kusy a ze 2 na 1 hodnocení.
  Původní celosystémové počty 2560 záznamů / 2860 kusů / 7 hodnocení,
  po opravě 2559 / 2858 / 6. Audit nepřístupný běžným účtům;
  tabulka vedena v migraci `20261008063750_create_private_tasting_correction_audit.sql`.
  Při podobné opravě vždy porovnat identitu, čas, hodnoty i importní
  vazby; nikdy automaticky neodstraňovat všechny shody pivo+den.

- 8. 10. 2026: seskupený příspěvek na timeline už nemá rozbalovací šipku
  ani seznam dílčích ochutnávek. Ukazuje součet skutečně vypitých piv
  a případné hodnocení z poslední hodnocené ochutnávky skupiny (včetně
  případu, kdy ostatní ochutnávky nebyly hodnoceny). Nepočítá nový průměr
  ani další hlas. Jednotlivé záznamy a editace zůstávají v uživatelské
  historii „Co jsem vypil“. Jen úprava zobrazení; data beze změny.

- 8. 10. 2026: seskupené příspěvky na timeline již nezobrazují slovní
  souhrn počtu denních ochutnávek/piv/hodnocení, dlouhý text u rozbalení
  ani text v patičce „× hodnoceno“. Detail jednotlivých záznamů se otevírá
  dříve kompaktní ikonou. Následná změna uvedená výše odstranila
  i samotné rozbalení. Součet quantity se stále zobrazuje u názvu piva;
  namísto samotné ikony hvězdy se uvádí skutečné poslední hodnocení
  ze skupiny. Jednotlivé záznamy jsou nadále v osobní historii.
  Pouze změna vykreslení, bez zásahu do dat a statistik.

- 8. 10. 2026: časová osa Aktivity seskupuje pro zobrazení více ochutnávek
  stejného uživatele, téhož katalogového piva a stejného kalendářního dne do
  jednoho příspěvku. V souhrnu se sčítá quantity. Dílčí záznamy a
  samostatné úpravy nadále existují v osobní historii (už nejsou
  rozbalitelné přímo na timeline). K seskupení není třeba půlnoční úloha
  ani zásah do databáze.
  Při přidávání existujícího piva se načítá poslední vlastní hodnocení
  uživatele jako samostatná informace. Novou známku lze přidat výslovným
  tlačítkem „Hodnotit znovu“. Pokud zůstane stejný počet hvězd jako
  při předchozím vlastním hodnocení, nová ochutnávka se uloží bez
  nového hlasu. Teprve změna počtu hvězd přidá další hodnocení.
  Pravidlo ověřuje klient i server a staré záznamy se nemění.
  Stránka Hodnocení u konkrétního piva nově ukazuje také osobní průměr a
  počet hodnocených ochutnávek; globální logika hlasu na ochutnávku se nemění.
  Bez migrace a bez změny starých dat. V mobilní PWA je nutno ověřit
  zobrazení hodnocení, editace v historii a opakované hodnocení.

- 8. 10. 2026: ochrana existujícího místa a poznámky při editaci
  ochutnávky. Editační modal zatím nemá vstupy pro tyto údaje;
  server je proto při běžné editaci ostatních údajů nesmí přepsat na NULL.
  Pokud pole klient skutečně odešle, lze ho nadále upravit i vymazat.
  Neproběhla změna existujících ochutnávek, návrh katalogu míst zatím
  zůstává otevřený. Viz `tests/tasting-edit-preserve-fields.test.mjs`.

- 8. 10. 2026: nový zápis ochutnávky má okamžitý stav „Ukládám ochutnávku…“
  s indikátorem, po odeslání blokuje další kliknutí a po chybě umožňuje
  zopakování bez změny identifikátoru požadavku. Každý formulář používá vlastní
  UUID; server ověřuje dřívější uložení a unikátní index
  `tastings(user_id, submission_id)` zachytí i současné požadavky. Historické
  záznamy mají nový sloupec NULL; stejnou kombinaci piva/dne lze legitimně
  uložit opakovaně, pokud jde o novou ochutnávku. Migrace
  `20261008051313_add_tasting_submission_id.sql` neprovádí změny historie ani
  statistics. Nutno fyzicky ověřit rychlý dvojklik a pomalou síť na telefonech
  (PWA). Viz `docs/tasting-save-idempotency.md`.

- 6. 10. 2026: stránka „Pivovary“ byla odlehčena pro mobilní PWA. Mapové boxy jsou ve výchozím stavu sbalené, nejdřív Česko a potom svět, a používají jen lehký statický náhled. Souřadnice, osobní příznak českých pivovarů i světová agregace se načítají až při prvním rozbalení; po sbalení zůstávají data v klientské paměti. Rozsah „Nové pivovary“ se zachovává i v lazy mapách. Hlavní tabulka už nenačítá u všech pivovarů detailní piva, styly, technické údaje a vnořené ochutnávky. Počty a filtry skládá z kompaktního indexu piv/značek a ochutnávek, zatímco detail značek a piv se načte až po kliknutí na počet značek konkrétního pivovaru. Bez migrace a bez změny existujících dat.

- 6. 10. 2026: „Pivní lístek“ byl převeden na serverové stránkování zaměřené na mobilní PWA. Výchozí stránka načítá jen horní počty a neposílá do klienta celý katalog. Hledání, osobní/globální filtry, řazení, země a abeceda vracejí nejvýše 60 karet; další várka se načte až na vyžádání. Server používá lehký index katalogu pro rozhodnutí o shodě a pořadí a plný detail načítá pouze pro viditelnou stránku. Počty vypito / moje piva se skládají z kompaktních tasting vazeb místo vnořených polí u každého piva. Historické filtry stylů a chmelů zachovávají dosavadní same-version logiku přes beer_versions. Bez migrace a bez změny existujících dat.

- 6. 10. 2026: stránka „Aktivita v hospodě“ byla odlehčena pro mobilní PWA i desktop. Zavřený formulář nové ochutnávky ani editace už nepřednačítají celý katalog. Timeline zůstává omezená na poslední tři měsíce a stránkovaná po 15 serverových položkách / 5 mobilních položkách. Globální statistiky dál zachovávají quantity a historické brewery/style vazby přes beer_versions, ale jejich vstupní dotaz už neposílá nepoužívané chmelové relace ani pomocná katalogová data. Žádná migrace ani změna existujících dat.

- 6. 10. 2026: výkon osobního profilu a záložky „Co jsem vypil“ byl odlehčen
  zejména pro mobilní PWA. Profil nepřednačítá katalog pro zavřený formulář;
  nový zápis používá malou nabídku posledních/častých piv a serverové hledání.
  Historie „Co jsem vypil“ používá kompaktní serverový index a kompletní detail
  načítá jen pro aktuálních 30 záznamů. Filtrování a řazení probíhá na serveru
  nad kompaktním indexem, změna filtru vrací stránkování na začátek. Editace
  dohledává jiné pivo až podle potřeby. „Zapsat znovu“ předvyplní pouze současné
  pivo z otevřeného pivovaru; historická a ukončená piva zůstávají nepoužitelná
  pro nový zápis. Osobní souhrny zachovávají quantity i historické brewery/style/
  hop vazby přes beer_versions. Bez migrace a bez změny existujících dat.

- 6. 10. 2026: historie názvů pivovarů používá pro začátek současného názvu
  poslední rok změny názvu, nikoli rok založení pivovaru. Při novém přejmenování
  je rok změny povinný a původnímu názvu se automaticky uloží celé období od
  předchozí změny (nebo od založení). Historická piva, ochutnávky a identity
  pivovarů se tím nemění.

- 5. 10. 2026: odkazy z Aktivity vedou na celé konkrétní statistiky; detaily
  pivovarů umožňují posun vlevo/vpravo v původním filtrovaném seznamu
  ([chování, výkon a ověření](category-brewery-browsing.md)). Bez nové databázové
  zátěže pro určení sousedů, bez změny statistik či oprávnění.

- 5. 10. 2026: rozbalené žebříčky v Co a jak pijeme mají vlastní krok historie.
  Návrat z profilu obnoví otevřený seznam; další Zpět jej zavře. Stejná cesta
  platí na desktopu i mobilu ([příčina, rozsah a ověření](ranking-history.md)).

- 5. 10. 2026: oprava falešné chyby zapnutí push po úspěšném HTTP 204 a
  odstranění zbytečného čekání při startu ([příčina a rozsah](mobile-push-news.md#oprava-aktivace-a-spuštění-5-10-2026)).
  Počítadla se čtou mimo frontu serverových akcí, ověření účtu je sdílené jen
  uvnitř jednoho renderu a úvodní překryv nečeká neomezeně na hydrataci.

- 5. 10. 2026: dobrovolná oznámení novinek i při zavřené aplikaci a značka na
  její ikoně podle možností telefonu ([zapnutí, limity a ověření](mobile-push-news.md)).
  Zapíná se pro každou instalaci v Nastavení, nejvýše jednou za 24 hodin pro
  účet, s nočním klidem. Backend běží odděleně od zápisů a načítání stránek.
  Fyzické doručení na telefonech zatím nebylo ověřeno.

- 2. 10. 2026: jednotná normalizace všech uložených log včetně pivního podtácku
  ([popis a ověření](logo-normalization.md)). Originály a archiv zůstávají zachované.

- 2. 10. 2026 nasazeno (PR #65): sjednocení navigace názvů na profily pivovarů, států a uživatelů;
  piva a značky uvnitř pivovaru, styly/chmely do Pivního lístku
  ([pravidla a ověření](entity-navigation.md)). Změna není součástí původního archivu.

- 2. 10. 2026: pasivní historie sortimentu a načítání podrobností až podle
  zvoleného filtru nebo přímého odkazu ([rozsah a ověření](passive-beer-history.md)).
  Historická piva v seznamu pivovaru nejsou klikací; statistiky a staré ochutnávky
  zůstávají zachované. Bez změny databázových záznamů nebo migrace.

- 2. 10. 2026: osobní červené počty novinek u Aktivity, Pivního lístku a Pivovarů;
  na mobilu také tečka u menu ([chování a ověření](navigation-news.md)).
  Návštěvy se synchronizují přes účet. Nová metadata a RPC respektují RLS;
  starší obsah při zavedení nevytvoří upozornění.

- 3. 10. 2026: administrátorská obnova přístupu bez mazání účtu
  ([chování a ověření](admin-password-reset.md)). Reset nastaví dočasné heslo
  aktivnímu uživateli, zachová jeho UUID a data a při dalším přihlášení vynutí
  nastavení vlastního hesla.

- 3. 10. 2026: oprava dokončení změny hesla v mobilním prohlížeči:
  CORS preflight a odpovědi `complete-initial-password`, opakování pouze
  neúspěšného dokončení a kontrola obnovení relace
  ([příčina a ověření](admin-password-reset.md)).

- 6. 10. 2026: první nastavení hesla ukládá nové heslo a ukončení povinné změny
  jedním Auth Admin požadavkem. Opakování po ztracené odpovědi či reloadu je
  bezpečné; původní dočasné heslo není přijato. Běžná obnova hesla zachovává
  klientské Auth API ([postup a ověření](admin-password-reset.md)).

- 6. 10. 2026: společné styly žebříčků již nepřidávají vnitřní odsazení
  normalizovaným logům. Tím se opravuje tmavý prstenec kolem bílého loga Carlton
  & United Breweries ve statistikách Austrálie, dalších statistikách i mobilních
  žebříčcích ([příčina a ověření](logo-normalization.md)).

## Dokumenty k načtení

- [Přehled funkcí a ověření](function-report-2026-10-02.md).
- [Obnova a opětovné spuštění](restore-2026-10-02.md).
- [Datový protokol](beer-data-protocol.md): kanonické identity a historické statistiky.
- [PWA](pwa.md): instalace, cache a fyzické ověření.
- [Historické importy](historical-import.md): pouze dokumentace dokončených importů.

Starý tasteapp-overview.md popisuje zářijový stav. Současné funkce a oprávnění
ověřovat podle této dokumentace, aktuálního kódu a databáze, ne podle jeho
zastaralých částí o homepage, verifikaci, CSV importu nebo Pivovaru dne.

## Archivační soubory

Soubory jsou trvale uložené jako soukromé soubory vlastníka; pro dohledání použít
přesný název nebo identifikátor. Nejde o veřejné download URL.

| Soubor | Trvalý identifikátor |
| --- | --- |
| Pivnik-kompletni-archiv-2026-10-02.zip | libfile_af9a8affb63c8191a63f4c6dbac4765d |
| Pivnik-report-funkci-2026-10-02.pdf | libfile_c7a92ff185b08191b5cb25575cc3c56a |

ZIP: 14 485 697 bajtů, 331 souborových položek.
SHA-256: 58014f89a562ca87fe848409c1b78e9ffd52015f78551c5854bb172c81589da6.
Obsahuje 260 zdrojových souborů, historii produkčního HEAD, 54 tabulek / 34 475
řádků včetně soukromých historických auditů, všech 50 Storage souborů, migrace,
serverové funkce, kontrolní součty a návod. Report má 8 stran a je i uvnitř ZIPu.
ZIP nepřikládat do veřejného webu či repozitáře; obsahuje osobní data.

Archiv neobsahuje hashe hesel, Auth sessions/tokény, aktivní zvací odkazy, tajné
klíče nebo plnou poskytovatelskou konfiguraci. Úplný přesun se zachováním přihlášení
vyžaduje samostatnou Auth zálohu nebo nové účty s ověřeným přemapováním UUID.
Referenční SQL má ověřenou syntaxi; skutečná obnova do nového backendu nebyla
provedena. Se současným Supabase lze znovu spustit kód podle přiloženého návodu.

## Kontroly k základní verzi

- Všech 28 automatických testů prošlo i při archivaci.
- Produkční build a nasazení prošly při dokončení PWA 2. 10. 2026.
- Živá instalační stránka, QR, přepnutí návodu a kopírování odkazu byly ověřeny.
- Zdrojové soubory archivu odpovídají commitu; ZIP CRC a všechny SHA-256 prošly.
- Produkční data ani aplikace se při archivaci neměnily.

## Pravidla, která zachovat při opravách

- Homepage jsou osobní čísla přihlášeného uživatele.
- Spotřeba = součet quantity; unikátní objevy = odlišné identity.
- Pivovar a dobové parametry se pro historii počítají přes beer_versions.
- Pivovar vyžaduje název a stát; všichni přihlášení mohou přidávat a upravovat.
- Úplné pivo vyžaduje název, pivovar, značku, styl a ABV nebo stupňovitost.
- Admin varování a admin režim jsou pouze pro Michala; kontroly platí i na serveru.
- Hodnocení 1-5, nevyplněno = NULL. Jeden hlas za ochutnávku bez násobení quantity.
- Historická/ukončená piva nejsou nabídkou k nové ochutnávce.
- CSV import není aktivní funkce. Pivovar dne je odstraněný.
- PWA necachuje osobní stránky, API, přihlášení ani zápisy. Offline zápisy nefrontuje.

Při další změně aktualizovat aktuální přehled a podklady k nové verzi. Soubory
archivu ze 2. 10. 2026 zachovat jako neměnný snímek; nové archivace mají nové datum.
