# Novinky na ikoně telefonu a push oznámení

Zadání 5. 10. 2026: přivést uživatele zpět do zavřené aplikace, dobrovolné
oznámení „V Pivníku jsou novinky“, nejvýše jednou denně.

## Zapnutí a chování

- Otevřít nainstalovaný Pivník z plochy, Nastavení → Novinky na telefonu →
  Zapnout oznámení. Systémové povolení se vyžádá pouze po klepnutí uživatele.
- Vypnutí je na stejném místě. Odhlášení odpojí tento telefon; další účet
  musí oznámení zapnout sám. Zapnutí je pro konkrétní instalaci, nikoli všechny
  telefony automaticky.
- Sender kontroluje novinky každých pět minut, mezi 8:00 a 22:00 Europe/Prague.
  Uživatel má společný limit jedné rezervace odeslání za 24 hodin pro všechny
  své instalace. Zpráva se doručí jeho přihlášeným zařízením. Síťová chyba
  rezervaci nezruší: přednost má zabránění duplicitnímu oznámení.
- Pouze viditelné události jiných uživatelů, novější než zapnutí a poslední
  úspěšné odeslání, které dosud nejsou přečtené v navigaci. Stejné zprávy se
  neopakují další den. Historie, vlastní příspěvky a beer_confirmed se vyloučí.
  Pravidla aktivity/katalogu odpovídají navigation_news, včetně tříměsíčního
  okna aktivity a data historických ochutnávek.
- Otevřená viditelná aplikace posílá pro zapnuté zařízení malý heartbeat nejvýše
  jednou za minutu. Odesílání začne až po deseti minutách neaktivity účtu.
- Oznámení má obecný text bez jmen a dalších osobních údajů. Klepnutí otevře
  /activity. Stejný tag/topic nahrazuje předchozí oznámení; TTL je jedna hodina.
- Ikona používá stav „jsou novinky“ (hodnota 1), protože počty sekcí se
  překrývají. Není to součet příspěvků. Po přečtení všech sekcí se ikona a
  oznámení vyčistí. Vypnutí a odhlášení je rovněž vyčistí.

## Platformy a hranice

iOS/iPadOS 16.4+ vyžaduje instalaci na plochu a povolení oznámení. Android
odvozuje značku od čekajícího oznámení. Přesný vzhled, barva, číslo či tečka a
povolení značek jsou řízené operačním systémem/launcherem; vlastní červený puntík
nelze vnutit všem telefonům. Odstranění oznámení na Androidu může odstranit i
značku, i když uvnitř aplikace ještě zůstávají nepřečtené sekce. Doručení může
ovlivnit offline režim, úspora baterie a systémové nastavení.

## Implementace a přístupy

- Nejsou nové triggery na pivních datech ani požadavky navíc pro návštěvníky bez
  zapnutých oznámení. Cron běží odděleně od zápisů a načítání stránek. Pokud
  není způsobilé zařízení s novinkami, Edge Function se vůbec nevolá.
- Zařízení jsou v neexponovaném push_private.subscriptions, RLS zapnuto, bez
  přímých grantů uživatelům i service_role. Interní funkce mají SECURITY DEFINER
  se search_path='' a jsou přístupné pouze service_role. Veřejné RPC obálky
  jsou SECURITY INVOKER, bez EXECUTE pro PUBLIC, anon či authenticated.
- VAPID podpisové klíče a náhodný dispatch token jsou šifrované v Supabase Vault;
  migrace ani frontend neobsahují soukromý klíč. Je nutné zachovat tyto Vault
  secrets při obnově backendu. Otočení VAPID klíčů vyžaduje nové subscriptions.
- push-news má verify_jwt=false kvůli Cronu s vlastním tajným tokenem. Dispatch
  ověřuje tento token porovnáním SHA-256 v konstantním počtu kroků. Uživatelské
  akce vždy ověřují session přes Auth /user; nepřebírají ID z request body.
- Přijímají se jen HTTPS endpointy FCM, Apple a Mozilla bez userinfo, portu a
  fragmentu; podpisové/encryption klíče se validují. Odesílač není obecný HTTP
  klient. Výsledky 404/410 odstraní pouze tutéž rezervovanou subscription.
