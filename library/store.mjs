// library/store.mjs — library data model, named lists, compendium sync
import { MODULE_ID, S, getSetting, setSetting, uiInfo, uiError } from '../utils.mjs';
import {
  DEFAULT_EDGES_REF, DEFAULT_POWERS_REF, DEFAULT_ABILITIES_REF,
  DEFAULT_SKILLS_REF, DEFAULT_HINDRANCES_REF, DEFAULT_RACES_REF,
  DEFAULT_ITEMS_FORMAT,
} from '../lib/ref-defaults.mjs';
import { getAllActiveCompendiums } from '../lib/compendium-ops.mjs';

export const ITEM_SUBTYPES = ['weapon', 'armor', 'shield', 'gear', 'hindrance', 'vehmod'];
export const ITEM_SUBTYPE_LABEL = { weapon:'Weapons', armor:'Armor', shield:'Shields', gear:'Gear', hindrance:'Hindrances', vehmod:'Veh. Mods' };
export const ITEM_SWADE_TYPE   = { weapon:'weapon', armor:'armor', shield:'shield', gear:'gear', hindrance:'hindrance', vehmod:'vehicleMod' };

// Main ref categories (order determines tab display)
export const MAIN_REF_CATS = ['skills', 'edges', 'powers', 'abilities', 'hindrances', 'races'];

// Default setting rules (always available, never stored, never deleted)
export const DEFAULT_SETTING_RULES = {
  id: 'default',
  name: 'Default SWADE AE',
  attrPoints: 5,
  skillPoints: 12,
  coreSkills: 'Athletics (Agility d4)\nCommon Knowledge (Smarts d4)\nNotice (Smarts d4)\nPersuasion (Spirit d4)\nStealth (Agility d4)',
  notes: '',
};

function blankMainPrefs() { return { useDefault: true, useCompendium: true, listIds: [] }; }
function blankItemPrefs() { return { useCompendium: true, listIds: [] }; }

export function defaultLibrary() {
  return {
    compendium: {
      edges: '', powers: '', abilities: '',
      skills: '', hindrances: '', races: '',
      items: Object.fromEntries(ITEM_SUBTYPES.map(s => [s, ''])),
    },
    namedLists: [],   // [{id, name, category, subtype, content}]
    prefs: {
      edges:     blankMainPrefs(),
      powers:    blankMainPrefs(),
      abilities: blankMainPrefs(),
      skills:    blankMainPrefs(),
      hindrances:blankMainPrefs(),
      races:     blankMainPrefs(),
      items:     Object.fromEntries(ITEM_SUBTYPES.map(s => [s, blankItemPrefs()])),
    },
    settingRules: {
      active: 'default',
      namedSets: [],  // [{id, name, attrPoints, skillPoints, coreSkills, notes}]
    },
  };
}

export function getLibrary() {
  const raw = getSetting(S.sbiLibrary);
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) return defaultLibrary();
  return foundry.utils.mergeObject(defaultLibrary(), raw, { inplace: false });
}

export async function updateLibrary(updater) {
  const lib = getLibrary();
  updater(lib);
  return setSetting(S.sbiLibrary, lib);
}

// ── Default content ──────────────────────────────────────────────────
export function getDefaultContent(category, subtype = null) {
  if (category === 'edges')      return DEFAULT_EDGES_REF;
  if (category === 'powers')     return DEFAULT_POWERS_REF;
  if (category === 'abilities')  return DEFAULT_ABILITIES_REF;
  if (category === 'skills')     return DEFAULT_SKILLS_REF;
  if (category === 'hindrances') return DEFAULT_HINDRANCES_REF;
  if (category === 'races')      return DEFAULT_RACES_REF;
  if (category === 'items' && subtype) return DEFAULT_ITEMS_FORMAT[subtype] ?? '';
  return '';
}

export function hasDefaultContent(category) {
  return MAIN_REF_CATS.includes(category);
}

// ── Compendium slot ───────────────────────────────────────────────────
export function getCompendiumContent(category, subtype = null) {
  const lib = getLibrary();
  return subtype ? (lib.compendium.items?.[subtype] ?? '') : (lib.compendium[category] ?? '');
}

export async function saveCompendiumContent(category, subtype, content) {
  await updateLibrary(lib => {
    if (subtype) lib.compendium.items[subtype] = content;
    else         lib.compendium[category] = content;
  });
  await _syncEntry(subtype ? `items-${subtype}` : category, content);
}

// ── Named lists ──────────────────────────────────────────────────────
export function getNamedListsFor(category, subtype = null) {
  return getLibrary().namedLists.filter(l =>
    l.category === category && (category !== 'items' || l.subtype === subtype)
  );
}

export function getNamedListById(id) {
  return getLibrary().namedLists.find(l => l.id === id) ?? null;
}

export async function createNamedList(name, category, subtype = null) {
  const id = foundry.utils.randomID();
  await updateLibrary(lib => {
    lib.namedLists.push({ id, name, category, subtype: subtype ?? null, content: '' });
  });
  return id;
}

