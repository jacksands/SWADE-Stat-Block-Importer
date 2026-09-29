// lib/builder.mjs — actor and item building + import orchestration
import { MODULE_ID, S, NEW_LINE, ARMOR_MOD, loc, uiInfo, uiError, getSetting, setSetting, isEmpty, stripHtml, capitalize, capitalizeEveryWord, cleanKeyName } from '../utils.mjs';
import { setAllPacks, resetAllPacks, getAllActiveCompendiums, getItemFromCompendium, getActorAdditionalStats, getActorAdditionalStatsArray, getSystemCoreSkills, getFolderId } from './compendium-ops.mjs';
import { parseStatBlock, parseVehicleStatBlock } from './parser.mjs';

function calculateBennies(isWildCard, actorType) {
  // SWADE RAW (Core Rulebook p.89): Player Character Wild Cards = 3 Bennies, NPC Wild Cards = 2 Bennies.
  // The setting 'numberOfBennies' (default 2) applies only to NPC Wild Cards.
  if (isWildCard && actorType === 'npc') {
    const v = getSetting(S.numberOfBennies) ?? 2;
    return { value: v, max: v };
  }
  if (isWildCard) return { value: 3, max: 3 };
  return { value: 0, max: 0 };
}

function calculateWoundMod(size, isWildCard, specialAbs) {
  let base = isWildCard ? 3 : 0;
  if (getSetting(S.calculateAdditionalWounds)) {
    if (size >= 4 && size <= 7)   base += 1;
    else if (size >= 8 && size <= 11) base += 2;
    else if (size >= 12)          base += 3;
    for (const key in (specialAbs ?? {})) {
      const n = cleanKeyName(key);
      if (n === (loc('sbi.parser.VeryResilient') || 'Very Resilient').toLowerCase()) base += 2;
      else if (n === (loc('sbi.parser.Resilient') || 'Resilient').toLowerCase()) base += 1;
    }
  }
  return base;
}

function calculateIgnoredWounds(actor) {
  if (!getSetting(S.calculateIgnoredWounds)) return 0;
  const relevant = [loc('sbi.parser.Undead'), loc('sbi.parser.Construct'), loc('sbi.parser.Elemental')].map(s => s.toLowerCase());
  let total = 0;
  for (const k in (actor.specialAbilities ?? {})) {
    if (relevant.includes(cleanKeyName(k))) total++;
  }
  return total;
}

function findUnshakeBonus(actor) {
  let total = 0;
  const fromAbility = [loc('sbi.parser.Undead'), loc('sbi.parser.Construct')].map(s => s.toLowerCase());
  for (const k in (actor.specialAbilities ?? {})) {
    if (fromAbility.includes(cleanKeyName(k))) total += 2;
  }
  (actor.edges ?? []).forEach(e => {
    if (e.toLowerCase().includes(loc('sbi.parser.CombatReflexes') || 'combat reflexes')) total += 2;
  });
  return total;
}

function toughnessBonus(actor) {
  let total = 0;
  const fromEdge    = [loc('sbi.parser.Brawny'), loc('sbi.parser.Brawler'), loc('sbi.parser.Bruiser')].map(s => s.toLowerCase());
  const fromAbility = [loc('sbi.parser.Undead')].map(s => s.toLowerCase());
  for (const k in (actor.specialAbilities ?? {})) {
    if (fromAbility.includes(cleanKeyName(k))) total += 2;
  }
  (actor.edges ?? []).forEach(e => {
    if (fromEdge.includes(e.toLowerCase())) total += 1;
  });
  return total;
}

function initiativeMod(actor) {
  const out = { hasHesitant: false, hasLevelHeaded: false, hasImpLevelHeaded: false, hasQuick: false };
  (actor.edges ?? []).forEach(e => {
    if (e === (loc('sbi.parser.LevelHeadedImp') || 'Level Headed (Imp)')) out.hasImpLevelHeaded = true;
    else if (e === (loc('sbi.parser.LevelHeaded') || 'Level Headed')) out.hasLevelHeaded = true;
    if (e === (loc('sbi.parser.Quick') || 'Quick')) out.hasQuick = true;
  });
  (actor.hindrances ?? []).forEach(h => {
    if (h === (loc('sbi.parser.Hesitant') || 'Hesitant')) out.hasHesitant = true;
  });
  return out;
}

