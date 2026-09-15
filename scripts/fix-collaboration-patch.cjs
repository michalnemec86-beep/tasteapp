const fs = require('fs');
const path = 'scripts/patch-brewery-collaborations.cjs';
let text = fs.readFileSync(path, 'utf8');
for (const token of [
  '${brewery.name}',
  '${collaborator.id}',
  '${item.breweries!.id}',
]) {
  text = text.split(token).join('\\' + token);
}
fs.writeFileSync(path, text);
console.log('Collaboration patch escaping fixed.');
