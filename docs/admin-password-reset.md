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
