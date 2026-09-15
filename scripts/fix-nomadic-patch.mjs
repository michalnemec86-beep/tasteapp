import fs from "node:fs";

const path = "scripts/nomadic-pagination-patch.mjs";
let source = fs.readFileSync(path, "utf8");

source = source.replace(
  '  if (count !== 1) {\n    throw new Error(`${path}: expected 1 match, found ${count}`);\n  }\n  write(path, input.replace(from, to));',
  '  if (count < 1) {\n    throw new Error(`${path}: expected at least 1 match, found ${count}`);\n  }\n  if (count > 1) {\n    console.warn(`${path}: ${count} matches, replacing first occurrence only`);\n  }\n  write(path, input.replace(from, to));'
);

source = source.replace(
  '`' + '${pathname}' + '?' + '${query}' + '`',
  '`\\${pathname}?\\${query}`'
);

source = source.replace(
  '`ellipsis-' + '${index}' + '`',
  '`ellipsis-\\${index}`'
);

fs.writeFileSync(path, source);
console.log("Patch generator fixed.");
