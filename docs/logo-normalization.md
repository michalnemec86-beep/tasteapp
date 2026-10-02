# Jednotná loga pivovarů

Změna 2. 10. 2026: všechna uložená loga používají společný AutoLogoFrame, včetně
profilů, statistik, žebříčků, hodnocení, administračního náhledu a podtácku pivovaru.
Podtácek zůstává kruhový i na mobilu; obvodový materiál a rámeček zůstávají zachované.

Server z veřejného originálu připravuje 384 × 384 WebP. Malý pracovní rastr zachová
proporce, rozpozná průhledné nebo téměř jednotné okraje, ořízne prázdné místo a
vyplní vnitřek barvou podkladu. Průhledná loga mají tmavý podklad #17130f; převážně tmavá kresba dostane světlý
podklad #f0ebe2, aby nezanikala. Nejednotné
okraje se konzervativně neořezávají. Skutečná kresba se vejde do kruhu s 8% mezerou
na každé straně, proto se neořezávají rohy čtvercových ani dlouhých log.

Souběžné žádosti o totéž logo sdílejí jedno zpracování.
Výsledek má serverovou i HTTP mezipaměť 24 hodin a sdílí se mezi všemi zobrazeními.
Nové nahrání má již existující parametr v, a tedy samostatný klíč mezipaměti.
Při selhání zpracování komponenta automaticky zobrazí původní obrázek proporčně.
Externí kandidáti před uložením používají stejný rámeček a contain; plná normalizace
se uplatní po uložení do vlastního Storage, aby server nestahoval libovolné URL.

Endpoint /api/brewery-logo.webp připouští jen HTTPS origin nastaveného Supabase,
veřejný bucket brewery-logos a objekt <číselné ID>/logo. Nepovoluje přesměrování,
jiné query parametry než číselné v, soukromé buckety ani libovolné externí adresy.
Stahování je omezeno na 2 MB / 8 sekund a dekódování na 16 milionů pixelů.
Veřejné obrázky nepotřebují auth; osobní stránky a API zůstávají chráněné.
Service worker tyto odvozené obrázky neukládá do offline cache.

Původní loga, logo_url, databáze, osobní počty a archiv ze 2. 10. 2026 se nemění.
Ověření: tests/logo-normalization.test.mjs pokrývá povolené zdroje, barvy podkladu,
ořez prázdných okrajů, průhlednost, široká i kruhová loga, bezpečný okraj a poškozené
obrázky. Spustit node --test tests/*.test.mjs a npm run build.

Všech 91 aktuálních produkčních log bylo zpracováno bez chyby. Jejich velikost
klesla z 4,20 MB přibližně na 1,08 MB; výsledky byly vizuálně prohlédnuté.
