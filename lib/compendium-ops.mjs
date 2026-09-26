// lib/compendium-ops.mjs — compendium and SWADE system helpers
import { MODULE_ID, S, getSetting, splitAndSort } from '../utils.mjs';

const _allPacks = [];

async function setAllPacks() {
  const active = (getSetting(S.activeCompendiums) ?? []).filter(Boolean);
  _allPacks.length = 0;
  for (const col of active) {
    const pack = game.packs?.get(col);
    if (pack?.metadata.type === 'Item') _allPacks.push(pack);
  }
}
function resetAllPacks() { _allPacks.length = 0; }

function getAllItemCompendiums() {
  return [...(game.packs?.filter(c => c.documentName === 'Item').map(c => c.collection).filter(Boolean) ?? [])];
}
function getAllPackageNames() {
  return [...new Set(game.packs?.filter(c => c.metadata?.type === 'Item').map(c => c.metadata?.packageName).filter(Boolean) ?? [])];
}
function getAllActiveCompendiums() {
  const packs = getSetting(S.packageToUse) ?? [];
  const comps = [...(getSetting(S.compsToUse) ?? [])];
  if (!packs.length && !comps.length) return getAllItemCompendiums();
  packs.forEach(pkName => {
    game.packs?.contents?.filter(x => x?.metadata?.packageName === pkName)
      .forEach(c => { if (c?.collection) comps.push(c.collection); });
  });
  return [...new Set(comps)];
}
async function getItemFromCompendium(itemName, expectedType) {
  const swid = splitAndSort(itemName).join('-');
  for (const pack of _allPacks) {
    try {
      const entry = pack.index.contents.find(it => it.system?.swid === swid);
      if (entry) {
        const found = await pack.getDocument(entry._id);
        if (found.type === expectedType) return found;
      }
    } catch {}
  }
  return {};
}
function getActorAdditionalStats()      { return game.settings?.get('swade', 'settingFields')?.actor ?? {}; }
function getActorAdditionalStatsArray() { return Object.values(getActorAdditionalStats()).map(s => `${s.label}:`); }
function getSystemCoreSkills()          { return (game.settings?.get('swade', 'coreSkills') ?? '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean); }
function getFolderId(name)              { return game.folders?.getName(name)?.id ?? ''; }
function getAllActorFolders()           { return (game.folders?._source ?? []).filter(f => f.type === 'Actor').map(f => f.name); }


export {
  setAllPacks, resetAllPacks,
  getAllItemCompendiums, getAllPackageNames, getAllActiveCompendiums,
  getItemFromCompendium,
  getActorAdditionalStats, getActorAdditionalStatsArray, getSystemCoreSkills,
  getFolderId, getAllActorFolders,
};
