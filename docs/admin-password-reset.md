# Administrátorská obnova hesla

Aktualizováno: 6. 10. 2026.

## Účel

Správce může v Nastavení obnovit přístup existujícímu aktivnímu uživateli bez
mazání Auth účtu nebo profilu. Tato cesta je určená pro případy, kdy uživatel
zapomene heslo nebo nezvládne standardní obnovu.

## Chování

- Reset je dostupný jen pevně určenému správci Pivníku a kontrola probíhá v
  Edge Function `admin-invitations`.
- Správce zadá e-mail aktivního účtu a nové dočasné heslo o délce 10 až 128 znaků.
- Auth UUID uživatele se nemění. Profil, ochutnávky, ocenění a katalogové vazby
  proto zůstávají beze změny.
- Edge Function nastaví nové heslo přes Supabase Auth Admin API a přidá
  `must_change_password=true` do `app_metadata`.
- Po přihlášení dočasným heslem login uživatele přesměruje na
  `/auth/update-password?first=1`. Po úspěšném nastavení vlastního hesla
  funkce `complete-initial-password` příznak odstraní.
- Reset správce samotného je touto cestou zablokovaný. Správce používá standardní
  změnu hesla ve vlastním nastavení.
- Aktivní QR pozvánky pro stejný e-mail se při resetu zneplatní.
- Dočasné heslo se v aplikaci neukládá v čitelné podobě; po resetu je zobrazené
  jen v aktuálním prohlížeči pro předání uživateli.

## Ověření

Před nasazením ověřit:

1. TypeScript/Next.js build.
2. Stávající automatické testy.
3. Backend odmítne neexistující účet, čekající neaktivní registraci a reset správce.
4. Aktivní účet po resetu zachová stejné UUID.
5. Přihlášení dočasným heslem vede na povinné nastavení vlastního hesla.
6. Po dokončení už `must_change_password` není aktivní.

## Oprava dokončení změny (3. 10. 2026)

Mobilní prohlížeč po úspěšném uložení hesla nedokončil obnovu přístupu:
`complete-initial-password` vracela na CORS preflight OPTIONS stav 405.
Heslo bylo uložené, ale příznak povinné změny zůstal aktivní.

- Funkce nyní zpracuje OPTIONS bez ověřování uživatele a vrací CORS hlavičky
  i u úspěšných a chybových odpovědí; POST stále ověřuje přihlášeného uživatele.
- Formulář po uložení vymaže heslo z paměti a při selhání dokončení nabídne
  opakování tohoto kroku bez další změny hesla v rámci otevřeného formuláře.
- Přesměrování proběhne až po úspěšném obnovení relace. Při obnovení celé
  stránky se stav formuláře neuchovává.
- Automatické testy ověřují skutečný handler OPTIONS, odmítnutí chybějícího
  i neplatného přihlášení, zachování metadat, opakovatelnost dokončení,
  serverovou chybu a opakování formuláře bez druhého zápisu hesla.
- Nasazená serverová verze 2: živý OPTIONS z produkčního originu vrací 204
  a povoluje POST i všechny hlavičky používané klientem.
- Lokální ověření: všech 61 automatických testů a produkční Next.js build prošly.

U jednoho dotčeného účtu byl po ověření úspěšné změny hesla v Auth logu
ručně dokončen pouze příznak povinné změny. UUID, uložené heslo a profil
zůstaly zachované. Osobní přihlašovací údaje do dokumentace nepatří.


## Jednotné první nastavení (6. 10. 2026)

Původní oprava uchovávala dokončení pouze v paměti formuláře. Ztracená odpověď
nebo reload mezi klientským updateUser a dokončením mohly zanechat změněné heslo
s must_change_password=true. Nový formulář při povinné změně předává heslo přímo
funkci complete-initial-password. Ta ověří aktuálního uživatele přes Auth /user,
a v jednom PUT /admin/users/<ověřené UUID> uloží password a app_metadata.
Supabase Auth aplikuje tento update v databázové transakci.

- UUID se odvozuje výhradně z ověřeného tokenu. Cizí UUID ani metadata z těla
  požadavku se nepoužívají. Ostatní app_metadata se zachovávají.
- Pokud povinná změna už skončila, funkce vrátí úspěch bez dalšího zápisu hesla.
  Parametr first=1 drží formulář v tomto režimu i po reloadu; nemá autorizační vliv.
- Admin API samo nezakazuje stejné heslo. Funkce proto nejprve ověří kandidáta
  proti Auth password grant pro e-mail ověřeného volajícího. Pouze explicitní
  invalid_credentials dovolí nové heslo uložit. Síťové chyby, CAPTCHA a rate limit
  nic nezmění. Při shodě je odmítnuto současné heslo a ověřovací session je odhlášena
  pouze se scope=local, bez odhlášení původní relace.
- Neznámý výsledek zápisu nesděluje uživateli nepravdivě, že heslo určitě bylo
  uložené. Opakování ověří stav na serveru. Po potvrzeném zápisu se vstupy vymažou
  a případné opakování obnovuje jen relaci. Přesměrování čeká na čerstvá metadata.
- Běžná obnova zapomenutého hesla bez povinné změny nadále používá updateUser.
- Prázdné staré požadavky nesmějí zrušit povinnou změnu. Starší otevřený formulář
  je potřeba po nasazení znovu načíst.

Ověření: 90 automatických testů a produkční Next.js build prošly. Jedenáct testů
hesla spouští skutečný handler a formulář s kontrolovanými Auth odpověďmi: CORS,
neplatné přihlášení, atomický obsah zápisu, zachování metadat, opakování, odmítnutí
současného hesla, uzavření jen ověřovací session, selhání Auth/rate limitu,
ztracená odpověď po commitnutí + reload, obnova relace a běžná obnova hesla.
Nejde o přihlášení reálného uživatele na fyzickém telefonu.

Read-only kontrola produkce našla jeden starší účet s přihlášením a stále
aktivní povinnou změnou. Auth log uvádí úspěšné PUT /user, ale neobsahuje jednoznačný
popis změněného pole. Příznak nebyl automaticky vymazán: uživatel může bezpečně
nastavit jiné heslo, čímž nový postup dokončí oba kroky současně. Žádný profil,
ochutnávka ani statistika nebyly při této opravě upravovány.
