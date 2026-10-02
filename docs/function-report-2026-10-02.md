# Pivník - funkční a technický report

## Archiv aplikace Pivník

Funkční a technický report | stav k 2. 10. 2026

Pivník je soukromý pivní deník se společným katalogem piv, značek a pivovarů. Mobilní a desktopová podoba tvoří jeden web; instalovatelná PWA používá stejné účty a současný mobilní vzhled.

### Stav předání

Michal označil základní podobu aplikace za hotovou. Další vývoj má řešit případné opravy podle uživatelských komentářů. Instalaci a běh na iPhonu potvrdil 2. 10. 2026. Skutečná instalace na Androidu ještě nebyla potvrzena.

| Položka | Referenční stav |
| --- | --- |
| Produkce | tasteapp-eosin.vercel.app |
| Repozitář | michalnemec86-beep/tasteapp |
| Produkční commit | 65ed1f0f6938 |
| Supabase projekt | nsnvryyocwzfwxiwhqca |
| Zdrojové soubory | 260 souborů |
| Datový snímek | 54 tabulek / 34 475 řádků |
| Grafika ve Storage | 50 souborů, všechny staženy |

### Co balík obsahuje

Kompletní sledovaný zdrojový kód, přesné závislosti, místní grafiku, migrace, testy, Git historii, aktuální databázové definice, aplikační i historická auditní data, Storage soubory, nasazené serverové funkce a návod obnovení.

> Jde o archiv aplikace a jejích dat. Tajné klíče, hesla, Auth sessions a aktivní zvací odkazy nejsou součástí. Pro zachování přihlášení při přesunu je potřeba samostatná záloha Auth nebo nové nastavení účtů.

## Osobní deník a ochutnávky

### Můj pivní deník

Homepage patří přihlášenému uživateli. Hlavní počty a jejich prokliky jsou osobní. Deník nabízí přehled vypitých piv, pivovarů, značek, stylů, zemí, způsobu podání, časové aktivity a hospodských ocenění. Obsahuje vyhledávání, řazení a filtrované podstránky.

### Zapsání ochutnávky

Hlavní zadávání probíhá v modalu. Výběr navazuje pivovar -> značka -> pivo; našeptávání pomáhá najít existující záznam. Formulář pracuje s datem, počtem piv, podáním/obalem, stupňovitostí či ABV, volitelně IBU, chmely, místem, poznámkou a hodnocením. Z karty piva se mají údaje předvyplnit.

Uživatel může upravit nebo smazat své ochutnávky. Vlastnictví ověřuje server i databázová pravidla. Úprava ochutnávky vybírá existující katalogové pivo a nepřepisuje jeho společné údaje. Smazání ochutnávky nesmaže společné katalogové pivo.

### Historie a počítání

Jedna ochutnávka může představovat více vypitých piv. Pole quantity se sčítá do spotřeby; unikátní piva, značky a pivovary se počítají bez násobení. Pořadí v deníku vychází z data ochutnání. Záznamy importované v minulosti zůstávají ve statistikách i při skrytí z timeline.

### Mobilní ovládání

Modaly mají ukotvené záhlaví s křížkem, kompaktnější rozestupy a blokování rolování stránky na pozadí. Navigace oznamuje načítání. Mobilní sekce používají přizpůsobené velikosti písma, tlačítek a carousely.

| Snímek aktivních dat | Počet |
| --- | --- |
| Uživatelské profily | 9 |
| Ochutnávky - záznamy | 2 551 |
| Součet vypitých jednotek | 2 846 |
| Ochutnávky s hodnocením | 0 |

> Počty jsou globální databázový snímek, nikoli počty Michalova osobního deníku. Nula hodnocených záznamů znamená, že ve chvíli exportu nebyla vyplněna hodnocení; funkce hodnocení je nasazená a otestovaná.

## Společný katalog a oprávnění

### Pivní lístek, pivovary, značky a styly

Katalog poskytuje vyhledávání, filtry a detailní karty. Pivovar obsahuje značky, sortiment, logo, zemi a volitelné kontaktní/geografické údaje, historické názvy a vazby. Sortiment se přepíná mezi současným, vším a historickým. Evidovány jsou i létající pivovary, kolaborace a partnerské vztahy.

