const fs = require('fs');

function replaceOne(path, from, to) {
  const input = fs.readFileSync(path, 'utf8');
  const count = input.split(from).length - 1;
  if (count !== 1) throw new Error(`${path}: expected 1 match, got ${count}`);
  fs.writeFileSync(path, input.replace(from, to));
}

// ---------- Tasting form ----------
const form = 'app/tastings/new/TastingForm.tsx';
replaceOne(form,
`  const [\n    breweryOpen,\n    setBreweryOpen,\n  ] = useState(false);\n\n  const [\n    countryOpen,`,
`  const [\n    breweryOpen,\n    setBreweryOpen,\n  ] = useState(false);\n\n  const [\n    showCollaborationField,\n    setShowCollaborationField,\n  ] = useState(false);\n\n  const [\n    collaboratorQuery,\n    setCollaboratorQuery,\n  ] = useState(\"\");\n\n  const [\n    collaboratorOpen,\n    setCollaboratorOpen,\n  ] = useState(false);\n\n  const [\n    selectedCollaborators,\n    setSelectedCollaborators,\n  ] = useState<Brewery[]>([]);\n\n  const [\n    countryOpen,`
);

replaceOne(form,
`      setIsNonAlcoholic(false);\n      setSelectedHops([]);`,
`      setIsNonAlcoholic(false);\n      setSelectedHops([]);\n      setSelectedCollaborators([]);\n      setCollaboratorQuery(\"\");\n      setShowCollaborationField(false);`
);

replaceOne(form,
`  function selectBrewery(\n    brewery: Brewery\n  ) {\n    setBreweryName(\n      brewery.name\n    );\n\n    setBreweryCountry(\n      brewery.country ?? \"\"\n    );\n\n    setBreweryOpen(false);\n  }\n\n  // ==================================================\n  // ZEMĚ`,
`  function selectBrewery(\n    brewery: Brewery\n  ) {\n    setBreweryName(\n      brewery.name\n    );\n\n    setBreweryCountry(\n      brewery.country ?? \"\"\n    );\n\n    setBreweryOpen(false);\n  }\n\n  const collaboratorSuggestions =\n    breweries.filter((brewery) => {\n      if (collaboratorQuery.trim().length < 3) {\n        return false;\n      }\n\n      if (normalizeText(brewery.name) === normalizeText(breweryName)) {\n        return false;\n      }\n\n      if (selectedCollaborators.some((item) => item.id === brewery.id)) {\n        return false;\n      }\n\n      return normalizeText(brewery.name).includes(normalizeText(collaboratorQuery));\n    });\n\n  function addCollaborator(brewery: Brewery) {\n    setSelectedCollaborators((current) =>\n      current.some((item) => item.id === brewery.id)\n        ? current\n        : [...current, brewery]\n    );\n    setCollaboratorQuery(\"\");\n    setCollaboratorOpen(false);\n  }\n\n  function removeCollaborator(id: number) {\n    setSelectedCollaborators((current) =>\n      current.filter((brewery) => brewery.id !== id)\n    );\n  }\n\n  // ==================================================\n  // ZEMĚ`
);

