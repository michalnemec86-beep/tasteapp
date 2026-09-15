const fs = require('fs');
const path = 'scripts/patch-brewery-collaborations.cjs';
let text = fs.readFileSync(path, 'utf8');

for (const token of [
  '${brewery.name}',
  '${collaborator.id}',
  '${item.breweries!.id}',
  '${version.breweries.id}',
]) {
  text = text.split(token).join('\\' + token);
}

const protocolStart = "  fs.appendFileSync(protocol, `\\n\\n## Kolaborace pivovarů";
const start = text.indexOf(protocolStart);
if (start !== -1) {
  const endMarker = "\\n`);";
  const end = text.indexOf(endMarker, start);
  if (end === -1) throw new Error('Protocol append end not found');

  const replacement = [
    "  fs.appendFileSync(protocol, [",
    "    '',",
    "    '',",
    "    '## Kolaborace pivovarů',",
    "    '',",
    "    '- Hlavní výrobní pivovar je vždy jediný `beer_versions.brewery_id` a pouze tento pivovar vstupuje do statistik pivovarů.',",
    "    '- Spolupracující pivovary se ukládají přes `beer_version_collaborators`; vazba je verzovaná, protože kolaborace může platit jen pro konkrétní várku nebo období.',",
    "    '- Kolaborant se zobrazuje doplňkově za hlavním pivovarem ve formátu `Hlavní pivovar + Kolaborant`.',",
    "    '- Kolaborant se nikdy nepřičítá jako druhý pivovar do pivovarské statistiky stejné ochutnávky.',",
    "    '- Jedna verze může mít více kolaborantů; pořadí zobrazení určuje `display_order`.',",
    "    '',",
    "  ].join('\\n'));",
  ].join('\n');

  text = text.slice(0, start) + replacement + text.slice(end + endMarker.length);
}

fs.writeFileSync(path, text);
console.log('Collaboration patch escaping fixed.');
