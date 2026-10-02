# Pivník

Soukromý pivní deník se společným katalogem, statistikami, hodnocením a
hospodskými oceněními. Jeden responzivní web a instalovatelná PWA pro Android/iPhone.

## Dokumentace a stav projektu

Začni [aktuálním stavem projektu](docs/project-state.md).

- [Přehled funkcí a ověření k 2. 10. 2026](docs/function-report-2026-10-02.md)
- [Obnova a opětovné spuštění](docs/restore-2026-10-02.md)
- [Kanonický datový protokol](docs/beer-data-protocol.md)
- [PWA a instalace](docs/pwa.md)

## Spuštění

Node.js 24, `npm ci`, nastavit `.env.local` s `NEXT_PUBLIC_SUPABASE_URL` a
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, potom `npm run dev`.
Pro produkci `npm run build` a `npm start`. Ověření: `node --test tests/*.test.mjs`.
Použij současný backend nebo postup obnovy; historické migrace samotné nejsou
úplnou počáteční definicí databáze. Tajné serverové klíče nepatří do klienta.