replaceOne(form,
`        </div>\n      </div>\n\n      {/* ==================================================\n          ZEMĚ`,
`        </div>\n\n        {selectedCollaborators.length > 0 && (\n          <div style={{ display: \"flex\", flexWrap: \"wrap\", gap: \"6px\", marginTop: \"8px\" }}>\n            {selectedCollaborators.map((brewery) => (\n              <span\n                key={brewery.id}\n                style={{\n                  display: \"inline-flex\",\n                  alignItems: \"center\",\n                  gap: \"5px\",\n                  padding: \"4px 8px\",\n                  border: \"1px solid rgba(217,138,67,0.34)\",\n                  borderRadius: \"999px\",\n                  color: \"var(--taste-text-soft)\",\n                  fontSize: \"10px\",\n                }}\n              >\n                + {brewery.name}\n                <button\n                  type=\"button\"\n                  onClick={() => removeCollaborator(brewery.id)}\n                  aria-label={\`Odebrat kolaboraci ${brewery.name}\`}\n                  style={{ border: 0, background: \"transparent\", color: \"inherit\", cursor: \"pointer\", padding: 0 }}\n                >\n                  ×\n                </button>\n                <input type=\"hidden\" name=\"collaboratorBreweryIds\" value={brewery.id} />\n              </span>\n            ))}\n          </div>\n        )}\n\n        {!showCollaborationField ? (\n          <button\n            type=\"button\"\n            onClick={() => setShowCollaborationField(true)}\n            style={{\n              marginTop: \"7px\",\n              border: 0,\n              background: \"transparent\",\n              color: \"#d98945\",\n              cursor: \"pointer\",\n              padding: 0,\n              fontSize: \"10px\",\n              fontWeight: 750,\n            }}\n          >\n            ＋ Přidat kolaboraci\n          </button>\n        ) : (\n          <div style={{ position: \"relative\", marginTop: \"8px\" }}>\n            <input\n              value={collaboratorQuery}\n              onChange={(event) => {\n                setCollaboratorQuery(event.target.value);\n                setCollaboratorOpen(true);\n              }}\n              onFocus={() => setCollaboratorOpen(true)}\n              onBlur={() => setTimeout(() => setCollaboratorOpen(false), 150)}\n              placeholder=\"Další pivovar v kolaboraci\"\n              autoComplete=\"off\"\n              style={inputStyle}\n            />\n\n            {collaboratorOpen && collaboratorQuery.trim().length >= 3 && collaboratorSuggestions.length > 0 && (\n              <div style={dropdownStyle}>\n                {collaboratorSuggestions.map((brewery) => (\n                  <button\n                    key={brewery.id}\n                    type=\"button\"\n                    onMouseDown={(event) => event.preventDefault()}\n                    onClick={() => addCollaborator(brewery)}\n                    style={suggestionButtonStyle}\n                  >\n                    {brewery.name}\n                    {brewery.country && (\n                      <div style={{ fontSize: \"12px\", opacity: 0.65, marginTop: \"2px\" }}>{brewery.country}</div>\n                    )}\n                  </button>\n                ))}\n              </div>\n            )}\n\n            {collaboratorOpen && collaboratorQuery.trim().length >= 3 && collaboratorSuggestions.length === 0 && (\n              <div style={dropdownStyle}>\n                <div style={{ padding: \"10px 12px\", color: \"var(--taste-text-muted)\" }}>\n                  Kolaboraci vyber z existujících pivovarů.\n                </div>\n              </div>\n            )}\n          </div>\n        )}\n      </div>\n\n      {/* ==================================================\n          ZEMĚ`
);

// ---------- Tasting actions ----------
const actions = 'app/tastings/actions.ts';
replaceOne(actions,
`  hopNames: string[];\n};`,
`  hopNames: string[];\n  collaboratorBreweryIds: number[];\n};`
);

replaceOne(actions,
`  const hopNames =\n    formData\n      .getAll(\"hops\")\n      .map(\n        (hop) =>\n          String(hop).trim()\n      )\n      .filter(Boolean);`,
`  const hopNames =\n    formData\n      .getAll(\"hops\")\n      .map(\n        (hop) =>\n          String(hop).trim()\n      )\n      .filter(Boolean);\n\n  const collaboratorBreweryIds = [\n    ...new Set(\n      formData\n        .getAll(\"collaboratorBreweryIds\")\n        .map((value) => Number(String(value)))\n        .filter((value) => Number.isInteger(value) && value > 0)\n    ),\n  ];`
);

replaceOne(actions,
`    hopNames,\n  };`,
`    hopNames,\n    collaboratorBreweryIds,\n  };`
);

