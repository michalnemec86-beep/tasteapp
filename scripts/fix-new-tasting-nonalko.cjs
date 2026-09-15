const fs = require('fs');
const path = 'app/tastings/new/page.tsx';
let source = fs.readFileSync(path, 'utf8');
const from = `        ibu,\n        breweries (\n`;
const to = `        ibu,\n        is_non_alcoholic,\n        breweries (\n`;
if (!source.includes(from)) throw new Error('New tasting beer select pattern not found');
source = source.replace(from, to);
fs.writeFileSync(path, source);
console.log('Standalone new tasting page now loads is_non_alcoholic.');
