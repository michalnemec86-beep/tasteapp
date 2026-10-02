# Navigace objektů – změna 2. 10. 2026

| Klik na název | Cíl |
| --- | --- |
| Pivovar | Profil pivovaru |
| Značka | Profil příslušného pivovaru, zvýrazněná značka a její piva |
| Pivo | Profil pivovaru, rozbalené a zvýrazněné pivo v sekci Ochutnaná piva a sortiment |
| Stát | Dosavadní profil státu `/stats/country/[country]` |
| Uživatel | Profil uživatele |
| Pivní styl | Pivní lístek s filtrem stylu |
| Chmel | Pivní lístek s filtrem chmele |

Pravidlo platí v deníku, aktivitě, statistikách, Pivním lístku a Hodnocení.
Výjimka: historické/ukončené položky v seznamu pivovaru jsou pasivní, bez odkazů
na pivo, značku a styl. Z deníku a Hodnocení lze jejich detail dál otevřít.
Osobní souhrnná čísla a analytické ovládání si zachovávají původní uživatelský kontext.
Hodnocení kategorií: název otevře objekt/výpis, skóre filtruje hodnocení.

## Historie a nejednoznačné vztahy

Při odkazu z ochutnávky je pivovar určen její historickou verzí. Pokud pivo již
není v běžném sortimentu daného pivovaru, načte se pouze zvolená položka, ověří
se její skutečná historická/zakázková vazba a otevře se uvnitř profilu. Nepřičítá
se do stávajících souhrnných čísel profilu. Nepříslušný odkaz skončí 404.
Přímý odkaz načte kontext vybraného piva nebo značky, takže historickou položku
filtr Současný neskryje a současně se nemusí načítat celé historické portfolio.

Přímý kontext značky v sortimentu nebo katalogu určuje konkrétní pivovar.
Bez kontextu se použijí existující vazby brewery_brands a katalogové výrobní
pivovary; jediný otevřený pivovar má přednost před uzavřenými. Pokud zůstává více
výrobců, resolver nabízí jejich výběr a nevymýšlí aktuálního vlastníka značky.
Nejde o samostatný profil značky. Chybějící vazba zobrazí prázdný stav.
Databázové ověření: 33 značek má více vazeb brewery_brands; 107 verzí má jiný
pivovar než kanonická identita piva. Proto není bezpečný libovolný první výrobce.

Styly/chmely zahrnují současné i historické verze. Současná karta označí shodu
pouze v historii. Při kombinaci styl + chmel musí oba údaje odpovídat stejné verzi.
Seznam používá úplné stránkované načítání katalogu a současné hledání, řazení,
filtr země a tlačítka Všechna/Ochutnaná/Moje piva.

Staré `/beers/[id]`, `/brands/[id]`, `/styles/[id]` zůstávají funkční jako
resolvery/přesměrování. Samostatná karta piva je odstraněna; její parametry a
historické odlišnosti byly přesunuty do rozbaleného detailu na pivovaru. Detail
ukazuje také deset posledních ochutnávek a jejich uživatele/hodnocení.

## Ověření a rozsah

- Automatické regresní testy, TypeScript a produkční build.
- Regrese: historické i současné filtry, kombinace různých verzí, URL/kotvy,
  starý odkaz piva, neexistující pivo a nepřihlášený uživatel.
- Read-only kontrola datových vazeb na původním Supabase.
- Bez databázové migrace, bez změn ochutnávek, identit, hodnocení či oprávnění.
- Sjednocení navigace nasazeno v PR #65; Michal potvrdil, že je aplikace v pořádku.
- [Následná úprava pasivní historie a její kontroly](passive-beer-history.md).