function findRunningDie(actor) {
  let die = 6;
  const diceRx = new RegExp(loc('sbi.regex.dice') || '(\\d+)?d(\\d+)', 'i');
  for (const k in (actor.specialAbilities ?? {})) {
    if (cleanKeyName(k) === (loc('sbi.parser.Speed') || 'Speed').toLowerCase()) {
      const m = actor.specialAbilities[k].match(diceRx);
      if (m) return parseInt(m[0].replace(/[a-z]/i, ''));
    }
  }
  (actor.edges ?? []).forEach(e => {
    if (e.toLowerCase().includes((loc('sbi.parser.FleetFooted') || 'Fleet-Footed').toLowerCase())) die += 2;
  });
  return die;
}

function findRunningMod(actor) {
  let mod = 0;
  (actor.edges ?? []).forEach(e => {
    if (e.toLowerCase().includes((loc('sbi.parser.FleetFooted') || 'Fleet-Footed').toLowerCase())) mod += 2;
  });
  return mod;
}

async function buildAdditionalStats(actor) {
  const extra = getActorAdditionalStats();
  for (const key in extra) {
    const stat = extra[key];
    if (!actor[stat.label]) continue;
    if (stat.dtype === 'Die')    { extra[key].modifier = actor[stat.label].modifier; extra[key].value = `d${actor[stat.label].sides}`; }
    else if (stat.dtype === 'Number') { extra[key].max = stat.hasMaxValue ? actor[stat.label] : undefined; extra[key].value = actor[stat.label]; }
    else if (stat.dtype === 'String') { extra[key].value = actor[stat.label] ?? ''; }
  }
  return extra;
}

// ============================================================
// BUILD ACTOR SYSTEM DATA
// ============================================================
async function buildActorData(parsed, isWildCard, actorType) {
  const attributes = { ...parsed.attributes };
  const unshake    = findUnshakeBonus(parsed);
  if (unshake && attributes.spirit) attributes.spirit.unShakeBonus = unshake;

  return {
    attributes,
    stats: {
      toughness: { value: parsed.toughness?.value ?? 0, modifier: toughnessBonus(parsed), armor: parsed.toughness?.armor ?? 0 },
      parry:     { value: parsed.parry ?? 0, shield: 0, modifier: 0 },
      size:      parsed.size ?? 0,
    },
    details: {
      biography:        { value: parsed.biography ?? '' },
      autoCalcToughness: getSetting(S.autoCalcToughness) ?? false,
    },
    powerPoints: { general: { value: parsed.powerPoints ?? 0, max: parsed.powerPoints ?? 0 } },
    wounds:  { value: 0, max: calculateWoundMod(parsed.size ?? 0, isWildCard, parsed.specialAbilities), ignored: calculateIgnoredWounds(parsed) },
    fatigue: { value: 0, max: 2, ignored: 0 },
    initiative: initiativeMod(parsed),
    wildcard: isWildCard,
    bennies:  calculateBennies(isWildCard, actorType),
    additionalStats: await buildAdditionalStats(parsed),
    pace: {
      base: 'ground', ground: parsed.pace ?? 6,
      fly: null, swim: null, burrow: null,
      running: { die: findRunningDie(parsed), mod: findRunningMod(parsed) },
    },
  };
}

// ============================================================
// BUILD TOKEN
// ============================================================
function sizeToSquares(s) {
  if (s <= 2) return 1; if (s <= 5) return 2; if (s <= 8) return 4; if (s <= 11) return 8; return 16;
}
function sizeToScale(s) {
  if (s >= 0) return 1; if (s === -1) return 0.85; if (s >= -3) return 0.75; return 0.5;
}
function buildActorToken(parsed, tokenOpts) {
  const token = {
    displayName: parseInt((getSetting(S.tokenSettings) ?? {}).displayName ?? 0),
    disposition: tokenOpts.disposition ?? -1,
    sight: { enabled: tokenOpts.vision ?? false, range: tokenOpts.visionRange ?? 0, angle: tokenOpts.visionAngle ?? 360 },
  };
  if (getSetting(S.autoCalcSize)) {
    const sz = parsed.size ?? 0;
    token.width = sizeToSquares(sz); token.height = sizeToSquares(sz); token.scale = sizeToScale(sz);
  }
  return token;
}

