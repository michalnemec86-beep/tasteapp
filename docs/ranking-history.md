# Návrat do rozbaleného žebříčku – 5. 10. 2026

## Nahlášený scénář a příčina

Desktop: Co a jak pijeme → Pivovary → celý seznam → profil pivovaru →
Zpět v prohlížeči. Očekávání: otevřený celý seznam, pak přehled statistik.
Původně RankingCardClient držel otevření jen v lokálním useState, bez URL a
historie. Po odchodu na detail a návratu se obnovil přehled se zavřeným dialogem.

## Změna

Otevřený žebříček určuje query parametr ranking (stabilní anchorId).
Otevření přidá jeden vlastní krok přes nativní History API integrované s Next.js
useSearchParams; nezpůsobí nový serverový dotaz na statistiky. Detail ponechá
URL seznamu v historii. Zpět a Dopředu přirozeně obnoví odpovídající dialog.
Před hydratací se portál nerenderuje; SSR ani přímý odkaz nepřistupují k document.

Křížek, Escape a klik mimo dialog spotřebují vlastní krok přes history.back().
Pokud byl dialog otevřen přímým odkazem nebo je jeho URL pozměněná, zavření
odstraní parametr přes replaceState místo odchodu na neznámou předchozí stránku.
Do nativního pushState se předává jen vlastní značka; nekopírují se interní
Next.js příznaky, které by přeskočily synchronizaci URL.

Platí pro piva, značky, pivovary, styly, státy a chmely v Co a jak pijeme
na desktopu, mobilním webu i PWA. Filtry, řazení a kotva zůstávají v URL.
Ostatní modaly a analytické filtry nejsou tímto plošně přepisované.
Vzhled, agregace statistik, databáze a oprávnění se nemění.

## Ověření a hranice

Čtyři nové regrese prošly ve spustitelné JavaScriptové simulaci historie nad
skutečnými funkcemi lib/ranking-dialog-history.js: detail → seznam → přehled
a Dopředu, zavření a opětovné otevření bez hromadění kroků, přímý/pozměněný
odkaz, opakované otevření a rozdílné kódování hledaného textu.

Scénáře jsou také přidané do tests/navigation.test.mjs. Celý Node test suite a
lokální lint nebyly při této opravě spuštěné, protože pracovní prostředí
nenaběhlo. TypeScript a produkční sestavení ověřuje Vercel při nasazení.
Skutečný přihlášený prohlížeč a fyzický telefon zde nebyly ověřené.

Podklad: [Next.js Native History API](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api).