replaceOne(actions,
`  return brewery;\n}\n\n// ==================================================\n// PIVNÍ STYL`,
`  return brewery;\n}\n\nasync function validateCollaboratorBreweryIds(\n  supabase: SupabaseClient,\n  ids: number[],\n  primaryBreweryId: number\n) {\n  const uniqueIds = [...new Set(ids)];\n\n  if (uniqueIds.includes(primaryBreweryId)) {\n    throw new Error(\"Hlavní pivovar nemůže být zároveň kolaborantem.\");\n  }\n\n  if (uniqueIds.length === 0) {\n    return [];\n  }\n\n  const { data, error } = await supabase\n    .from(\"breweries\")\n    .select(\"id\")\n    .in(\"id\", uniqueIds);\n\n  if (error) {\n    throw new Error(error.message);\n  }\n\n  if ((data ?? []).length !== uniqueIds.length) {\n    throw new Error(\"Některý kolaborující pivovar už v katalogu neexistuje.\");\n  }\n\n  return uniqueIds;\n}\n\nasync function ensureTastingVersionBrewery(\n  supabase: SupabaseClient,\n  tastingId: number,\n  versionId: number,\n  beerId: number,\n  breweryId: number,\n  tastedOn: string\n) {\n  const { data: assigned, error } = await supabase\n    .from(\"beer_versions\")\n    .select(\"id, beer_id, brewery_id, version_year, plato, abv, ibu, style_id\")\n    .eq(\"id\", versionId)\n    .single();\n\n  if (error || !assigned) {\n    throw new Error(error?.message || \"Nepodařilo se načíst verzi piva.\");\n  }\n\n  if (assigned.brewery_id === breweryId) {\n    return assigned.id;\n  }\n\n  const versionYear = Number(tastedOn.slice(0, 4));\n  const { data: candidates, error: candidateError } = await supabase\n    .from(\"beer_versions\")\n    .select(\"id, brewery_id, version_year, plato, abv, ibu\")\n    .eq(\"beer_id\", beerId);\n\n  if (candidateError) {\n    throw new Error(candidateError.message);\n  }\n\n  const same = (a: number | null, b: number | null) =>\n    a == null && b == null ? true : Number(a) === Number(b);\n\n  let matching = (candidates ?? []).find((candidate) =>\n    candidate.brewery_id === breweryId &&\n    candidate.version_year === versionYear &&\n    same(candidate.plato, assigned.plato) &&\n    same(candidate.abv, assigned.abv) &&\n    same(candidate.ibu, assigned.ibu)\n  );\n\n  if (!matching) {\n    const { data: created, error: createError } = await supabase\n      .from(\"beer_versions\")\n      .insert({\n        beer_id: beerId,\n        brewery_id: breweryId,\n        version_year: versionYear,\n        plato: assigned.plato,\n        abv: assigned.abv,\n        ibu: assigned.ibu,\n        style_id: assigned.style_id,\n        is_current: false,\n        notes: \"Verze vytvořená z konkrétní ochutnávky s odlišným výrobním pivovarem\",\n      })\n      .select(\"id\")\n      .single();\n\n    if (createError || !created) {\n      throw new Error(createError?.message || \"Nepodařilo se vytvořit historickou verzi piva.\");\n    }\n\n    const { data: hopRows, error: hopsError } = await supabase\n      .from(\"beer_version_hops\")\n      .select(\"hop_id\")\n      .eq(\"beer_version_id\", versionId);\n\n    if (hopsError) {\n      throw new Error(hopsError.message);\n    }\n\n    if ((hopRows ?? []).length > 0) {\n      const { error: copyError } = await supabase\n        .from(\"beer_version_hops\")\n        .insert((hopRows ?? []).map((row) => ({ beer_version_id: created.id, hop_id: row.hop_id })));\n      if (copyError) throw new Error(copyError.message);\n    }\n\n    matching = { ...assigned, id: created.id, brewery_id: breweryId, version_year: versionYear };\n  }\n\n  const { error: tastingUpdateError } = await supabase\n    .from(\"tastings\")\n    .update({ beer_version_id: matching.id })\n    .eq(\"id\", tastingId);\n\n  if (tastingUpdateError) {\n    throw new Error(tastingUpdateError.message);\n  }\n\n  return matching.id;\n}\n\nasync function addVersionCollaborators(\n  supabase: SupabaseClient,\n  versionId: number,\n  collaboratorIds: number[]\n) {\n  if (collaboratorIds.length === 0) return;\n\n  const { error } = await supabase\n    .from(\"beer_version_collaborators\")\n    .upsert(\n      collaboratorIds.map((breweryId, index) => ({\n        beer_version_id: versionId,\n        brewery_id: breweryId,\n        display_order: index + 1,\n      })),\n      { onConflict: \"beer_version_id,brewery_id\" }\n    );\n\n  if (error) {\n    throw new Error(error.message);\n  }\n}\n\n// ==================================================\n// PIVNÍ STYL`
);

replaceOne(actions,
`  return beerId;\n}\n\n// ==================================================\n// OBNOVENÍ STRÁNEK`,
`  return {\n    beerId,\n    breweryId: brewery.id,\n  };\n}\n\n// ==================================================\n// OBNOVENÍ STRÁNEK`
);

replaceOne(actions,
`  const beerId =\n    await resolveCatalogData(\n      supabase,\n      values,\n      false\n    );\n\n  const {\n    error:\n      tastingError,\n  } =\n    await supabase\n      .from(\"tastings\")\n      .insert({`,
`  const { beerId, breweryId } =\n    await resolveCatalogData(\n      supabase,\n      values,\n      false\n    );\n\n  const collaboratorBreweryIds =\n    await validateCollaboratorBreweryIds(\n      supabase,\n      values.collaboratorBreweryIds,\n      breweryId\n    );\n\n  const {\n    data: insertedTasting,\n    error:\n      tastingError,\n  } =\n    await supabase\n      .from(\"tastings\")\n      .insert({`
);