// ============================================================
// ITEM BUILDERS
// ============================================================
function buildItemObject({ item, type, name, img, system }) {
  return {
    ...(item ?? {}), type, name,
    img:     item?.img ?? img,
    system:  { ...(item?.system ?? {}), ...system },
    effects: item?.effects?.toJSON?.() ?? [],
    flags:   item?.flags ?? {},
  };
}

function generateDescription(desc, itemData, isSpecialAbility = false) {
  if (!desc) return '';
  const base = itemData?.system?.description ? `${desc}<hr>${itemData.system.description}` : desc;
  return base;
}

function checkEquipedStatus(weaponSystem) {
  const rx = new RegExp(getSetting(S.twoHandsNotation) || 'two hands|two-handed', 'i');
  return (rx.test(weaponSystem?.description) || rx.test(weaponSystem?.notes)) ? 5 : 4;
}

function rearrangeImprovedEdges(name) {
  const imp = loc('sbi.parser.Imp') || '(Imp)';
  if (!name.includes(imp)) return name;
  return `${loc('sbi.parser.Improved') || 'Improved'} ${name.replace(imp, '').trim()}`;
}

async function checkForItem(name, type) {
  if (type === 'edge') name = rearrangeImprovedEdges(name);
  let found = await getItemFromCompendium(name, type);
  if (!isEmpty(found.system)) return found;
  found = await getItemFromCompendium(name.split('(')[0].trim(), type);
  if (!isEmpty(found.system)) return found;
  return await getItemFromCompendium(name.split('(')[0].replace(/[+-]?\d/, '').trim(), type);
}

async function skillBuilder(skillsDict) {
  const core  = getSystemCoreSkills();
  const built = await Promise.all(Object.entries(skillsDict ?? {}).map(async ([sName, sData]) => {
    const item   = await checkForItem(sName, 'skill');
    const isCore = core.includes(sName);
    try {
      return buildItemObject({ item, type: 'skill', name: capitalizeEveryWord(sName),
        img: 'systems/swade/assets/icons/skill.svg',
        system: { ...(item?.system ?? {}), isCoreSkill: isCore,
          attribute: item?.system?.attribute ?? '',
          die: { sides: sData.sides, modifier: sData.modifier } } });
    } catch { return null; }
  }));
  return built.filter(Boolean);
}

async function edgeBuilder(edges) {
  const built = await Promise.all((edges ?? []).map(async name => {
    name = name.trim();
    const item = await checkForItem(name, 'edge');
    try {
      return buildItemObject({ item, type: 'edge', name: capitalizeEveryWord(name),
        img: 'systems/swade/assets/icons/edge.svg',
        system: { description: item?.system?.description ?? '', notes: item?.system?.notes ?? '',
          additionalStats: item?.system?.additionalStats ?? {},
          isArcaneBackground: item?.system?.isArcaneBackground ?? new RegExp(loc('sbi.parser.Arcane') || 'Arcane').test(name),
          requirements: { value: item?.system?.requirements?.value ?? '' } } });
    } catch { return null; }
  }));
  return built.filter(Boolean);
}

async function hindranceBuilder(hindrances) {
  const majorMinorRx = new RegExp(`${loc('sbi.parser.Major')}(,)?\\s?|${loc('sbi.parser.Minor')}(,)?\\s?`, 'ig');
  const built = await Promise.all((hindrances ?? []).map(async hName => {
    hName = hName.trim();
    const isMajor = new RegExp(`\\(${loc('sbi.parser.Major')}`, 'ig').test(hName);
    hName = hName.replace(majorMinorRx, '').replace('()', '').trim();
    const item = await checkForItem(hName, 'hindrance');
    try {
      return buildItemObject({ item, type: 'hindrance', name: capitalizeEveryWord(hName),
        img: 'systems/swade/assets/icons/hindrance.svg',
        system: { description: item?.system?.description ?? '', notes: item?.system?.notes ?? '',
          additionalStats: item?.system?.additionalStats ?? {}, major: isMajor } });
    } catch { return null; }
  }));
  return built.filter(Boolean);
}

