# Zápis ochutnávky: odezva a ochrana před dvojklikem

Datum: 8. 10. 2026

## Příčina
Formulář nové ochutnávky dříve používal serverovou akci bez stavu načítání
a bez blokování opakovaného odeslání. Rychlý dvojklik mohl vytvořit
dva samostatné řádky v `public.tastings`.

## Oprava
- Formulář při platném odeslání synchronně uzamkne opakované spuštění
  pomocí `useRef`. Při chybě lze odeslání opakovat.
- Vnořené tlačítko používá React `useFormStatus`, během odesílání
  zobrazí animaci a text „Ukládám ochutnávku…“ a je zakázané.
- Jeden otevřený formulář má jeden stabilní `submissionId` (UUID), který
  zůstane stejný i po selhání spojení nebo odpovědi.
- Server nejprve kontroluje, zda už stejný uživatel a `submission_id`
  ochutnávku nevytvořili. Pokud ano, považuje opakování za úspěšné.
- Databázový unikátní index na `(user_id, submission_id)` poskytuje ochranu
  i při souběžných serverových požadavcích. Odpověď s konfliktem se
  uzná jen tehdy, když daná ochutnávka skutečně existuje pod daným
  uživatelem a identifikátorem.
- Starší verze klienta bez identifikátoru zůstávají kompatibilní.
  Jejich ukládání však není chráněno proti dvojkliku na databázové vrstvě.

## Záměrně beze změny
- Staré ochutnávky se nepřepisují, nemažou ani nezlučují.
- Stejný uživatel může stejné pivo v tentýž den uložit vícekrát
  jako různé skutečné ochutnávky z různých otevření formuláře.
- Počítání `quantity`, dobové verze piv a oprávnění RLS zůstávají beze změny.
- Duplicitní historické importy se automaticky neslučují.
- Offline zápisy ani čekající fronta se nezavádějí.

## Ruční regresní scénáře
1. Otevřít novou ochutnávku, vyplnit ji a dvakrát rychle stisknout Uložit.
   Ověřit jediné uložení a jediný přírůstek `quantity`.
2. Zpomalit mobilní spojení. Po první akci ihned zobrazit
   „Ukládám ochutnávku…“, spinner a zakázané tlačítko.
3. Simulovat ztracenou odpověď po úspěšném zápisu, zopakovat požadavek
   s týmž `submissionId` a ověřit, že se žádný další řádek nevytvoří.
4. Otevřít nový formulář a záměrně zapsat další stejné pivo téhož dne:
   druhá, samostatná ochutnávka musí vzniknout.
5. Otestovat přidání nového piva a selhání katalogového ověření:
   formulář dovolí retry, ale nezaloží duplicitní ochutnávku.
6. Zkontrolovat obě vstupní cesty: hlavní modal i samostatnou stránku.
   Ověřit Android a iOS PWA.

Při nasazení byl před migrací kontrolní stav databáze 2 560 řádků,
součet quantity 2 860 a nulový počet ochutnávek bez beer_version_id.
