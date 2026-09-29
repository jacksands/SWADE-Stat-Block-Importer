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

// Setting Rules Catalog — all official SWADE rules from Core Rulebook
export const SETTING_RULE_CATALOG = [
  // Core Setting Rules
  { group: 'core', key: 'bornAHero',       type: 'boolean', label: 'Born a Hero',           help: 'Ignore Rank qualifications for Edges at creation (must still meet other requirements). Greatly expands options for combat/supernatural Edges.' },
  { group: 'core', key: 'multipleLanguages', type: 'boolean', label: 'Multiple Languages',    help: 'All characters gain Linguist Edge free; know languages equal to half Smarts die type at d6. If Linguist Edge taken, languages = full Smarts die.' },
  { group: 'core', key: 'noPowerPoints',   type: 'boolean', label: 'No Power Points',       help: 'Arcane Backgrounds do not use Power Points. Arcane skill rolls penalized by half power cost. Failure cancels powers and Shakes caster. Maintaining powers inflicts cumulative –1.' },
  { group: 'core', key: 'pathfinderLanguages', type: 'boolean', label: 'Pathfinder Style Languages', help: 'Languages are binary known/unknown (not skills). Characters know languages based on Smarts (often half Smarts die + native). Frees skill points.' },
  { group: 'core', key: 'skillSpecializations', type: 'boolean', label: 'Skill Specializations', help: 'Broad skills (Boating, Driving, Fighting, Piloting, Riding, Science, Shooting, Survival) require one specialization. Using outside specialization incurs –2 penalty. Additional specializations cost like raising a skill below linked attribute.' },
  { group: 'core', key: 'unarmoredHero',   type: 'boolean', label: 'Unarmored Hero',        help: 'Wild Cards wearing no armor/shield add +2 to all Soak rolls. Encourages pulp/swashbuckling playstyle.' },

  // Setting-Specific Rules
  { group: 'setting', key: 'characterFrameworks', type: 'boolean', label: 'Character Frameworks', help: 'Characters must choose a Framework (Class/Archetype) at creation. Grants specific Edges, skills, abilities, or Hindrances. May impose requirements or restrictions.' },
  { group: 'setting', key: 'factions',       type: 'boolean', label: 'Setting Uses Factions',    help: 'Characters may belong to a Faction. Membership grants benefits (free Edge, skill bonus, contacts, gear) but imposes obligations (Hindrances like Obligation, Enemy, Vow) or restrictions.' },

  // Optional Rules
  { group: 'optional', key: 'encumbrance',   type: 'boolean', label: 'Setting Counts Encumbrance', help: 'Track gear weight. Exceeding carrying capacity (based on Strength) causes Encumbered: –2 Pace, running, Agility/linked skills, Vigor vs Fatigue. At 3× lifted weight: Pace 1, Fatigue rolls required.' },
  { group: 'optional', key: 'minimumStrength', type: 'boolean', label: 'Setting Counts Minimum Strength', help: 'Items with Minimum Strength impose penalties if below: Armor/worn –1 Pace per die type, –1 Agility/skills; Melee/thrown – damage die limited by Strength; Ranged –1 attack per die step difference.' },
  { group: 'optional', key: 'wealthSystem',  type: 'boolean', label: 'Setting Counts Wealth',     help: 'Use Wealth die instead of tracking money. Default Wealth d6. Mundane purchases auto; expensive items require Wealth roll. Poverty d4, Rich d8, Filthy Rich d10. Starting funds replaced by Wealth system.' },

  // Character Creation Parameters
  { group: 'params', key: 'attrPoints',      type: 'number',  label: 'Starting Attribute Points', help: 'Points to raise attributes from d4. Each step costs 1 point. Default 5.', min: 1, max: 20 },
  { group: 'params', key: 'skillPoints',     type: 'number',  label: 'Starting Skill Points',     help: 'Points for skills. Core skills start at d4 free. 1 point per die type up to linked attribute, then 2 points. Default 12.', min: 1, max: 50 },
  { group: 'params', key: 'extraPerkPoints', type: 'number',  label: 'Extra Perk Points',         help: 'Additional points like Hindrance points to buy Edges (2 pts=1 Edge, 1 pt=1 skill point or double funds). No Hindrance required. Default 0.', min: 0, max: 20 },
  { group: 'params', key: 'startingWealth',  type: 'number',  label: 'Starting Wealth ($)',       help: 'Default starting funds for gear. Default $500. Ignored if Wealth system used.', min: 0, max: 100000 },
  { group: 'params', key: 'rankNames',       type: 'text',    label: 'Rank Names (comma-separated)', help: 'Optional cosmetic rename of Ranks (e.g., "Initiate, Adept, Master, Champion, Legend"). No mechanical effect.' },
];