async function powerBuilder(powers) {
  const built = await Promise.all((powers ?? []).map(async pName => {
    pName = pName.trim();
    const trapping  = pName.match(/\(([^)]+)\)/);
    const cleanName = trapping ? pName.replace(trapping[0], '').trim() : pName;
    const item      = await getItemFromCompendium(cleanName, 'power');
    const system    = item?.system ? structuredClone(item.system) : {};
    if (trapping) system.trapping = trapping[1];
    try {
      return buildItemObject({ item, type: 'power',
        name: `${item?.name ?? cleanName}${trapping ? ' ' + trapping[0] : ''}`.trim(),
        img: 'systems/swade/assets/icons/power.svg', system });
    } catch { return null; }
  }));
  return built.filter(Boolean);
}

async function weaponBuilder({ weaponName, weaponDamage, range, rof, ap, shots, description }) {
  const strLabel = loc('sbi.parser.Str') || 'Str';
  const dmg = (weaponDamage ?? '').replace('.', '').replace(new RegExp(strLabel, 'gi'), '@str').replace(loc('sbi.parser.dice') || 'd', 'd');
  const item = await checkForItem(weaponName, 'weapon');
  try {
    return buildItemObject({ item, type: 'weapon', name: item?.name ?? capitalizeEveryWord(weaponName),
      img: 'systems/swade/assets/icons/weapon.svg',
      system: { description: description ?? item?.system?.description ?? '',
        equippable: true, equipStatus: checkEquipedStatus(item?.system ?? {}),
        damage: dmg, range: range ?? item?.system?.range,
        rof: rof ?? item?.system?.rof, ap: ap ?? item?.system?.ap,
        shots: shots ?? item?.system?.shots, currentShots: shots ?? item?.system?.shots,
        actions: item?.system?.actions ?? { skill: range ? 'Shooting' : 'Fighting' } } });
  } catch { return null; }
}

// isNatural=true for Special Abilities armor, false for equipment armor
async function armorBuilder(armorName, armorBonus, description = '', isNatural = true) {
  const item = await checkForItem(armorName.split('(')[0].trim(), 'armor');
  try {
    return buildItemObject({ item, type: 'armor', name: item?.name ?? capitalizeEveryWord(armorName),
      img: 'systems/swade/assets/icons/armor.svg',
      system: { description: generateDescription(description, item),
        notes: item?.system?.notes ?? '', additionalStats: item?.system?.additionalStats ?? {},
        equipStatus: 3, equippable: true,
        armor: item?.system?.armor ?? armorBonus, isNaturalArmor: isNatural } });
  } catch { return null; }
}

async function shieldBuilder(shieldName, description = '', parry = 0, cover = 0) {
  const item = await checkForItem(shieldName, 'shield');
  try {
    return buildItemObject({ item, type: 'shield', name: item?.name ?? capitalizeEveryWord(shieldName),
      img: 'systems/swade/assets/icons/shield.svg',
      system: { description: generateDescription(description, item),
        notes: item?.system?.notes ?? '', additionalStats: item?.system?.additionalStats ?? {},
        equipStatus: 3, equippable: true,
        parry: item?.system?.parry ?? parry, cover: item?.system?.cover ?? cover } });
  } catch { return null; }
}

async function abilityBuilder(name, description = '') {
  const grantsPowers = new RegExp(`${loc('sbi.parser.PowerPoints') || 'Power Points'}|${loc('sbi.parser.Powers') || 'Powers'}`).test(description);
  const item = await checkForItem(name, 'ability');
  try {
    return buildItemObject({ item, type: 'ability', name: capitalizeEveryWord(name),
      img: 'systems/swade/assets/icons/ability.svg',
      system: { description: generateDescription(description, item, true),
        notes: item?.system?.notes ?? '', additionalStats: item?.system?.additionalStats ?? {},
        subtype: 'special', grantsPowers: item?.system?.grantsPowers ?? grantsPowers } });
  } catch { return null; }
}

async function gearBuilder(name) {
  const item = await checkForItem(name, 'gear');
  try {
    return buildItemObject({ item, type: 'gear', name: item?.name ?? capitalizeEveryWord(name),
      img: 'systems/swade/assets/icons/gear.svg',
      system: { description: item?.system?.description ?? '', equipStatus: 1, equippable: false } });
  } catch { return null; }
}