Historické či ukončené pivo a pivo z uzavřeného pivovaru není dostupné k novému zápisu ochutnávky. Historické záznamy a související statistiky zůstávají zachovány.

### Automatická úplnost údajů

| Entita | Podmínky |
| --- | --- |
| Pivovar | Název + stát. Samostatná ruční verifikace není nutná. |
| Pivo | Název + pivovar + značka + styl + ABV nebo stupňovitost. |
| Nehodnocené pivo | Žádná hvězda = NULL; nevstupuje do průměrů hodnocení. |

Historické ruční potvrzení piva již není podmínkou automatické úplnosti. Kontrola stejné úplnosti platí v katalogu, detailech i našeptávání. Administrátorský vykřičník vidí jen Michal v admin zobrazení.

### Rozdělení oprávnění

| Oblast | Běžný uživatel | Michal / správce |
| --- | --- | --- |
| Ochutnávky | Vlastní zápis, úprava, smazání | Vlastní deník + správa katalogu |
| Pivovary | Přidání a úprava | Navíc logo, souřadnice a mazání |
| Styly a chmely | Přidávání | Úprava a mazání |
| Katalogové položky | Přidávání dle formulářů | Správa piv, značek a vazeb |
| Pozvánky a režim správy | Bez administrace | QR, založení účtu, zrušení, admin režim |

> Serverové kontroly a Row Level Security jsou rozhodující. Skrytí ovládacího prvku není samo o sobě zabezpečením. Admin UUID je pevně navázané v kódu i databázových pravidlech.

Katalogový snímek: 2 737 piv, 1 139 značek, 936 pivovarů, 125 stylů, 161 chmelů a 200 zemí. Počet evidovaných zemí zahrnuje slovník, ne pouze navštívené země.

## Statistiky a hodnocení

### Co a jak pijeme

Společné statistiky nabízejí výběr uživatele a období, hledání, řazení a žebříčky piv, značek, pivovarů, stylů, chmelů, zemí a způsobů podání. Další karty ukazují aktivitu, rekordy a technické hodnoty. Mapy a prokliky otevírají související filtrované pohledy.

### Pravidla agregací

| Statistika | Cesta a význam |
| --- | --- |
| Pivo | Ochutnávka -> beer_id |
| Značka | Ochutnávka -> pivo -> brand_id |
| Pivovar / země | Ochutnávka -> historická verze -> pivovar |
| Styl / chmely | Verze ochutnaného piva; náhradně současný katalog |
| Spotřeba | Součet quantity; ne počet řádků |
| Unikátní objevy | Odlišné identity bez násobení quantity |

Historická verze chrání dobové zařazení piva. Pozdější změna současného výrobce nemá přičíst historickou ochutnávku jinému pivovaru. Kolaborant se nesčítá jako druhý výrobní pivovar téže ochutnávky. Technické hodnoty používají čísla zaznamenaná u ochutnávky; chybějící čísla se nezaměňují s nulou.

### Hodnocení ochutnávky

Formulář obsahuje 1 až 5 hvězd. Nevyplněné hodnocení není nula a nevstupuje do průměrů. Stránka Hodnocení zobrazuje 10 nejlepších a 10 nejhorších piv, průměr a počet hodnocení, přehled posledních recenzí a žebříčky kategorií.

Filtry se kombinují podle země, stylu, podání/obalu a vybraného piva. Kategoriální boxy přepínají nejlepší/nejhorší; mobil využívá carousely. Timeline ukazuje hvězdy u hodnocené ochutnávky.

> Každá hodnocená ochutnávka má v průměru jeden hlas bez ohledu na quantity. Není zaveden minimální počet hlasů pro umístění; při shodě průměrů má přednost vyšší počet hodnocení a stabilní abecední pořadí.

## Aktivita, štamgasti a ocenění

### Aktivita v hospodě

Timeline kombinuje nové ochutnávky, hospodská ocenění a vybrané systémové události katalogu. Příspěvek ukazuje uživatele, datum, podání, pivo, pivovar, styl, zemi a známé technické údaje; hodnocené záznamy doplňují hvězdy. Nové katalogové záznamy používají současnou ikonografii a zelené NEW.

