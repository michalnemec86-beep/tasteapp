import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const nav = read("app/AppNav.tsx");
const navCss = read("app/app-nav.css");
const settings = read("app/settings/page.tsx");

const namedSections = [
  ["Co a jak pijeme", "aktuální dění"],
  ["Pivovary", "přehled a statistiky"],
  ["Pivní lístek", "evidence piv"],
  ["Místa", "naše hospody a fesťáky"],
  ["Hodnocení", null],
  ["Štamgasti", null],
];

function sectionOrder(source) {
  return [...source.matchAll(/<NavCaption title="([^"]+)"(?: context="([^"]+)")? \/>/g)]
    .map(match => [match[1], match[2] ?? null]);
}

test("personal diary is separated before exactly the six ordered public sections", () => {
  const desktop = nav.split('<div className="taste-nav-personal-shell">')[1]
    ?.split('className="taste-nav-activity-shortcut')[0];
  const mobile = nav.split('<div className="taste-mobile-personal-group">')[1]
    ?.split('<div className="taste-mobile-utility-group">')[0];
  assert.ok(desktop && mobile);
  const expected = [["Můj pivní deník", "osobní záznamy"], ...namedSections];
  assert.deepEqual(sectionOrder(desktop), expected);
  assert.deepEqual(sectionOrder(mobile), expected);
  assert.match(navCss, /\.taste-nav-personal-shell[\s\S]*border-right/);
  assert.match(navCss, /\.taste-mobile-personal-group[\s\S]*border-bottom/);
  assert.match(navCss, /max-height: calc\(100dvh - 60px - env\(safe-area-inset-top\)\)/);
  assert.match(navCss, /overflow-y: auto;/);
});

test("existing route and news badge links are preserved in reordered navigation", () => {
  assert.match(nav, /<NavLink href="\/stats"/);
  assert.match(nav, /<NavLink href=\{getNewsHref\("breweries", news\)\}[^>]*newsCount=\{counts\.breweries\}/);
  assert.match(nav, /<NavLink href=\{getNewsHref\("beers", news\)\}[^>]*newsCount=\{counts\.beers\}/);
  assert.match(nav, /<NavLink href="\/places"/);
  assert.match(nav, /<NavLink href="\/ratings"/);
  assert.match(nav, /<NavLink href="\/profiles"/);
  assert.match(nav, /href="\/activity"[\s\S]*newsCount=\{counts\.activity\}/);
  assert.match(nav, /className="taste-nav-activity-shortcut taste-settings-link"/);
});

test("installation is below Settings on mobile and reachable within Settings on desktop", () => {
  const utility = nav.split('<div className="taste-mobile-utility-group">')[1]
    ?.split('<button type="button" onClick={handleLogout}')[0];
  assert.ok(utility);
  assert.ok(utility.indexOf('href="/settings"') < utility.indexOf('href="/install"'));
  assert.match(utility, /className="taste-mobile-install-subitem"/);
  assert.doesNotMatch(nav, /className="taste-settings-link" aria-label="Nainstalovat Pivník"/);
  assert.match(settings, /href="\/install" className="taste-settings-install-link"/);
});