- Opaque device token v IndexedDB service workeru brání opožděnému pushi po
  odhlášení, vypnutí nebo změně účtu obnovit značku. Personalizované stránky,
  session/tokeny Auth a zápisy se stále necachují. Výjimečný push již v letu
  po odhlášení se zahodí; aktivní subscriptions vždy zobrazují oznámení.
- Cron historie tohoto úkolu se promazává po sedmi dnech.

## Ověření

- Automatické testy: ověření účtu, oddělení dispatch autentizace, endpointy a
  klíče, veřejný klíč bez úniku tajemství, selhání/dead endpoints, aktuální
  souhlas zařízení, otevření pouze vlastní stránky, vyčištění ikony a práce
  bez síťových požadavků u vypnuté funkce. Původní PWA cache testy zůstávají.
- Prošlo všech 69 automatických testů, TypeScript, lint změněných klientských
  souborů a produkční build. Lokální Deno check prošel s import mapou do stejné
  připnuté knihovny stažené přes npm (přímý Deno download byl síťově blokován).
  Skutečná web-push@3.6.7 knihovna také prošla šifrováním/dešifrováním payloadu
  a VAPID podpisem s dočasnými klíči bez kontaktování push poskytovatele.
- tests/sql/push-news.sql ověřuje oprávnění, osobní/viditelné události, aktivní
  zařízení, denní rezervaci sdílenou mezi telefony, přečtené sekce a bezpečné
  přepnutí vlastníka. Všechny fixtures a návštěvy se vracejí ROLLBACKem.
- Živý autorizovaný dispatch vrací HTTP 200 s nulou příjemců; nikdo nebyl
  automaticky přihlášen. Nepřihlášený request vrací HTTP 401.
- Security advisors: žádné nové varování; INFO RLS bez policy u soukromé tabulky
  je záměrný zákaz přímého přístupu. Původní dvě legacy veřejné definer funkce
  a vypnutá leaked-password ochrana zůstávají mimo rozsah změny.
- Skutečné doručení na fyzickém iPhonu/Androidu vyžaduje uživatelské zapnutí a
  následnou novinku; dosud nebylo ověřeno. Simulace není fyzický test telefonu.

Oficiální podklady: [WebKit badging](https://webkit.org/blog/14112/badging-for-home-screen-web-apps/),
[Chrome Badging API](https://developer.chrome.com/docs/capabilities/web-apis/badging-api),
[Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions),
[Vault](https://supabase.com/docs/guides/database/vault),
[web-push](https://github.com/web-push-libs/web-push).

## Oprava aktivace a spuštění 5. 10. 2026

Uživatel nahlásil neúspěšné zapnutí a dlouhý start. Živý register_push_news
v 08:41 UTC úspěšně zapsal zařízení a vrátil HTTP 204. Edge helper následně
volal response.json() nad prázdnou odpovědí, vyhodil chybu a klient odpojil
browser subscription. Pomocná RPC cesta nyní přijímá 204 / prázdné tělo jako
úspěch. Platí to i pro heartbeat, vypnutí a potvrzení úspěšného doručení.
Regresní testy používají skutečný tvar prázdné odpovědi místo JSON null.

Pro start jsou omezené zbytečné návaznosti: layout, homepage a profil sdílejí
jediné Auth getUser ověření uvnitř serverového renderu přes React.cache, který
se invaliduje mezi požadavky. Osobní data ani session se globálně necachují.
Čtení počítadel je samostatný privátní GET /api/navigation-news, mimo sekvenční
frontu Server Actions; potvrzení návštěvy dál používá původní ověřenou akci.
Úvodní překryv zmizí i při pomalé hydrataci do 1,38 sekundy od načtení jeho CSS.
Push požadavky mají desetisekundový síťový limit. Statistiky, RLS, cookies a
osobní čísla se nemění. Přesný čas startu na fyzickém telefonu nebyl změřen;
tyto změny nejsou tvrzením, že byla potvrzena jediná příčina celého zpoždění.

Ověření opravy: 72 automatických testů, TypeScript, produkční build a lint
změněných klientských/serverových souborů prošly. Test skutečného React server
renderu ověřuje jeden Auth dotaz pro tři komponenty a oddělené účty při dalším
požadavku. GET testy ověřují autorizaci, zákaz cache a zachování přesného času
pro potvrzení návštěvy. Doručení na fyzickém telefonu se tímto neověřilo.