Historické importy a administrativní doplnění nemají zaplavovat timeline. Viditelnost záznamu v timeline je samostatná od jeho účasti ve statistikách. Mobilní stránkování udržuje přehled krátký a čitelný.

### Štamgasti

Přehled uživatelů vede na jejich profily s pivními statistikami a objevy. Primární jméno je přezdívka, vedlejší jméno je doplňkové. Vlastní homepage a osobní podstránky používají uživatelsky omezené statistiky.

### Hospodské ocenění

| Kategorie | Sledovaný pokrok |
| --- | --- |
| První ochutnávka | První způsobilý záznam |
| Pivní objevy | Různá piva |
| Pivovarský průzkumník | Různé pivovary |
| Lovec stylů | Různé styly |
| Chmelový znalec | Různé chmely |
| Světoběžník | Různé země |

Stupně používají vlastní medaile od prvních úrovní až po vyšší ocenění. Získaný stupeň je trvalý; pozdější odstranění ochutnávky jej nesnižuje. Pokrok se vyhodnocuje podle data spuštění systému definovaného v kódu.

Nové ocenění vyvolá kompaktní grafické oznámení. Klepnutí mimo medaili oznámení zavře a potvrzení se uloží, aby se neopakovalo. Stránka ocenění používá schválenou vlastní fotografii hospodského stolu s mapou a pivními předměty.

### Vizuální systém

Tmavé pozadí, měděné a zlaté lesklé rámy, žluté hlavní názvy, světlý text, zelené důležité akce a stínované realistické piktogramy. Grafika, velikosti textů a navigace jsou sladěny pro mobil i desktop.

## Účty, instalace a provoz

### Účty a pozvánky

Přihlášení zajišťuje Supabase Auth. Uživatel upravuje svou přezdívku a doplňkové jméno, může změnit heslo. Admin připravuje QR/e-mailový zvací odkaz nebo zakládá účet s dočasným heslem. Pozvánky lze spravovat a zrušit; již registrovaní uživatelé nemají vystupovat jako otevřené pozvánky.

Tři Edge Functions oddělují administraci pozvánek, jejich uplatnění a dokončení úvodního nastavení hesla. Auth cookies synchronizuje serverový proxy a klient obnovuje stav po návratu do dlouho otevřené aplikace.

### Jedna PWA pro Android i iPhone

Veřejná stránka /install je dostupná i před přihlášením. V desktopu ukazuje místně generovaný QR kód, v telefonu postup podle platformy. Android může nabídnout přímé instalační tlačítko podle prohlížeče; iPhone používá přidání na plochu přes Safari.

Manifest má stabilní identitu a start /, režim standalone, vlastní ikony a spouštěcí obrazovku. Aplikace běží se stejným účtem. Instalace je zpřístupněná v menu, na přihlašovací stránce a desktopovou ikonou.

### Chování bez připojení

Service worker ukládá jen veřejnou offline stránku, její skript a ikony. Osobní HTML, API, přihlašovací tokeny a zápisy ochutnávek necachuje. Výpadek oznamuje banner; není zavedena fronta offline zápisů. Uložení a načítání aktuálních statistik vyžaduje internet.

> iPhone: uživatel potvrdil instalaci a běh. Android: kód a instalační postup jsou připravené; fyzické ověření zatím chybí. Aktualizace aplikace nevyžadují rozesílání APK nebo nové instalační balíčky.

### Externí služby

GitHub uchovává kód, Vercel hostuje Next.js, Supabase spravuje PostgreSQL, Auth, Storage a Edge Functions. Je nutné zachovat vlastnický přístup k těmto účtům. Mapové podklady a případné externí odkazy vyžadují dostupnost jejich zdrojů.

## Technické předání a ověření

### Technologie a členění

Node.js 24, Next.js 16.3.1, React 19, TypeScript, App Router, Server Components, Server Actions, Supabase SSR/PostgreSQL, vlastní CSS, Radix UI, Lucide, Leaflet a mapové komponenty. Přesné verze určuje přiložený lockfile.