function getGearType(data) {
  if (data === null)             return 'gear';
  if (typeof data === 'object') {
    if ('damage' in data || 'range' in data) return 'weapon';
    if ('armorBonus' in data)                return 'armor';
    if ('parry' in data)                     return 'shield';
  }
  return 'gear';
}

async function buildGearItems(gearDict, forceEquipment = false) {
  if (!gearDict || typeof gearDict !== 'object') return [];
  const built = await Promise.all(Object.entries(gearDict).map(async ([name, data]) => {
    switch (getGearType(data)) {
      case 'weapon': return weaponBuilder({ weaponName: name, weaponDamage: data.damage, range: data.range, rof: data.rof, ap: data.ap, shots: data.shots });
      case 'armor':  return armorBuilder(name, data.armorBonus, name, !forceEquipment ? false : false); // equipment armor
      case 'shield': return shieldBuilder(name, name, data.parry ?? 0, data.cover ?? 0);
      default:       return gearBuilder(name);
    }
  }));
  return built.filter(Boolean);
}

// ============================================================
// SPECIAL ABILITIES
// ============================================================
async function buildSpecialAbilities(specialAbilitiesData) {
  if (!specialAbilitiesData) return [];
  const meleeDmgRx = /str\.?\s*([+\-]\s*((\d+)?d\d+|\d+))?/i;
  const diceRx     = new RegExp(loc('sbi.regex.dice') || '(\\d+)?d(\\d+)', 'i');
  const useAt      = getSetting(S.modifiedSpecialAbs);
  const allAsAbs   = getSetting(S.allAsSpecialAbilities);

  if (useAt) {
    const items = await Promise.all(Object.entries(specialAbilitiesData).map(async ([elem, desc]) => {
      const prefix = ['@w', '@a', '@e', '@h', '@sa'].find(p => elem.startsWith(p));
      if (!prefix) return null;
      switch (prefix) {
        case '@w': { const dmg = desc.match(meleeDmgRx) || desc.match(diceRx); return weaponBuilder({ weaponName: elem.replace('@w', '').trim(), weaponDamage: dmg?.[0] ?? '', description: desc }); }
        case '@a': return armorBuilder(elem.replace('@a', '').trim(), getArmorBonus(elem), desc, true);
        case '@e': { const item = await checkForItem(elem.replace('@e', '').trim(), 'edge'); return item ? buildItemObject({ item, type: 'edge', name: capitalizeEveryWord(elem.replace('@e', '').trim()), img: 'systems/swade/assets/icons/edge.svg', system: { description: desc } }) : null; }
        case '@h': { const item = await checkForItem(elem.replace('@h', '').trim(), 'hindrance'); return item ? buildItemObject({ item, type: 'hindrance', name: capitalizeEveryWord(elem.replace('@h', '').trim()), img: 'systems/swade/assets/icons/hindrance.svg', system: { description: desc, major: false } }) : null; }
        case '@sa': return abilityBuilder(elem.replace('@sa', '').trim(), desc);
      }
      return null;
    }));
    return items.filter(Boolean);
  }

  const items = await Promise.all(Object.entries(specialAbilitiesData).map(async ([elem, desc]) => {
    if (allAsAbs) return abilityBuilder(elem, desc);
    const e = elem.toLocaleLowerCase().trim();
    if (e.startsWith((loc('sbi.parser.Armor') || 'Armor').toLocaleLowerCase())) {
      return armorBuilder(e, getArmorBonus(e), desc, true);
    }
    const isMelee = meleeDmgRx.test(desc) || diceRx.test(desc);
    const isSpeed = e === (loc('sbi.parser.Speed') || 'Speed').toLocaleLowerCase();
    const hasRun  = desc.toLowerCase().includes((loc('sbi.parser.RunningDie') || 'running die').toLocaleLowerCase());
    if (isMelee && !isSpeed && !hasRun) {
      const dmgMatch = desc.match(meleeDmgRx) || desc.match(diceRx);
      return weaponBuilder({ weaponName: elem, weaponDamage: dmgMatch?.[0] ?? '', description: desc });
    }
    return abilityBuilder(elem, desc);
  }));
  return items.filter(Boolean);
}

