// library/validation.mjs — import validation and availability reporting
import { MODULE_ID, S, getSetting } from '../utils.mjs';
import { getLibrary } from './store.mjs';
import { getAllActiveCompendiums, getAllItemCompendiums } from '../lib/compendium-ops.mjs';

/**
 * Validate import data before applying.
 * Returns { errors: [], warnings: [], info: [] }
 */
export async function validateImportData(data) {
  const errors = [];
  const warnings = [];
  const info = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid data: not an object');
    return { errors, warnings, info, valid: false };
  }

  // 1. Check referenced compendium packs in compsToUse (from profiles or settings)
  const allCompendiumIds = new Set();
  
  // From imported settings
  if (data.settings?.compsToUse) {
    for (const cid of data.settings.compsToUse) allCompendiumIds.add(cid);
  }
  if (data.settings?.activeCompendiums) {
    for (const cid of data.settings.activeCompendiums) allCompendiumIds.add(cid);
  }
  
  // From profiles
  if (data.profiles?.items) {
    for (const p of data.profiles.items) {
      if (p.compsToUse) for (const cid of p.compsToUse) allCompendiumIds.add(cid);
    }
  }

  const availablePacks = new Map();
  for (const pack of game.packs?.contents || []) {
    availablePacks.set(pack.collection, pack);
  }

  for (const cid of allCompendiumIds) {
    if (!availablePacks.has(cid)) {
      warnings.push(`⚠ Compendium pack "${cid}" not found in current world — sources using it will be unavailable.`);
    }
  }

  // 2. Check module/package ownership of referenced compendiums
  const moduleNames = new Set();
  for (const cid of allCompendiumIds) {
    const pack = game.packs?.get(cid);
    if (pack?.metadata?.packageName) moduleNames.add(pack.metadata.packageName);
  }
  
  for (const pkg of moduleNames) {
    const isSystem = pkg === game.system?.id;
    const isModule = game.modules?.has(pkg);
    const isWorld = game.packs?.contents?.some(p => p.metadata?.packageName === pkg && p.metadata?.packageType === 'world');
    if (!isSystem && !isModule && !isWorld) {
      warnings.push(`⚠ Module/Package "${pkg}" owns referenced compendiums but is not installed/active.`);
    }
  }

  // 3. Check for NEW local libraries (named lists) not in import
  const localLib = getLibrary();
  const importedListIds = new Set((data.namedLists || []).map(l => l.id));
  const newLocalLists = localLib.namedLists.filter(l => !importedListIds.has(l.id));
  if (newLocalLists.length > 0) {
    info.push(`ℹ Found ${newLocalLists.length} local named list(s) not in import file. They will be preserved on merge.`);
  }

  // 3b. Inform about local Item compendiums not referenced by the import
  if (allCompendiumIds.size > 0) {
    const localItemPacks = getAllItemCompendiums();
    const notReferenced = localItemPacks.filter(c => !allCompendiumIds.has(c));
    if (notReferenced.length > 0) {
      info.push(`ℹ ${notReferenced.length} local Item compendium(s) are present but not referenced by this import — review whether you want to use them.`);
    }
  }

  // 4. Check profiles for missing setting rule set links
  if (data.profiles?.items) {
    const importedRuleSetIds = new Set((data.settingRules?.namedSets || []).map(s => s.id));
    for (const p of data.profiles.items) {
      if (p.settingRuleSetId && !importedRuleSetIds.has(p.settingRuleSetId) && p.settingRuleSetId !== 'default') {
        warnings.push(`⚠ Profile "${p.name}" references setting rule set "${p.settingRuleSetId}" which is not in the import. Link will be preserved but rule set may be missing.`);
      }
    }
  }

  // 5. Check setting rule sets for missing library profile links (if present)
  if (data.settingRules?.namedSets) {
    const importedProfileIds = new Set((data.profiles?.items || []).map(p => p.id));
    for (const s of data.settingRules.namedSets) {
      if (s.libraryProfileId && !importedProfileIds.has(s.libraryProfileId)) {
        info.push(`ℹ Setting rule set "${s.name}" references profile "${s.libraryProfileId}" not in import. Link preserved.`);
      }
    }
  }

  // 6. Check for duplicate profile names
  if (data.profiles?.items) {
    const names = data.profiles.items.map(p => p.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length) warnings.push(`⚠ Duplicate profile names in import: ${[...new Set(dupes)].join(', ')}. Will be auto-renamed on import.`);
  }

  // 7. Check for duplicate named list names per category
  if (data.namedLists) {
    const byCat = {};
    for (const l of data.namedLists) {
      const key = `${l.category}:${l.subtype ?? ''}:${l.name}`;
      byCat[key] = (byCat[key] || 0) + 1;
    }
    for (const [k, v] of Object.entries(byCat)) {
      if (v > 1) warnings.push(`⚠ Duplicate named list in import: ${k} (${v}x). Will be deduplicated.`);
    }
  }

  return {
    errors,
    warnings,
    info,
    valid: errors.length === 0
  };
}

/**
 * Report availability of local resources after import.
 * Returns { warnings: [], info: [] }
 */
export async function reportAvailability(importedData) {
  const warnings = [];
  const info = [];
  const localLib = getLibrary();

  // 1. Check if any local named lists have no counterpart in import (merge mode)
  if (importedData.namedLists && importedData.namedLists.length) {
    const importedIds = new Set(importedData.namedLists.map(l => l.id));
    const localOnly = localLib.namedLists.filter(l => !importedIds.has(l.id));
    if (localOnly.length) {
      info.push(`ℹ ${localOnly.length} local named list(s) were not in the import and remain unchanged.`);
    }
  }

  // 2. Check active compendiums after import
  const activeComps = getAllActiveCompendiums();
  for (const cid of activeComps) {
    if (!game.packs?.has(cid)) {
      warnings.push(`⚠ Active compendium "${cid}" no longer exists. Please reconfigure in Settings.`);
    }
  }

  // 3. Check if active profile has missing compsToUse
  const profiles = localLib.profiles;
  if (profiles?.active) {
    const activeProfile = profiles.items.find(p => p.id === profiles.active);
    if (activeProfile?.compsToUse?.length) {
      for (const cid of activeProfile.compsToUse) {
        if (!game.packs?.has(cid)) {
          warnings.push(`⚠ Active profile "${activeProfile.name}" references missing compendium "${cid}".`);
        }
      }
    }
  }

  return { warnings, info };
}