export async function saveNamedList(id, content) {
  await updateLibrary(lib => {
    const l = lib.namedLists.find(x => x.id === id);
    if (l) l.content = content;
  });
  await _syncEntry(`list-${id}`, content);
}

export async function renameNamedList(id, newName) {
  await updateLibrary(lib => {
    const l = lib.namedLists.find(x => x.id === id);
    if (l) l.name = newName;
  });
}

export async function deleteNamedList(id) {
  await updateLibrary(lib => {
    lib.namedLists = lib.namedLists.filter(x => x.id !== id);
    for (const cat of MAIN_REF_CATS) {
      if (lib.prefs[cat]) lib.prefs[cat].listIds = (lib.prefs[cat].listIds ?? []).filter(x => x !== id);
    }
    for (const sub of ITEM_SUBTYPES) {
      lib.prefs.items[sub].listIds = (lib.prefs.items[sub].listIds ?? []).filter(x => x !== id);
    }
  });
  await _syncEntry(`list-${id}`, null);
}

// ── Prefs ────────────────────────────────────────────────────────────
export function getPrefs(category, subtype = null) {
  const lib = getLibrary();
  return subtype ? (lib.prefs.items?.[subtype] ?? blankItemPrefs()) : (lib.prefs[category] ?? blankMainPrefs());
}

export async function setPrefs(category, subtype, newPrefs) {
  await updateLibrary(lib => {
    if (subtype) lib.prefs.items[subtype] = newPrefs;
    else         lib.prefs[category] = newPrefs;
  });
}

// ── Build master list for Copy ────────────────────────────────────────
export function buildMasterList(category, subtype = null) {
  const lib = getLibrary();
  const prefs = getPrefs(category, subtype);
  const parts = [];
  if (!subtype && prefs.useDefault) {
    const def = getDefaultContent(category);
    if (def) parts.push(def);
  }
  if (prefs.useCompendium) {
    const comp = getCompendiumContent(category, subtype);
    if (comp) parts.push(comp);
  }
  for (const l of getNamedListsFor(category, subtype)) {
    if (prefs.listIds?.includes(l.id) && l.content) parts.push(l.content);
  }
  return parts.join('\n\n');
}

// ── Setting Rules ─────────────────────────────────────────────────────
export function getSettingRules() {
  const lib = getLibrary();
  return lib.settingRules ?? { active: 'default', namedSets: [] };
}

export function getActiveSettingRuleSet() {
  const sr = getSettingRules();
  if (!sr.active || sr.active === 'default') return DEFAULT_SETTING_RULES;
  return (sr.namedSets ?? []).find(s => s.id === sr.active) ?? DEFAULT_SETTING_RULES;
}

export async function setActiveSettingRuleSet(id) {
  await updateLibrary(lib => {
    if (!lib.settingRules) lib.settingRules = { active: 'default', namedSets: [] };
    lib.settingRules.active = id;
  });
}

export async function createSettingRuleSet(name) {
  const id = foundry.utils.randomID();
  await updateLibrary(lib => {
    if (!lib.settingRules) lib.settingRules = { active: 'default', namedSets: [] };
    lib.settingRules.namedSets.push({
      id, name,
      attrPoints: DEFAULT_SETTING_RULES.attrPoints,
      skillPoints: DEFAULT_SETTING_RULES.skillPoints,
      coreSkills:  DEFAULT_SETTING_RULES.coreSkills,
      notes: '',
    });
    lib.settingRules.active = id;
  });
  return id;
}

export async function saveSettingRuleSet(id, data) {
  await updateLibrary(lib => {
    if (!lib.settingRules) return;
    const s = lib.settingRules.namedSets?.find(x => x.id === id);
    if (s) Object.assign(s, data);
  });
}

export async function renameSettingRuleSet(id, newName) {
  await updateLibrary(lib => {
    const s = lib.settingRules?.namedSets?.find(x => x.id === id);
    if (s) s.name = newName;
  });
}

export async function deleteSettingRuleSet(id) {
  await updateLibrary(lib => {
    if (!lib.settingRules) return;
    lib.settingRules.namedSets = (lib.settingRules.namedSets ?? []).filter(x => x.id !== id);
    if (lib.settingRules.active === id) lib.settingRules.active = 'default';
  });
}

