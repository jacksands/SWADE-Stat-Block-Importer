// library/io.mjs — export/import library JSON
import { MODULE_ID, S, getSetting, setSetting, uiInfo, uiError } from '../utils.mjs';
import { ITEM_SUBTYPES, MAIN_REF_CATS, getLibrary, updateLibrary, syncAllToCompendium, getProfiles, normalizePrefs } from './store.mjs';
import { validateImportData, reportAvailability } from './validation.mjs';

export function exportLibraryJSON(options = {}) {
  const {
    includeSettings   = false,
    includeCompendium = true,
    includeNamedLists = true,
    includeProfiles   = false,
    categories        = null,   // null = all, else ['skills','edges','powers','abilities','hindrances','races','items']
    listIds           = null,   // null = all named lists, else specific ids
    exportType        = 'full', // 'full' | 'settings' | 'profiles' | 'category'
  } = options;

  const lib  = getLibrary();
  const data = {};

  if (includeSettings || exportType === 'settings' || exportType === 'full') {
    data.settings = {
      packageToUse:        getSetting(S.packageToUse),
      compsToUse:          getSetting(S.compsToUse),
      activeCompendiums:   getSetting(S.activeCompendiums),
      defaultActorType:    getSetting(S.defaultActorType),
      defaultIsWildcard:   getSetting(S.defaultIsWildcard),
      bulletPointIcons:    getSetting(S.bulletPointIcons),
      modifiedSpecialAbs:  getSetting(S.modifiedSpecialAbs),
      allAsSpecialAbilities: getSetting(S.allAsSpecialAbilities),
    };
    // Include setting rules (named sets)
    data.settingRules = lib.settingRules ?? { active: 'default', namedSets: [] };
  }

  if (includeProfiles || exportType === 'profiles' || exportType === 'full') {
    const profiles = getProfiles();
    data.profiles = {
      active: profiles.active,
      items: profiles.items.map(p => ({
        ...p,
        prefs: normalizePrefsForExport(p.prefs),
      })),
    };
  }

  if (includeCompendium || exportType === 'full') {
    data.compendium = lib.compendium;
  }

  if (includeNamedLists || exportType === 'full' || exportType === 'category') {
    let lists = lib.namedLists;
    if (categories) {
      // categories can include 'items' or specific subtypes
      const catSet = new Set(categories);
      const mainCats = MAIN_REF_CATS.filter(c => catSet.has(c));
      const itemSubs = catSet.has('items') ? ITEM_SUBTYPES : ITEM_SUBTYPES.filter(s => catSet.has(s));
      lists = lists.filter(l => {
        if (MAIN_REF_CATS.includes(l.category)) return mainCats.includes(l.category);
        return itemSubs.includes(l.subtype);
      });
    }
    if (listIds)    lists = lists.filter(l => listIds.includes(l.id));
    data.namedLists = lists;
  }

  // Include prefs (library source selections) if profiles or full export
  if (includeProfiles || exportType === 'profiles' || exportType === 'full') {
    data.prefs = lib.prefs;
    data.compsToUse = getSetting(S.compsToUse);
  }

  return JSON.stringify({
    type: 'sbi-library', version: '2.1.0', kind: exportType,
    exportDate: new Date().toISOString(),
    data,
  }, null, 2);
}

function normalizePrefsForExport(prefs) {
  // Ensure all categories present
  const result = {};
  const cats = ['edges','powers','abilities','skills','hindrances','races'];
  for (const cat of cats) {
    result[cat] = prefs[cat] ? { ...prefs[cat] } : { useDefault: true, useCompendium: true, listIds: [] };
  }
  result.items = {};
  for (const sub of ITEM_SUBTYPES) {
    result.items[sub] = prefs.items?.[sub] ? { ...prefs.items[sub] } : { useCompendium: true, listIds: [] };
  }
  return result;
}

