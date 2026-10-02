# Pasivní historie sortimentu – 2. 10. 2026

## Chování

- Profil pivovaru standardně načte podrobnosti současného sortimentu.
- Historický/Vše načte odpovídající položky až po přepnutí. Přímý odkaz na pivo
  nebo značku načte jen její kontext; ostatní historii není nutné otevřít.
- Historické a ukončené položky mají pasivní název, značku, styl, parametry a
  počet vypitých piv. Neobsahují odkazy, chmelové podrobnosti či přehled verzí.
- Staré ochutnávky a jejich rozbalený detail zůstávají přístupné z deníku,
  Hodnocení a statistik. Při změně výrobce se ověřuje dobová vazba přes verze.
- V uzavřeném pivovaru jsou všechny položky historické. Admin režim zachovává
  možnost opravy katalogu; historické položky nenabízejí novou ochutnávku.

## Načítání a zachování dat

Lehký index všech piv drží celkový počet piv a značek. Úplně stránkované
ochutnávky pro souhrn vracejí jen id, beer_id a quantity. Počet řádků pro editaci
a součet quantity pro spotřebu jsou samostatné hodnoty; NULL quantity znamená 1.
Počty z kontextové položky s bývalým výrobcem se nepřičítají do souhrnu pivovaru.

Seznam načítá pouze současnou recepturu zvolených piv a samostatný počet verzí;
staré receptury se načtou až v rozbaleném detailu konkrétního piva. Malé seznamy
potřebují jednu stránku na dotaz; další stránky se načítají jen po plné první
stránce. Podrobnosti piv, značek a přepínačů portfolia se nenačítají přes Link
prefetch na pozadí. Zápisové akce, oprávnění a statistické algoritmy se nemění.

## Ověření

- Všech 46 automatických testů, TypeScript a produkční build.
- Regrese pokrývají současné, historické i uzavřené portfolio, administraci,
  neklikací řádky, přímé odkazy, změny výrobce, cizí značky, deduplikaci,
  quantity a chybu při stránkování. Velké vzorky: 1 701 ochutnávek a 1 103 piv.
- Read-only SQL na produkční databázi: ukázkový otevřený pivovar id 200 má
  22 piv, z toho 14 současných. Výchozí seznam tedy načítá 14 receptur místo
  všech 39 verzí. Jde o rozsah načítaných dat, nikoli měření času vykreslení.
- PostgREST přijal dotaz s odděleným počtem verzí a filtrem současné verze
  (HTTP 200). Anonymní přístup podle RLS vrací prázdné řádky; přihlášený provoz
  a jeho rychlost se touto kontrolou neměřily.
- Bez migrace či změny uložených piv, receptur, ochutnávek a hodnocení.
- Skutečná odezva na přihlášeném telefonu zatím nebyla měřena.