// Default setting rules (always available, never stored, never deleted)
export const DEFAULT_SETTING_RULES = {
  id: 'default',
  name: 'Default SWADE AE',
  // Core rules
  bornAHero: false,
  multipleLanguages: false,
  noPowerPoints: false,
  pathfinderLanguages: false,
  skillSpecializations: false,
  unarmoredHero: false,
  // Setting-specific
  characterFrameworks: false,
  factions: false,
  // Optional rules
  encumbrance: false,
  minimumStrength: false,
  wealthSystem: false,
  // Parameters
  attrPoints: 5,
  skillPoints: 12,
  extraPerkPoints: 0,
  startingWealth: 500,
  rankNames: '',
  // Legacy fields (for backward compat)
  coreSkills: 'Athletics (Agility d4)\nCommon Knowledge (Smarts d4)\nNotice (Smarts d4)\nPersuasion (Spirit d4)\nStealth (Agility d4)',
  notes: '',
};

function blankMainPrefs() { return { useDefault: true, useCompendium: true, listIds: [] }; }
function blankItemPrefs() { return { useCompendium: true, listIds: [] }; }

function defaultProfile(id = null) {
  return {
    id: id ?? foundry.utils.randomID(),
    name: 'Default',
    description: 'Default library source selection',
    prefs: {
      edges:     blankMainPrefs(),
      powers:    blankMainPrefs(),
      abilities: blankMainPrefs(),
      skills:    blankMainPrefs(),
      hindrances:blankMainPrefs(),
      races:     blankMainPrefs(),
      items:     Object.fromEntries(ITEM_SUBTYPES.map(s => [s, blankItemPrefs()])),
    },
    compsToUse: [],
    settingRuleSetId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Stable id for the built-in profile so reads are deterministic before first write
export const DEFAULT_PROFILE_ID = 'profile-default';

export function defaultLibrary() {
  return {
    compendium: {
      edges: '', powers: '', abilities: '',
      skills: '', hindrances: '', races: '',
      items: Object.fromEntries(ITEM_SUBTYPES.map(s => [s, ''])),
    },
    namedLists: [],   // [{id, name, category, subtype, content}]
    profiles: {
      active: null,
      items: [defaultProfile(DEFAULT_PROFILE_ID)],
    },
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
      namedSets: [],  // [{id, name, attrPoints, skillPoints, coreSkills, notes, ...}]
    },
  };
}

export function getLibrary() {
  const raw = getSetting(S.sbiLibrary);
  const isEmpty = !raw || typeof raw !== 'object' || Object.keys(raw).length === 0;
  const lib = isEmpty
    ? defaultLibrary()
    : foundry.utils.mergeObject(defaultLibrary(), raw, { inplace: false });
  // Backward compat: ensure profiles structure exists
  if (!lib.profiles) lib.profiles = { active: null, items: [] };
  if (!lib.profiles.items.length) lib.profiles.items.push(defaultProfile(DEFAULT_PROFILE_ID));
  if (!lib.profiles.active) lib.profiles.active = lib.profiles.items[0].id;
  // Ensure active profile's prefs are merged into legacy prefs for backward compat
  const activeProfile = lib.profiles.items.find(p => p.id === lib.profiles.active);
  if (activeProfile) {
    lib.prefs = foundry.utils.mergeObject(lib.prefs, activeProfile.prefs, { inplace: false });
  }
  return lib;
}

export async function updateLibrary(updater) {
  const lib = getLibrary();
  updater(lib);
  return setSetting(S.sbiLibrary, lib);
}

// ── Profiles ─────────────────────────────────────────────────────────────
export function getProfiles() {
  const lib = getLibrary();
  return lib.profiles;
}

export function getActiveProfile() {
  const lib = getLibrary();
  const activeId = lib.profiles.active;
  return lib.profiles.items.find(p => p.id === activeId) ?? lib.profiles.items[0];
}

export async function setActiveProfile(id) {
  await updateLibrary(lib => {
    if (!lib.profiles) lib.profiles = { active: null, items: [] };
    lib.profiles.active = id;
    // Update legacy prefs for backward compat
    const profile = lib.profiles.items.find(p => p.id === id);
    if (profile) lib.prefs = { ...lib.prefs, ...profile.prefs };
  });
}

export async function createProfile(name, description = '') {
  const profile = defaultProfile();
  profile.name = name;
  profile.description = description;
  await updateLibrary(lib => {
    if (!lib.profiles) lib.profiles = { active: null, items: [] };
    lib.profiles.items.push(profile);
    lib.profiles.active = profile.id;
  });
  return profile.id;
}

export async function saveProfile(id, data) {
  await updateLibrary(lib => {
    const p = lib.profiles.items.find(x => x.id === id);
    if (!p) return;
    if (data.name !== undefined) p.name = data.name;
    if (data.description !== undefined) p.description = data.description;
    if (data.prefs !== undefined) p.prefs = data.prefs;
    if (data.compsToUse !== undefined) p.compsToUse = data.compsToUse;
    if (data.settingRuleSetId !== undefined) p.settingRuleSetId = data.settingRuleSetId;
    p.updatedAt = new Date().toISOString();
    // Update legacy prefs if this is the active profile
    if (lib.profiles.active === id) lib.prefs = { ...lib.prefs, ...p.prefs };
  });
}

export async function renameProfile(id, newName) {
  await updateLibrary(lib => {
    const p = lib.profiles.items.find(x => x.id === id);
    if (p) p.name = newName;
  });
}

export async function deleteProfile(id) {
  await updateLibrary(lib => {
    if (!lib.profiles) return;
    lib.profiles.items = lib.profiles.items.filter(x => x.id !== id);
    if (lib.profiles.active === id) {
      lib.profiles.active = lib.profiles.items[0]?.id ?? null;
      if (lib.profiles.active) {
        const p = lib.profiles.items.find(x => x.id === lib.profiles.active);
        if (p) lib.prefs = { ...lib.prefs, ...p.prefs };
      }
    }
  });
}

export function normalizePrefs(prefs) {
  const result = {};
  for (const cat of MAIN_REF_CATS) {
    result[cat] = prefs[cat] ? { ...blankMainPrefs(), ...prefs[cat] } : blankMainPrefs();
  }
  result.items = {};
  for (const sub of ITEM_SUBTYPES) {
    result.items[sub] = prefs.items?.[sub] ? { ...blankItemPrefs(), ...prefs.items[sub] } : blankItemPrefs();
  }
  return result;
}

// Apply a profile's prefs + compsToUse + setting rule set
export async function applyProfile(id) {
  const lib = getLibrary();
  const profile = lib.profiles.items.find(p => p.id === id);
  if (!profile) return;

  await applyProfilePrefs(id);

  if (profile.settingRuleSetId) {
    await setActiveSettingRuleSet(profile.settingRuleSetId);
  }

  return profile;
}

// Apply only a profile's prefs + compendium selection (no setting rule set switch)
export async function applyProfilePrefs(id) {
  const lib = getLibrary();
  const profile = lib.profiles.items.find(p => p.id === id);
  if (!profile) return;

  await updateLibrary(lib => {
    lib.prefs = normalizePrefs(profile.prefs);
    lib.profiles.active = id;
  });

  if (profile.compsToUse?.length) {
    await setSetting(S.compsToUse, profile.compsToUse);
    await setSetting(S.packageToUse, []);
  }

  return profile;
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
  const found = (sr.namedSets ?? []).find(s => s.id === sr.active);
  if (!found) return DEFAULT_SETTING_RULES;
  // Merge with defaults for backward compatibility (older sets may lack new keys)
  return { ...DEFAULT_SETTING_RULES, ...found };
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
    // Build a new rule set with ALL keys from DEFAULT_SETTING_RULES
    const newSet = { id, name };
    for (const key of Object.keys(DEFAULT_SETTING_RULES)) {
      if (key !== 'id' && key !== 'name') newSet[key] = DEFAULT_SETTING_RULES[key];
    }
    lib.settingRules.namedSets.push(newSet);
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