| Umístění | Účel |
| --- | --- |
| app/ | Stránky, modaly, serverové akce, navigace, PWA |
| lib/ | Výpočty, hodnocení, úplnost katalogu, oprávnění |
| components/ a public/ | Sdílené UI, piktogramy, fotografie, offline soubory |
| database/ a supabase/ | Historické migrace a serverové funkce |
| tests/ | 28 automatických testů |
| databaze/ v archivu | Snímky dat, definic a reference SQL obnovy |

### Aktuální ověření

Při archivaci znovu prošlo všech 28 automatických testů: úplné stránkované načítání, výpočty statistik, historické verze, pravidla dostupnosti piv, hodnocení, admin oprávnění, úplnost údajů, oznámení ocenění a chování PWA cache.

Produkční build a nasazení tohoto commitu prošly při dokončení PWA dne 2. 10. 2026. Byla ověřena živá instalační stránka, QR kód, návody Android/iPhone, kopírování odkazu, manifest a veřejné offline soubory. Osobní stránky zůstávají chráněné přihlášením.

### Rozsah a hranice archivu

Aplikační data z 54 tabulek byla přečtena jedním SQL příkazem. Struktura, oprávnění a Storage byly pořízeny samostatně v témže archivačním běhu. Archiv nepředstavuje atomický snímek celého poskytovatele. Žádný zápis do produkce nebyl v rámci archivace proveden.

Záloha neobsahuje node_modules, .next a přechodné buildy: obnoví je npm ci a npm run build. Neobsahuje ani tajné environment hodnoty, plnou Auth databázi, interní databáze poskytovatele, aktivní zvací odkazy či úplné nastavení hostingu.

> Referenční SQL obnova je syntakticky ověřená rekonstrukce. Obnova do nového Supabase projektu nebyla provedena. Pro skutečný přesun je nutné obnovit Auth/mapování UUID, Storage a konfiguraci a vykonat samostatný test obnovy.

## Obnova a následná údržba

### Nejrychlejší opětovné spuštění

Se zachovaným původním Supabase stačí zdrojový kód, Node.js, dvě NEXT_PUBLIC proměnné, npm ci a produkční sestavení. Přístupy a databáze zůstávají v původním projektu. Podrobný postup je v OBNOVA-A-SPUSTENI.md.

### Přenos do nového projektu

Připravit nový backend, obnovit Auth se stejnými UUID nebo všechny uživatelské vazby přemapovat, obnovit aktuální strukturu a data, nahrát Storage soubory, nasadit Edge Functions a upravit URL. Referenční SQL baseline nekombinovat s historickými migracemi.

Původní docs/tasteapp-overview.md popisuje starší stav a je zachován jako součást přesného kódu. Pro stav k 2. 10. 2026 používat tento report a aktuální zdrojové soubory. Dnes odstraněné CSV importy ani Pivovar dne nejsou aktivními funkcemi.

### Postup pro uživatelské komentáře

U každé chyby uchovat datum, zařízení/prohlížeč, konkrétní stránku, kroky k reprodukci, očekávaný a skutečný výsledek. Po opravě ověřit dotčenou funkci a související statistiky, provést testy/build a nasazení. Změna pravidel počítání nebo oprávnění vyžaduje kontrolu historických dat a RLS.

### Kontrola před novou archivací

Zapsat nový commit a datum, aktualizovat snímek dat i grafiky, ponechat předchozí archiv, zkontrolovat SHA-256 a úspěšné rozbalení. Při změně API, Auth nebo obnovovacích nástrojů ověřit aktuální dokumentaci. Přístupové údaje uchovávat odděleně od sdíleného reportu.

### Oficiální podklady pro obnovu

Supabase: Backup and Restore using the CLI; Database Backups; The Storage Schema. Odkazy jsou uvedeny v přiloženém návodu. Databázová záloha sama nezahrnuje binární Storage soubory, proto jsou v tomto ZIPu přiloženy zvlášť.

> Uzavřený základní stav neznamená slib bezchybnosti všech scénářů. Report odděluje implementované funkce, automatické ověření, uživatelské potvrzení i dosud neprovedenou fyzickou instalaci na Androidu a test obnovy.