// ============================================================
// BUILD ALL ITEMS
// ============================================================
async function buildActorItems(parsed) {
  // Merge language skills into regular skills (dedup)
  const mergedSkills = { ...(parsed.skills ?? {}), ...(parsed.languageSkills ?? {}) };
  // Merge cyberware into special abilities (dedup)
  const mergedAbilities = { ...(parsed.specialAbilities ?? {}) };
  for (const [k, v] of Object.entries(parsed.cyberwareAbilities ?? {})) {
    if (!mergedAbilities[k]) mergedAbilities[k] = v;
  }

  const [skills, edges, hindrances, powers, specials, gear, weapons, armors, shields] = await Promise.all([
    skillBuilder(mergedSkills),
    edgeBuilder(parsed.edges ?? []),
    hindranceBuilder(parsed.hindrances ?? []),
    powerBuilder(parsed.powers ?? []),
    buildSpecialAbilities(mergedAbilities),
    buildGearItems(parsed.gear ?? {}),
    buildGearItems(parsed.weapons ?? {}, true),   // Weapons: section → equipment
    buildGearItems(parsed.armors  ?? {}, true),   // Armor: section → equipment
    buildGearItems(parsed.shields ?? {}),
  ]);

  const all = [
    ...(skills ?? []), ...(edges ?? []), ...(hindrances ?? []), ...(powers ?? []),
    ...(specials ?? []), ...(gear ?? []), ...(weapons ?? []), ...(armors ?? []), ...(shields ?? []),
  ].filter(Boolean);

  const hasBrute = all.some(i => i.name === (loc('sbi.parser.Brute') || 'Brute'));
  const ath      = all.find(i => i.name === (loc('sbi.parser.Athletics') || 'Athletics'));
  if (hasBrute && ath) ath.system.attribute = 'strength';

  return all;
}


async function doImport(actorData) {
  Hooks.call('sbi-preCreateActor', actorData);
  const actors = await Actor.createDocuments([actorData]);
  uiInfo(game.i18n.format('sbi.HTML.ActorCreated', { actorName: actorData.name }));
  Hooks.call('sbi-actorCreated', actors);
  if (actors[0]?.sheet && getSetting(S.renderSheet)) actors[0].sheet.render({ force: true });
}

async function importActor(actorData) {
  if (!actorData.name) return;
  const existing = game.actors?.getName(actorData.name);
  if (!existing) { await doImport(actorData); return; }

  await foundry.applications.api.DialogV2.wait({
    window:   { title: loc('sbi.HTML.ActorImporter') },
    position: { width: 420 },
    content:  `${loc('sbi.HTML.ActorExistText')}
      <div class="form-group" style="margin-top:8px;">
        <label>${loc('sbi.HTML.ChangeName')}</label>
        <input type="text" id="sbi-new-name" value="${actorData.name}" style="width:100%;margin-top:4px;">
      </div>`,
    buttons: [
      { action: 'rename', label: loc('sbi.HTML.Rename'), callback: async () => {
        const v = document.getElementById('sbi-new-name')?.value;
        if (!v) { uiInfo(loc('sbi.HTML.NameInputMissing')); return; }
        actorData.name = v; await doImport(actorData);
      }},
      { action: 'override', label: loc('sbi.HTML.Override'), default: true, callback: async () => {
        await Actor.deleteDocuments([existing.id]); await doImport(actorData);
      }},
      { action: 'cancel', label: loc('sbi.HTML.Cancel'), callback: () => uiInfo(loc('sbi.HTML.ActorNotImportedMsg')) },
    ],
  });
}