// ── Load from compendiums ─────────────────────────────────────────────
export async function loadFromCompendiums(category, subtype = null) {
  const typeMap = {
    edges:'edge', powers:'power', abilities:'ability',
    skills:'skill', hindrances:'hindrance', races:'ancestry',
    weapon:'weapon', armor:'armor', shield:'shield',
    gear:'gear', hindrance:'hindrance', vehmod:'vehicleMod',
  };
  const swadeType = typeMap[subtype ?? category] ?? (subtype ?? category);
  const activeComps = getAllActiveCompendiums();
  const sections = [];
  let found = 0;
  for (const compId of activeComps) {
    const pack = game.packs?.get(compId);
    if (!pack || pack.documentName !== 'Item') continue;
    try { await pack.getIndex({ fields: ['type','name','system.requirements.value','system.pp','system.attribute'] }); } catch {}
    const entries = pack.index.contents.filter(e => e.type === swadeType);
    if (!entries.length) continue;
    const lines = [`## ${pack.metadata.label ?? compId}`];
    for (const e of entries) {
      if      (category === 'edges')      lines.push(`${e.name} | Req: ${e.system?.requirements?.value ?? ''} | Description.`);
      else if (category === 'powers')     lines.push(`${e.name} | PP: ${e.system?.pp ?? '?'} | Range: | Dur: | Description.`);
      else if (category === 'skills')     lines.push(`${e.name} | ${e.system?.attribute ?? '?'} | Description.`);
      else if (category === 'hindrances') lines.push(`${e.name} | Minor | Description.`);
      else if (category === 'races')      lines.push(`${e.name}\nAbility: Description.`);
      else if (subtype === 'weapon')      lines.push(`${e.name} | Dmg: Str+d6 | Range: — | RoF: 1 | AP: 0 | Notes:`);
      else if (subtype === 'armor')       lines.push(`${e.name} | Armor: 2 | Min Str: — | Notes:`);
      else if (subtype === 'shield')      lines.push(`${e.name} | Parry: +1 | Cover: +1 | Notes:`);
      else if (subtype === 'hindrance')   lines.push(`${e.name} | Type: Minor | Description.`);
      else                                lines.push(`${e.name} | Notes:`);
      found++;
    }
    sections.push(lines.join('\n'));
  }
  if (!found) return null;
  const label = subtype ? ITEM_SUBTYPE_LABEL[subtype] : (category.charAt(0).toUpperCase() + category.slice(1));
  return [`# ${label} — loaded from compendiums`, '# Fill in details, then save to a Named List.', '', ...sections].join('\n');
}

// ── Module compendium sync ────────────────────────────────────────────
async function _syncEntry(entryName, content) {
  const packId = `${MODULE_ID}.sbi-library`;
  const pack = game.packs?.get(packId);
  if (!pack) return;
  try {
    await pack.configure({ locked: false });
    const idx = pack.index.find(e => e.name === entryName);
    if (content === null || content === '') {
      if (idx) { const doc = await pack.getDocument(idx._id); await doc.delete(); }
    } else if (idx) {
      const doc = await pack.getDocument(idx._id);
      const pages = doc.pages?.contents ?? [];
      const pageUpdate = { name: entryName, type: 'text', text: { content: `<pre>${content}</pre>`, format: 1 } };
      if (pages.length) pageUpdate._id = pages[0]._id;
      await doc.update({ pages: [pageUpdate] });
    } else {
      await JournalEntry.create(
        { name: entryName, pages: [{ name: entryName, type: 'text', text: { content: `<pre>${content}</pre>`, format: 1 } }] },
        { pack: packId }
      );
    }
  } catch(e) { console.warn('[SBI] _syncEntry error:', e); }
  finally { try { await pack.configure({ locked: true }); } catch {} }
}

export async function syncAllToCompendium() {
  const lib = getLibrary();
  const tasks = [];
  for (const cat of MAIN_REF_CATS)
    if (lib.compendium[cat]) tasks.push(_syncEntry(cat, lib.compendium[cat]));
  for (const sub of ITEM_SUBTYPES)
    if (lib.compendium.items[sub]) tasks.push(_syncEntry(`items-${sub}`, lib.compendium.items[sub]));
  for (const l of lib.namedLists)
    if (l.content) tasks.push(_syncEntry(`list-${l.id}`, l.content));
  await Promise.all(tasks);
}

// ── Migration from old settings ───────────────────────────────────────
export async function migrateOldSettings() {
  const existing = getSetting(S.sbiLibrary);
  if (existing && Object.keys(existing).length > 0) return;
  const oldEdges     = getSetting(S.refEdges)     || '';
  const oldPowers    = getSetting(S.refPowers)    || '';
  const oldAbilities = getSetting(S.refAbilities) || '';
  if (!oldEdges && !oldPowers && !oldAbilities) return;
  await updateLibrary(lib => {
    const name = 'Migrated Entries';
    if (oldEdges)     lib.namedLists.push({ id: foundry.utils.randomID(), name, category:'edges',     subtype:null, content:oldEdges });
    if (oldPowers)    lib.namedLists.push({ id: foundry.utils.randomID(), name, category:'powers',    subtype:null, content:oldPowers });
    if (oldAbilities) lib.namedLists.push({ id: foundry.utils.randomID(), name, category:'abilities', subtype:null, content:oldAbilities });
  });
  console.log('[SBI] Migrated old ref settings -> library named list "Migrated Entries".');
}
