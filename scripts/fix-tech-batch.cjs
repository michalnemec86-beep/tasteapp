const fs = require('fs');
const path = 'scripts/apply-tech-batch.cjs';
let source = fs.readFileSync(path, 'utf8');

source = source.replace(
  "function replaceAllChecked(path, from, to, min = 1) {",
  "function replaceFirst(path, from, to) {\n  const input = read(path);\n  if (!input.includes(from)) throw new Error(`${path}: first-match source not found`);\n  write(path, input.replace(from, to));\n}\nfunction replaceAllChecked(path, from, to, min = 1) {"
);

source = source.replace(
  "replaceOne('app/breweries/actions.ts',\n`  const hopNames =",
  "replaceFirst('app/breweries/actions.ts',\n`  const hopNames ="
);

source = source.replace(
  "replaceOne('app/breweries/actions.ts',\n`      ibu,\\n    })\\n    .select(\"id\")\\n`,",
  "replaceFirst('app/breweries/actions.ts',\n`      ibu,\\n    })\\n    .select(\"id\")\\n`,"
);

fs.writeFileSync(path, source);
console.log('Tech patch targeting fixed.');