// ============================================================
// VEHICLE BUILDER
// ============================================================
async function buildVehicleAndImport(importSettings, raw) {
  const { saveFolder, img, tokenSettings } = importSettings;
  const parsed = await parseVehicleStatBlock(raw);

  const systemData = {
    classification: parsed.classification ?? '',
    size:    parsed.size,
    scale:   0,
    handling: parsed.handling,
    cost:    parsed.cost,
    topspeed: { value: parsed.topSpeed },
    toughness: { total: parsed.toughnessTotal, armor: parsed.toughnessArmor },
    wounds:  { value: 0, max: parsed.woundsMax, ignored: 0 },
    crew: {
      required: { max: parsed.crewRequired },
      optional: { value: 0, max: parsed.crewOptional },
      members:  [],
    },
    driver:  { skill: parsed.driverSkill ?? '', skillAlternative: '' },
    mods:    { max: parsed.modsMax },
    cargo:   { max: parsed.cargoMax },
    description: parsed.description ?? '',
    status:  { isOutOfControl: false, isWrecked: false, isDistracted: false, isVulnerable: false },
    details: { autoCalcParry: false },
    stats:   { parry: { value: 0, shield: 0, modifier: 0 } },
  };

  // Weapons, gear, and special abilities reuse the character item builders
  const vehicleItems = [
    ...await buildGearItems(parsed.weapons  ?? {}, true),
    ...await buildGearItems(parsed.gear     ?? {}, false),
    ...await buildSpecialAbilities(parsed.abilities ?? {}),
  ].filter(Boolean);

  const actorData = {
    name:           parsed.name,
    type:           'vehicle',
    folder:         getFolderId(saveFolder),
    system:         systemData,
    items:          vehicleItems,
    prototypeToken: buildActorToken(parsed, tokenSettings),
    flags:          { [MODULE_ID]: { importDate: new Date().toISOString() } },
  };

  if (img) {
    actorData.img = img;
    actorData.prototypeToken.texture = actorData.prototypeToken.texture ?? {};
    actorData.prototypeToken.texture.src = img;
  }

  await importActor(actorData);
}

async function buildAndImport(importSettings, rawText) {
  let raw = rawText?.trim();
  if (!raw) { uiError(loc('sbi.parser.EmptyClipboard')); return; }
  // Vehicle stat blocks use a completely different schema
  if (importSettings.actorType === 'vehicle') {
    await setAllPacks();
    try   { await buildVehicleAndImport(importSettings, raw); }
    catch (e) { console.error('[SBI] vehicle import', e); uiError(`Import error: ${e?.message ?? ''}`); }
    finally   { resetAllPacks(); }
    return;
  }
  await setAllPacks();
  try {
    const parsed     = await parseStatBlock(raw);
    const { actorType, isWildCard, saveFolder, tokenSettings } = importSettings;
    const systemData = await buildActorData(parsed, isWildCard, actorType);
    if (parsed.currency !== undefined) systemData.details.currency = parsed.currency;
    if (typeof parsed.powerPoints === 'number') {
      systemData.powerPoints = { general: { value: parsed.powerPoints, max: parsed.powerPoints } };
    }
    const actorData = {
      name:           parsed.name,
      type:           actorType,
      folder:         getFolderId(saveFolder),
      system:         systemData,
      items:          await buildActorItems(parsed),
      prototypeToken: buildActorToken(parsed, tokenSettings),
      flags:          { [MODULE_ID]: { importDate: new Date().toISOString() } },
    };
    // Image — set on actor and prototype token if provided
    if (importSettings.img) {
      actorData.img = importSettings.img;
      actorData.prototypeToken.texture = actorData.prototypeToken.texture ?? {};
      actorData.prototypeToken.texture.src = importSettings.img;
    }
    await importActor(actorData);
  } catch(e) {
    console.error('[SBI]', e);
    uiError(`${loc('sbi.parser.BuildActorError')}: ${e?.message ?? ''}`);
  } finally {
    resetAllPacks();
  }
}



export {
  calculateBennies, calculateWoundMod, calculateIgnoredWounds,
  findUnshakeBonus, toughnessBonus, initiativeMod, findRunningDie, findRunningMod,
  buildAdditionalStats, buildActorData,
  sizeToSquares, sizeToScale, buildActorToken,
  buildItemObject, generateDescription, checkEquipedStatus, rearrangeImprovedEdges,
  checkForItem, skillBuilder, edgeBuilder, hindranceBuilder, powerBuilder,
  weaponBuilder, armorBuilder, shieldBuilder, abilityBuilder, gearBuilder,
  getGearType, buildGearItems, buildSpecialAbilities, buildActorItems,
  doImport, importActor, buildAndImport,
};
