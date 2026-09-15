import fs from "node:fs";

const path = "scripts/nomadic-pagination-patch.mjs";
let source = fs.readFileSync(path, "utf8");

source = source.replace(
  '  if (count !== 1) {\n    throw new Error(`${path}: expected 1 match, found ${count}`);\n  }\n  write(path, input.replace(from, to));',
  '  if (count < 1) {\n    throw new Error(`${path}: expected at least 1 match, found ${count}`);\n  }\n  if (count > 1) {\n    console.warn(`${path}: ${count} matches, replacing first occurrence only`);\n  }\n  write(path, input.replace(from, to));'
);

source = source.replace(
  'router.replace(query ? `\\${pathname}?\\${query}` : pathname, { scroll: false });',
  'router.replace(query ? pathname + "?" + query : pathname, { scroll: false });'
);

source = source.replace(
  '<span key={`ellipsis-\\${index}`}',
  '<span key={"ellipsis-" + index}'
);

fs.writeFileSync(path, source);
console.log("Patch generator fixed.");