replaceOne(actions,
`        notes:\n          values.notes ||\n          null,\n      });\n\n  if (\n    tastingError\n  ) {`,
`        notes:\n          values.notes ||\n          null,\n      })\n      .select(\"id, beer_version_id\")\n      .single();\n\n  if (\n    tastingError ||\n    !insertedTasting\n  ) {`
);

replaceOne(actions,
`    throw new Error(\n      tastingError.message\n    );\n  }\n\n  try {`,
`    throw new Error(\n      tastingError?.message || \"Ochutnávku se nepodařilo uložit.\"\n    );\n  }\n\n  if (insertedTasting.beer_version_id) {\n    const finalVersionId = await ensureTastingVersionBrewery(\n      supabase,\n      insertedTasting.id,\n      insertedTasting.beer_version_id,\n      beerId,\n      breweryId,\n      values.tastedOn\n    );\n\n    await addVersionCollaborators(\n      supabase,\n      finalVersionId,\n      collaboratorBreweryIds\n    );\n  }\n\n  try {`
);

// ---------- Homepage timeline ----------
const home = 'app/page.tsx';
replaceOne(home,
`        beer_version_hops:\n          | { hops: HopRow | null }[]\n          | null;`,
`        beer_version_hops:\n          | { hops: HopRow | null }[]\n          | null;\n        beer_version_collaborators:\n          | { display_order: number; breweries: BreweryRow | null }[]\n          | null;`
);
replaceOne(home,
`          beer_version_hops (\n            hops (\n              id,\n              name\n            )\n          )\n        ),`,
`          beer_version_hops (\n            hops (\n              id,\n              name\n            )\n          ),\n          beer_version_collaborators (\n            display_order,\n            breweries (\n              id,\n              name,\n              country\n            )\n          )\n        ),`
);
replaceOne(home,
`  const breweryName = tastingBrewery?.name ?? null;\n  const breweryId = tastingBrewery?.id ?? null;`,
`  const breweryName = tastingBrewery?.name ?? null;\n  const breweryId = tastingBrewery?.id ?? null;\n  const collaborators = [...(tasting.beer_versions?.beer_version_collaborators ?? [])]\n    .sort((a, b) => a.display_order - b.display_order)\n    .map((item) => item.breweries)\n    .filter((item): item is BreweryRow => Boolean(item));`
);
replaceOne(home,
`                        >\n                          {breweryName}\n                        </Link>\n                        {\" – \"}`, 
`                        >\n                          {breweryName}\n                        </Link>\n                        {collaborators.map((collaborator) => (\n                          <span\n                            key={collaborator.id}\n                            style={{ marginLeft: \"5px\", fontSize: \"10px\", fontWeight: 650, color: \"var(--taste-text-muted)\" }}\n                          >\n                            +{\" \"}\n                            <Link href={\`/breweries/${collaborator.id}\`} className=\"taste-entity-link\" style={{ color: \"inherit\" }}>\n                              {collaborator.name}\n                            </Link>\n                          </span>\n                        ))}\n                        {\" – \"}`
);

// ---------- Profile history ----------
const profile = 'app/profiles/[id]/page.tsx';
replaceOne(profile,
`          beer_version_hops (\n            hops (\n              id,\n              name\n            )\n          )\n        ),`,
`          beer_version_hops (\n            hops (\n              id,\n              name\n            )\n          ),\n          beer_version_collaborators (\n            display_order,\n            breweries (\n              id,\n              name,\n              country\n            )\n          )\n        ),`
);
replaceOne(profile,
`                  beer_version_hops:\n                    (\n                      beerVersion.beer_version_hops ??\n                      []\n                    ).map(\n                      (versionHop) => ({\n                        ...versionHop,\n                        hops:\n                          singleRelation(\n                            versionHop.hops\n                          ),\n                      })\n                    ),`,
`                  beer_version_hops:\n                    (\n                      beerVersion.beer_version_hops ??\n                      []\n                    ).map(\n                      (versionHop) => ({\n                        ...versionHop,\n                        hops:\n                          singleRelation(\n                            versionHop.hops\n                          ),\n                      })\n                    ),\n                  beer_version_collaborators:\n                    (beerVersion.beer_version_collaborators ?? [])\n                      .map((item) => ({\n                        ...item,\n                        breweries: singleRelation(item.breweries),\n                      })),`
);
replaceOne(profile,
`                          >\n                            {(tasting.beer_versions?.breweries ?? tasting.beers?.breweries)!.name}\n                          </Link>\n                        ) : (`,
`                          >\n                            {(tasting.beer_versions?.breweries ?? tasting.beers?.breweries)!.name}\n                          </Link>\n                        ) : (\n                          \"Neznámý pivovar\"\n                        )}\n\n                        {(tasting.beer_versions?.beer_version_collaborators ?? [])\n                          .filter((item) => item.breweries)\n                          .sort((a, b) => a.display_order - b.display_order)\n                          .map((item) => (\n                            <span key={item.breweries!.id} style={{ marginLeft: \"5px\", fontSize: \"10px\" }}>\n                              +{\" \"}\n                              <Link href={\`/breweries/${item.breweries!.id}\`} className=\"taste-entity-link\" style={{ color: \"inherit\" }}>\n                                {item.breweries!.name}\n                              </Link>\n                            </span>\n                          ))}\n\n                        {!(tasting.beer_versions?.breweries ?? tasting.beers?.breweries) ? (`
);
replaceOne(profile,
`                        {!(tasting.beer_versions?.breweries ?? tasting.beers?.breweries) ? (\n                          \"Neznámý pivovar\"\n                        )}\n\n                        {tasting`,
`                        {tasting`
);