export async function importLibraryJSON(jsonStr, options = {}) {
  const {
    mode = 'merge',           // 'merge' | 'replace' | 'selective'
    targetCategories = null,  // null = all, else array of categories
    targetProfileId = null,   // apply to specific profile (new or existing)
    applyToCurrentProfile = false, // apply prefs to current active profile
    createProfile = false,    // create a new profile from imported prefs
    skipValidation = false,
  } = options;

  let parsed;
  try   { parsed = JSON.parse(jsonStr); }
  catch { throw new Error('Invalid JSON — could not parse the file.'); }
  if (parsed.type !== 'sbi-library') throw new Error('Not an SBI library export file.');

  const { data, version, kind } = parsed;

  // Run validation unless skipped
  if (!skipValidation) {
    const validation = await validateImportData(data);
    if (!validation.valid) {
      throw new Error(`Import validation failed:\n${validation.errors.join('\n')}`);
    }
    // Store warnings/info for UI to display
    data._validation = { warnings: validation.warnings, info: validation.info };
  }

  // Settings (replace mode only)
  if (data.settings && mode === 'replace') {
    for (const [k, v] of Object.entries(data.settings)) {
      try { await setSetting(k, v); } catch {}
    }
  }

  await updateLibrary(lib => {
    // Setting Rules
    if (data.settingRules) {
      if (mode === 'replace') {
        lib.settingRules = data.settingRules;
      } else {
        // Merge named sets by ID
        const existingSets = new Map((lib.settingRules?.namedSets ?? []).map(s => [s.id, s]));
        for (const s of data.settingRules.namedSets ?? []) {
          if (existingSets.has(s.id)) {
            existingSets.get(s.id).name = s.name;
            // Merge all keys from import
            for (const key of Object.keys(s)) {
              if (key !== 'id') existingSets.get(s.id)[key] = s[key];
            }
          } else {
            existingSets.set(s.id, { ...s });
          }
        }
        lib.settingRules.namedSets = Array.from(existingSets.values());
        // Preserve the user's current active set; only fall back to the imported one if none is set
        if (!lib.settingRules.active) lib.settingRules.active = data.settingRules.active ?? 'default';
      }
    }

    // Profiles
    if (data.profiles?.items?.length) {
      if (mode === 'replace') {
        lib.profiles = data.profiles;
      } else {
        // Merge profiles by ID
        const existingProfiles = new Map((lib.profiles?.items ?? []).map(p => [p.id, p]));
        for (const p of data.profiles.items) {
          if (existingProfiles.has(p.id)) {
            // Update existing
            Object.assign(existingProfiles.get(p.id), p);
          } else {
            existingProfiles.set(p.id, { ...p });
          }
        }
        lib.profiles.items = Array.from(existingProfiles.values());
        // Set active profile if specified or if none active
        if (data.profiles.active && !lib.profiles.active) {
          lib.profiles.active = data.profiles.active;
        }
      }
      // Update legacy prefs from active profile
      const activeProfile = lib.profiles.items.find(p => p.id === lib.profiles.active);
      if (activeProfile) {
        lib.prefs = normalizePrefs(activeProfile.prefs);
      }
    }

    // Compendium slots
    if (data.compendium) {
      if (mode === 'replace') {
        for (const [k, v] of Object.entries(data.compendium)) {
          if (k === 'items' && typeof v === 'object') {
            Object.assign(lib.compendium.items, v);
          } else {
            lib.compendium[k] = v;
          }
        }
      } else {
        for (const [k, v] of Object.entries(data.compendium)) {
          if (k === 'items' && typeof v === 'object') {
            for (const [sk, sv] of Object.entries(v)) {
              if (sv) lib.compendium.items[sk] = lib.compendium.items[sk]
                ? lib.compendium.items[sk] + '\n\n' + sv : sv;
            }
          } else if (v) {
            lib.compendium[k] = lib.compendium[k]
              ? lib.compendium[k] + '\n\n' + v : v;
          }
        }
      }
    }

    // Named lists
    if (data.namedLists) {
      if (mode === 'replace') {
        const importedCats = new Set(data.namedLists.map(l => l.category));
        lib.namedLists = lib.namedLists.filter(l => !importedCats.has(l.category));
      }
      for (const l of data.namedLists) {
        // Filter by targetCategories if selective
        if (targetCategories && !targetCategories.includes(l.category) && 
            !(l.category === 'items' && targetCategories.includes(l.subtype))) {
          continue;
        }
        const existing = lib.namedLists.find(x => x.id === l.id);
        if (existing) { existing.name = l.name; existing.content = l.content; }
        else lib.namedLists.push({ ...l });
      }
    }

    // Prefs (library source selections) - apply to current profile, a target profile, or a new one
    if (data.prefs && (applyToCurrentProfile || targetProfileId || createProfile)) {
      const normalized = normalizePrefs(data.prefs);
      if (targetProfileId) {
        // Create or update specific profile
        const profile = lib.profiles.items.find(p => p.id === targetProfileId);
        if (profile) {
          profile.prefs = normalized;
          if (data.compsToUse) profile.compsToUse = data.compsToUse;
          profile.updatedAt = new Date().toISOString();
        } else {
          lib.profiles.items.push({
            id: targetProfileId,
            name: 'Imported Profile',
            description: '',
            prefs: normalized,
            compsToUse: data.compsToUse ?? [],
            settingRuleSetId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          lib.profiles.active = targetProfileId;
        }
      } else if (createProfile) {
        const newId = foundry.utils.randomID();
        lib.profiles.items.push({
          id: newId,
          name: 'Imported Profile',
          description: 'Created from an imported file',
          prefs: normalized,
          compsToUse: data.compsToUse ?? [],
          settingRuleSetId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        lib.profiles.active = newId;
        lib.prefs = normalized;
      } else if (applyToCurrentProfile && lib.profiles.active) {
        const profile = lib.profiles.items.find(p => p.id === lib.profiles.active);
        if (profile) {
          profile.prefs = normalized;
          if (data.compsToUse) profile.compsToUse = data.compsToUse;
          profile.updatedAt = new Date().toISOString();
          lib.prefs = { ...lib.prefs, ...normalized };
        }
      }
    }
  });

  // Sync to compendium after import
  await syncAllToCompendium();

  // Report availability
  const availability = await reportAvailability(data);
  return { validation: data._validation, availability };
}

// Trigger browser download of a JSON file
export function downloadJSON(filename, content) {
  const blob = new Blob([content], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
