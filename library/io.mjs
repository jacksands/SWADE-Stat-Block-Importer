// library/io.mjs — export/import library JSON
import { MODULE_ID, S, getSetting, setSetting, uiInfo, uiError } from '../utils.mjs';
import { ITEM_SUBTYPES, getLibrary, updateLibrary, defaultLibrary, syncAllToCompendium } from './store.mjs';

export function exportLibraryJSON(options = {}) {
  const {
    includeSettings   = false,
    includeCompendium = true,
    includeNamedLists = true,
    categories        = null,   // null = all, else ['edges','powers','items',...]
    listIds           = null,   // null = all named lists, else specific ids
  } = options;

  const lib  = getLibrary();
  const data = {};

  if (includeSettings) {
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
  }

  if (includeCompendium) {
    if (categories) {
      const comp = {};
      for (const cat of categories) {
        if (cat === 'items') comp.items = lib.compendium.items;
        else if (lib.compendium[cat] !== undefined) comp[cat] = lib.compendium[cat];
      }
      data.compendium = comp;
    } else {
      data.compendium = lib.compendium;
    }
  }

  if (includeNamedLists) {
    let lists = lib.namedLists;
    if (categories) lists = lists.filter(l => categories.includes(l.category));
    if (listIds)    lists = lists.filter(l => listIds.includes(l.id));
    data.namedLists = lists;
  }

  return JSON.stringify({
    type: 'sbi-library', version: '2.0.0',
    exportDate: new Date().toISOString(),
    data,
  }, null, 2);
}

export async function importLibraryJSON(jsonStr, mode = 'merge') {
  let parsed;
  try   { parsed = JSON.parse(jsonStr); }
  catch { throw new Error('Invalid JSON — could not parse the file.'); }
  if (parsed.type !== 'sbi-library') throw new Error('Not an SBI library export file.');

  const { data } = parsed;

  // Settings (replace mode only)
  if (data.settings && mode === 'replace') {
    for (const [k, v] of Object.entries(data.settings)) {
      try { await setSetting(k, v); } catch {}
    }
  }

  await updateLibrary(lib => {
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
        const existing = lib.namedLists.find(x => x.id === l.id);
        if (existing) { existing.name = l.name; existing.content = l.content; }
        else lib.namedLists.push({ ...l });
      }
    }
  });

  // Sync to compendium after import
  await syncAllToCompendium();
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