// ---------- Beer detail ----------
const beerDetail = 'app/beers/[id]/page.tsx';
replaceOne(beerDetail,
`        breweries ( id, name, country ),\n        beer_styles ( id, name )`,
`        breweries ( id, name, country ),\n        beer_styles ( id, name ),\n        beer_version_collaborators (\n          display_order,\n          breweries ( id, name, country )\n        )`
);
replaceOne(beerDetail,
`      breweries: Relation<{ id: number; name: string; country: string | null }>;\n      beer_styles: Relation<{ id: number; name: string }>;`,
`      breweries: Relation<{ id: number; name: string; country: string | null }>;\n      beer_styles: Relation<{ id: number; name: string }>;\n      beer_version_collaborators: Array<{\n        display_order: number;\n        breweries: Relation<{ id: number; name: string; country: string | null }>;\n      }> | null;`
);
replaceOne(beerDetail,
`    breweries: one(version.breweries),\n    beer_styles: one(version.beer_styles),`,
`    breweries: one(version.breweries),\n    beer_styles: one(version.beer_styles),\n    beer_version_collaborators: (version.beer_version_collaborators ?? [])\n      .map((item) => ({ ...item, breweries: one(item.breweries) }))\n      .sort((a, b) => a.display_order - b.display_order),`
);
replaceOne(beerDetail,
`                  {version.breweries ? <Link className=\"taste-entity-link\" href={\`/breweries/${version.breweries.id}\`}>{version.breweries.name}</Link> : \"Pivovar neurčen\"}\n                  {version.beer_styles ? <> · <Link`,
`                  {version.breweries ? <Link className=\"taste-entity-link\" href={\`/breweries/${version.breweries.id}\`}>{version.breweries.name}</Link> : \"Pivovar neurčen\"}\n                  {version.beer_version_collaborators\n                    .filter((item) => item.breweries)\n                    .map((item) => (\n                      <span key={item.breweries!.id} style={{ marginLeft: \"5px\", fontSize: \"10px\" }}>\n                        + <Link className=\"taste-entity-link\" href={\`/breweries/${item.breweries!.id}\`}>{item.breweries!.name}</Link>\n                      </span>\n                    ))}\n                  {version.beer_styles ? <> · <Link`
);

// ---------- Protocol ----------
const protocol = 'docs/beer-data-protocol.md';
const protocolText = fs.readFileSync(protocol, 'utf8');
if (!protocolText.includes('## Kolaborace pivovarů')) {
  fs.appendFileSync(protocol, `\n\n## Kolaborace pivovarů\n\n- Hlavní výrobní pivovar je vždy jediný \\`beer_versions.brewery_id\\` a pouze tento pivovar vstupuje do statistik pivovarů.\n- Spolupracující pivovary se ukládají přes \\`beer_version_collaborators\\`; vazba je verzovaná, protože kolaborace může platit jen pro konkrétní várku nebo období.\n- Kolaborant se zobrazuje doplňkově za hlavním pivovarem ve formátu \\`Hlavní pivovar + Kolaborant\\`.\n- Kolaborant se nikdy nepřičítá jako druhý pivovar do pivovarské statistiky stejné ochutnávky.\n- Jedna verze může mít více kolaborantů; pořadí zobrazení určuje \\`display_order\\`.\n`);
}

console.log('Brewery collaboration patch applied.');
