# Pivník - současný stav a návaznost práce

Aktualizováno: 5. 10. 2026. Toto je výchozí přehled pro další práci na projektu.

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
