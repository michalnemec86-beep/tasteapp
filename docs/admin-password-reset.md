# Administrátorská obnova hesla

Aktualizováno: 3. 10. 2026.

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
