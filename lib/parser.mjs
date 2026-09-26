// lib/parser.mjs — SWADE stat block parsing
import { MODULE_ID, S, NEW_LINE, ARMOR_MOD, isEmpty, stripHtml, capitalize, capitalizeEveryWord,
         splitAndTrim, splitAndSort, cleanKeyName, splitRespectingParens, buildBulletRegex,
         splitAbilityLines, getSetting, loc } from '../utils.mjs';
import { getActorAdditionalStats, getActorAdditionalStatsArray, getSystemCoreSkills } from './compendium-ops.mjs';

// PARSER — SECTIONS
// ============================================================
function getSections(raw) {
  const input = raw
    .replace(NEW_LINE, ' ').replace('/ ', '/').replace(/\u00AD/g, '').replace(/[−–]/gi, '-');

  const labels = [
    `${loc('sbi.parser.Attributes')}:`, `${loc('sbi.parser.Skills')}:`,
    `${loc('sbi.parser.Hindrances')}:`, `${loc('sbi.parser.Edges')}:`,
    `${loc('sbi.parser.Powers')}:`, `${loc('sbi.parser.Pace')}:`,
    `${loc('sbi.parser.Parry')}:`, `${loc('sbi.parser.Toughness')}:`,
    `${loc('sbi.parser.PowerPoints')}:`, `${loc('sbi.parser.Gear')}:`,
    `${loc('sbi.parser.SpecialAbilities')}:`, `${loc('sbi.parser.SuperPowers')}:`,
    `${loc('sbi.parser.Conviction')}:`,
    // Extended format (savagedus / homebrew)
    'Weapons:', 'Armor:', 'Shield:', 'Language:', 'Languages Known:',
    'Cyberware:', 'Current Wealth:',
    ...getActorAdditionalStatsArray(),
    ...(getSetting(S.additionalTraits) ?? '').split(',').map(s => s.trim()).filter(Boolean),
  ];

  // No-colon variants: savagedus export omits the colon on these headers
  const noColonExtras = [
    loc('sbi.parser.SpecialAbilities') || 'Special Abilities',
    loc('sbi.parser.SuperPowers')      || 'Super Powers',
    'Cyberware',
  ];

  const seen = new Set();
  const indexes = [];
  for (const label of [...labels, ...noColonExtras]) {
    const idx = input.search(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    if (idx >= 0 && !seen.has(idx)) { seen.add(idx); indexes.push(idx); }
  }
  indexes.sort((a, b) => a - b);
  if (indexes.length === 0) throw new Error(loc('sbi.parser.NotValidStatblock') || 'Not a valid SWADE stat block — Attributes: section not found.');
  return indexes.map((start, i) => input.substring(start, indexes[i + 1] ?? undefined).trim());
}

// ============================================================
// PARSER — NAME / BIO
// ============================================================
function getName(raw) {
  const attrLabel = loc('sbi.parser.Attributes');
  const before    = raw.split(new RegExp(attrLabel, 'i'))[0];
  const lines     = before.split(NEW_LINE).map(l => l.trim()).filter(Boolean);
  return capitalizeEveryWord((lines[0] ?? '').replace('[WC]', '').trim());
}

function getBio(raw, sections) {
  const attrLabel = loc('sbi.parser.Attributes');
  const before    = raw.split(new RegExp(attrLabel, 'i'))[0];
  const lines     = before.split(NEW_LINE).map(l => l.trim()).filter(Boolean).slice(1);
  const bio       = lines.filter(l => l !== 'Background' && l !== 'Description')
    .map(l => l.endsWith('.') ? l + '<br/>' : l).join(' ').trim();
  const convLabel = loc('sbi.parser.Conviction');
  const conv      = sections.find(x => x.startsWith(convLabel));
  return conv ? `${conv}<hr>${bio}` : bio;
}

// ============================================================
// PARSER — TRAITS
// ============================================================
function buildTraitDie(data) {
  const m = data.replace(/\s+/g, '').match(/d(\d+)([+-]\d+)?/i);
  if (!m) return { sides: 0, modifier: 0 };
  return { sides: parseInt(m[1]), modifier: m[2] ? parseInt(m[2]) : 0 };
}

function getAttributes(sections) {
  const label   = `${loc('sbi.parser.Attributes') || 'Attributes'}:`;
  let section   = sections.find(x => new RegExp(label, 'i').test(x));
  if (!section) return {};
  const isAnimal = section.includes('(A)');
  section = section.replace('(A)', '');
  const raw   = splitAndTrim(section.replace(new RegExp(label, 'i'), ''), ',');
  const KEYS  = [
    { key: 'agility',  label: loc('sbi.parser.Agility')  || 'Agility'  },
    { key: 'smarts',   label: loc('sbi.parser.Smarts')   || 'Smarts'   },
    { key: 'spirit',   label: loc('sbi.parser.Spirit')   || 'Spirit'   },
    { key: 'strength', label: loc('sbi.parser.Strength') || 'Strength' },
    { key: 'vigor',    label: loc('sbi.parser.Vigor')    || 'Vigor'    },
  ];
  const attr = {};
  for (const { key, label: lbl } of KEYS) {
    const found = raw.find(x => x.toLowerCase().startsWith(lbl.toLowerCase())) ?? '';
    attr[key] = { die: buildTraitDie(found) };
  }
  attr.smarts.animal = isAnimal;
  return attr;
}

function getSkills(sections) {
  const label   = `${loc('sbi.parser.Skills') || 'Skills'}:`;
  const section = sections.find(x => new RegExp(label, 'i').test(x));
  if (!section) return {};
  const diceRx  = new RegExp(loc('sbi.regex.dice') || '(\\d+)?d(\\d+)([\\+\\-]\\d+)?', 'i');
  const skills  = {};
  splitAndTrim(section.replace(new RegExp(label, 'i'), ''), ',').forEach(trait => {
    const m = trait.match(diceRx);
    if (!m) return;
    const name = trait.replace(m[0], '').trim().replace(' )', ')').replace(/\.$/, '');
    if (name) skills[name.toLowerCase()] = buildTraitDie(m[0]);
  });
  return skills;
}

// ============================================================
// PARSER — DERIVED STATS
// ============================================================
function getDerivedStat(sections, labelKey) {
  const label = loc(`sbi.parser.${labelKey}`) || labelKey;
  const data  = sections.find(x => x.startsWith(`${label}:`));
  if (!data) return 0;
  const n = parseInt(data.split(':')[1]?.replace(';', '').trim() ?? '0');
  return isNaN(n) ? 0 : n;
}

function getToughness(sections) {
  const label = loc('sbi.parser.Toughness') || 'Toughness';
  const data  = sections.find(x => x.startsWith(`${label}:`))?.split(':')[1];
  if (!data) return { value: 0, modifier: 0, armor: 0 };
  const m = data.match(/(\d+)\s*(?:\((\d+)\))?\s*;?/);
  if (!m) return { value: 0, modifier: 0, armor: 0 };
  return { value: parseInt(m[1]), modifier: 0, armor: m[2] ? parseInt(m[2]) : 0 };
}

function getSize(specialAbilities) {
  const sizeLabel = (loc('sbi.parser.Size') || 'Size').toLowerCase();
  for (const key of Object.keys(specialAbilities ?? {})) {
    if (cleanKeyName(key).includes(sizeLabel)) {
      const parts = cleanKeyName(key).replace(sizeLabel, '').trim().split(' ');
      const n = parseInt(parts[0]);
      return isNaN(n) ? 0 : n;
    }
  }
  return 0;
}

function powerPointsFromSpecialAbility(abilities) {
  const found = Object.values(abilities ?? {}).find(v => v?.system?.grantsPowers === true);
  if (!found) return undefined;
  const m = found.system?.description?.match(/(\d+)/);
  return m ? parseInt(m[1]) : undefined;
}

// ============================================================
// PARSER — LIST STATS
// ============================================================
function getListStat(sections, labelKey) {
  const label = `${loc(`sbi.parser.${labelKey}`) || labelKey}:`;
  const line  = sections.find(x => x.startsWith(label));
  if (!line) return [];
  const data = line.slice(line.indexOf(':') + 1).replace(NEW_LINE, ' ').replace(/\.$/, '').trim();
  if (data.length <= 1) return [];
  const matches = data.match(/([A-Za-zÀ-ÖØ-öø-ÿ0-9!\-'' ]+)(\(([^)]+)\))?/gi);
  return matches ? matches.map(s => s.trim()).filter(Boolean) : [];
}

// ============================================================
// PARSER — ABILITIES
// ============================================================
function getAbilityList(sections, labelKey) {
  const labelBase = loc(`sbi.parser.${labelKey}`) || labelKey;
  const labelRx   = new RegExp(`^${labelBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:?\\s*`, 'i');
  const section   = sections.find(x => labelRx.test(x));
  if (!section) return {};
  const raw = section.replace(labelRx, '').trim();
  const useAt  = getSetting(S.modifiedSpecialAbs);
  const lines  = useAt
    ? splitAndTrim(raw, /@/).filter(s => s.length > 2)
    : splitAbilityLines(raw);
  const result = {};
  for (const el of lines) {
    const colonIdx = el.indexOf(':');
    if (colonIdx < 0) continue;
    const name  = el.slice(0, colonIdx).trim();
    const value = el.slice(colonIdx + 1).replace(NEW_LINE, ' ').trim();
    if (!name) continue;
    result[useAt ? `@${name}` : name] = value;
  }
  return result;
}

// ============================================================
// PARSER — GEAR (parentheses-aware)
// ============================================================
function parseGearItem(itemStr) {
  const s = itemStr.trim();
  const lastClose = s.lastIndexOf(')');
  if (lastClose < 0) return { name: s, statStr: '' };
  let depth = 0, start = -1;
  for (let i = lastClose; i >= 0; i--) {
    if (s[i] === ')') depth++;
    else if (s[i] === '(') { depth--; if (depth === 0) { start = i; break; } }
  }
  if (start < 0) return { name: s, statStr: '' };
  return { name: s.slice(0, start).trim(), statStr: s.slice(start + 1, lastClose) };
}

function parseWeaponStats(parts) {
  const stats = {};
  const strLabel = loc('sbi.parser.Str') || 'Str';
  for (const p of parts) {
    if (new RegExp(`^${strLabel}`, 'i').test(p)) { stats.damage = p; continue; }
    if (/shots/i.test(p)) { stats.shots = p.replace(/shots/i, '').trim(); continue; }
    const m = p.match(/^([A-Za-z]+)\s*(.*)/);
    if (m) stats[m[1].toLowerCase()] = m[2].trim();
  }
  return stats;
}

function getBonusNum(data, type) {
  const label = loc(`sbi.parser.${type}`) || type;
  const m = data.match(new RegExp(`([+-]?\\d+)\\s*${label}|${label}:?\\s*([+-]?\\d+)`, 'i'));
  const raw = m?.[1] || m?.[2];
  if (!raw) return 0;
  const n = parseInt(raw);
  return isNaN(n) ? 0 : n;
}

function getArmorBonus(data) {
  const m = ARMOR_MOD.exec(data)?.[0];
  return m ? parseInt(m) : 0;
}

function parseGear(gearArr) {
  const strLabel = loc('sbi.parser.Str') || 'Str';
  const result   = {};
  for (const g of gearArr) {
    const { name, statStr } = parseGearItem(g);
    if (!name) continue;
    if (!statStr) { result[name] = null; continue; }
    const isDamage = new RegExp(`^${strLabel}`, 'i').test(statStr) || /damage|range/i.test(statStr);
    const isArmor  = /armor\s*\+?\d/i.test(statStr) || (ARMOR_MOD.test(statStr) && !isDamage);
    const isShield = /parry/i.test(statStr);
    if (isDamage) {
      result[name] = parseWeaponStats(statStr.split(',').map(s => s.trim()));
    } else if (isArmor) {
      const m = statStr.match(/armor\s*\+?(\d+)/i);
      result[name] = { armorBonus: m ? parseInt(m[1]) : getArmorBonus(statStr) };
    } else if (isShield) {
      result[name] = { parry: getBonusNum(statStr, 'Parry'), cover: getBonusNum(statStr, 'Cover') };
    } else {
      result[name] = null;
    }
  }
  return result;
}

async function getGearByLabel(sections, labelRx) {
  const line = sections.find(s => labelRx.test(s));
  if (!line) return {};
  const raw   = line.replace(labelRx, '').replace(NEW_LINE, ' ').trim();
  const items = splitRespectingParens(raw).filter(Boolean);
  return parseGear(items);
}

async function getGear(sections) {
  return getGearByLabel(sections, new RegExp(`${loc('sbi.parser.Gear') || 'Gear'}:`, 'i'));
}

// ============================================================
// PARSER — EXTENDED SECTIONS (savagedus / homebrew)
// ============================================================
function getLanguageSection(sections) {
  const skills = {};
  for (const label of ['Languages Known:', 'Language:']) {
    const line = sections.find(s => s.toLowerCase().startsWith(label.toLowerCase()));
    if (!line) continue;
    const raw = line.slice(label.length).trim();
    splitRespectingParens(raw).forEach(part => {
      const m = part.match(/^([^(,]+)(?:\([^,)]+,\s*d(\d+)\))?/i);
      if (!m) return;
      const langName = m[1].trim();
      const sides    = m[2] ? parseInt(m[2]) : 6;
      if (langName) skills[`language (${langName.toLowerCase()})`] = { sides, modifier: 0 };
    });
  }
  return skills;
}

function getCyberwareSection(sections) {
  const line = sections.find(s => /^cyberware:?\s/i.test(s) || /^cyberware$/i.test(s.split(' ')[0]));
  if (!line) return {};
  const raw   = line.replace(/^cyberware:?\s*/i, '').trim();
  const lines = splitAbilityLines(raw);
  const result = {};
  for (const el of lines) {
    const colonIdx = el.indexOf(':');
    if (colonIdx < 0) continue;
    const name = el.slice(0, colonIdx).trim();
    if (name && !result[name]) result[name] = el.slice(colonIdx + 1).trim();
  }
  return result;
}

function getCurrencyFromSections(sections) {
  const line = sections.find(s => /^current wealth:/i.test(s));
  if (!line) return undefined;
  const n = parseFloat(line.replace(/^current wealth:/i, '').trim());
  return isNaN(n) ? undefined : n;
}

function getSystemDefinedStats(sections) {
  const extra  = getActorAdditionalStats();
  const result = {};
  for (const key in extra) {
    const { label, dtype } = extra[key];
    const line = sections.find(l => l.startsWith(label));
    if (!line) continue;
    const val = line.replace(/^[^:]+:/, '').replace(';', '').trim();
    if (dtype === 'String') result[label.trim()] = val;
    else if (dtype === 'Number') result[label.trim()] = parseInt(val, 10);
    else if (dtype === 'Die')    result[label.trim()] = buildTraitDie(val);
  }
  return result;
}

// ============================================================
// VEHICLE STAT BLOCK PARSER
// ============================================================

/** Returns true when raw text looks like a vehicle stat block (not a character). */
export function isVehicleStatBlock(raw) {
  if (!raw?.trim()) return false;
  const t = normalizeStatBlock(raw).text;
  return /Acc\/Top Speed:/i.test(t) || (/Handling:/i.test(t) && /Crew:/i.test(t));
}

/**
 * Parse a SWADE vehicle stat block into a structured object.
 * Handles the standard format:
 *   Name
 *   Acc/Top Speed: X/Y; Handling: ±N; Toughness: N (N); Crew: N+N
 *   Mods: N; Cost: $N
 *   [Notes: description]
 *   [Weapons: ...]
 *   [Special Abilities: ...]
 */
export async function parseVehicleStatBlock(raw) {
  const { text } = normalizeStatBlock(raw);
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Name: first line that isn't a stat line
  const STAT_PATTERN = /^(Acc\/Top Speed|Handling|Toughness|Crew|Mods|Cost|Driver|Size|Classification|Notes?|Weapons?|Special Abilities?|Gear):/i;
  let name = 'Unknown Vehicle';
  for (const l of lines) {
    if (!STAT_PATTERN.test(l) && !/^[•■]/.test(l)) { name = l; break; }
  }

  // Helper: find first regex match across all lines, return specified capture group
  const findIn = (rx, group = 1, def = '') => {
    for (const l of lines) {
      const m = l.match(rx);
      if (m) return (m[group] ?? '').trim() || def;
    }
    return def;
  };
  const findNum = (rx, group = 1, def = 0) => {
    const v = findIn(rx, group, String(def));
    return parseInt(String(v).replace(/[\$,\+]/g, '').replace(/[−–]/g, '-')) || def;
  };

  // Acc/Top Speed: X/Y — we need Y (top speed)
  let topSpeed = 0;
  for (const l of lines) {
    const m = l.match(/Acc\/Top Speed:\s*\d+\/(\d+)/i);
    if (m) { topSpeed = parseInt(m[1]) || 0; break; }
  }

  // Handling: +N or -N (also handle Unicode minus/dash)
  let handling = 0;
  for (const l of lines) {
    const m = l.match(/Handling:\s*([+\-−–]?\d+)/i);
    if (m) { handling = parseInt(m[1].replace(/[−–]/g, '-')) || 0; break; }
  }

  // Toughness: N (N)
  let toughnessTotal = 0, toughnessArmor = 0;
  for (const l of lines) {
    const m = l.match(/Toughness:\s*(\d+)(?:\s*\((\d+)\))?/i);
    if (m) {
      toughnessTotal = parseInt(m[1]) || 0;
      toughnessArmor = m[2] ? parseInt(m[2]) || 0 : 0;
      break;
    }
  }

  // Crew: N+N or N
  let crewRequired = 1, crewOptional = 0;
  for (const l of lines) {
    const m = l.match(/Crew:\s*(\d+)(?:\+(\d+))?/i);
    if (m) {
      crewRequired  = parseInt(m[1]) || 1;
      crewOptional  = m[2] ? parseInt(m[2]) || 0 : 0;
      break;
    }
  }

  const size           = findNum(/Size:\s*([+\-−–]?\d+)/i, 1, 0);
  const classification = findIn(/Classification:\s*(.+)$/i);
  const driverSkill    = findIn(/Driver(?:\s+Skill)?:\s*(.+)$/i) || 'Driving';
  const modsMax        = findNum(/Mods?:\s*(\d+)/i, 1, 0);
  const cargoMax       = findNum(/Cargo:\s*(\d+)/i, 1, 0);
  const woundsMax      = findNum(/Wounds?(?:\s+Max)?:\s*(\d+)/i, 1, 3);

  // Cost: remove $ and commas
  let cost = 0;
  for (const l of lines) {
    const m = l.match(/Cost:\s*\$?([\d,]+)/i);
    if (m) { cost = parseInt(m[1].replace(/,/g, '')) || 0; break; }
  }

  // Notes / description (may be multi-line until a known section header)
  let description = '';
  const notesIdx = lines.findIndex(l => /^Notes?:/i.test(l));
  if (notesIdx >= 0) {
    const parts = [lines[notesIdx].replace(/^Notes?:\s*/i, '').trim()];
    let j = notesIdx + 1;
    while (j < lines.length &&
           !STAT_PATTERN.test(lines[j]) &&
           !/^[•■]/.test(lines[j])) {
      parts.push(lines[j]);
      j++;
    }
    description = parts.filter(Boolean).join(' ').trim();
  }

  // Weapons and Special Abilities — reuse the section parsers from character parsing
  const sections  = getSections(text);
  const weapons   = await getGearByLabel(sections, /^weapons?:/i);
  const abilities = getAbilityList(sections, 'SpecialAbilities');
  const gear      = await getGear(sections);

  return {
    name, classification, size,
    topSpeed, handling,
    toughnessTotal, toughnessArmor,
    crewRequired, crewOptional,
    driverSkill, modsMax, cost, woundsMax, cargoMax,
    description, weapons, abilities, gear,
  };
}

// ============================================================
// FORMAT DETECTION & NORMALIZATION
// ============================================================

/** Detect the format of a raw stat block string. */
export function detectFormat(raw) {
  const t = raw.trim();
  if (t.startsWith('{')) return 'json';
  // Markdown: bold labels like **Attributes**: or ## headers
  if (/^\*\*[A-Za-z]/m.test(t) || /^## /m.test(t)) return 'markdown';
  // Savaged.us full page export: has the analyzer header or both Statblock + Analysis headers
  if (/SWADE Statblock Analyzer/i.test(t) ||
      (/^Analysis\s*$/mi.test(t) && /^Statblock\s*$/mi.test(t))) return 'savedus-plain';
  return 'pinnacle';
}

/**
 * Normalize any supported format to Pinnacle plain text.
 * Returns { text: string, format: string, image: string|null }
 */
export function normalizeStatBlock(raw) {
  const format = detectFormat(raw.trim());
  switch (format) {
    case 'json':         return _normalizeSavagedJSON(raw);
    case 'markdown':     return { text: _normalizeMarkdown(raw), format, image: null };
    case 'savedus-plain':return { text: _normalizeSavagedPlain(raw), format, image: null };
    default:             return { text: raw, format: 'pinnacle', image: null };
  }
}

/** Strip savaged.us page wrapper noise; body parses as Pinnacle. */
function _normalizeSavagedPlain(raw) {
  let text = raw
    .replace(/^SWADE Statblock Analyzer\s*$/mi, '')
    .replace(/^Statblock\s*$/mi, '');
  // Truncate at Analysis or Summary sections (savaged.us analysis output)
  const stopIdx = ['Analysis', 'Summary'].reduce((min, kw) => {
    const i = text.search(new RegExp(`^${kw}\\s*$`, 'mi'));
    return i >= 0 && i < min ? i : min;
  }, Infinity);
  if (stopIdx !== Infinity) text = text.substring(0, stopIdx);
  // Inline "Background X Description Y" on one line — split to separate lines
  text = text.replace(/^(.*?)\s+Background\s+(.*?)(?:\s+Description\s+(.*))?$/m, (_, prof, bg, desc) => {
    const bio = [bg, desc].filter(Boolean).join(' ');
    return prof.trim() + (bio ? '\n' + bio : '');
  });
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/** Convert savaged.us Markdown export to Pinnacle plain text. */
function _normalizeMarkdown(raw) {
  return raw
    // Strip BBCode URL tags (savaged.us footer)
    .replace(/\[URL="[^"]*"\]([^\[]*)\[\/URL\]/gi, '$1')
    // Strip "Created with ..." footer line
    .replace(/^Created with\s.*$/mi, '')
    // # or ## or ### headers → plain text
    .replace(/^#{1,3}\s+/gm, '')
    // **Bold**: label at start of line → Label:
    .replace(/^\*\*([^*]+?)\*\*\s*:/gm, '$1:')
    // List item with bold label "- **Name:** desc" → "• Name: desc"
    .replace(/^-\s+\*\*([^*:]+?):\*\*\s*/gm, '• $1: ')
    // Remaining inline **bold** → plain
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    // Plain markdown list items "- text" → "• text"
    .replace(/^-\s+/gm, '• ')
    // Horizontal rules
    .replace(/^\*\s*\*\s*\*\s*$/gm, '')
    .replace(/^---+\s*$/gm, '')
    // Tidy blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Convert savaged.us JSON export to Pinnacle plain text. */
function _normalizeSavagedJSON(raw) {
  let d;
  try { d = JSON.parse(raw); } catch { return { text: raw, format: 'json', image: null }; }

  const RANK_NAMES = ['Novice', 'Seasoned', 'Veteran', 'Heroic', 'Legendary'];
  const lines = [];

  // Name line (Wild Card prefix if applicable)
  const wcPrefix = d.wildcard ? '[WC] ' : '';
  lines.push(wcPrefix + (d.name || 'Unknown'));

  // Profession / race / rank context line
  if (d.raceGenderAndProfession) {
    lines.push(d.raceGenderAndProfession);
  } else if (d.rank !== undefined) {
    lines.push(RANK_NAMES[d.rank] ?? '');
  }

  // Biography
  const bio = (d.background || d.description || '').trim();
  if (bio) lines.push(bio);

  lines.push('');

  // Attributes — filter to core 5, use label (with trim) then value
  const ATTR_KEYS = ['agility', 'smarts', 'spirit', 'strength', 'vigor'];
  const attrs = (d.attributes ?? [])
    .filter(a => ATTR_KEYS.includes(a.name?.toLowerCase()))
    .map(a => {
      const lbl = (a.label ?? a.name ?? '').trim();
      const mod = a.mod && a.mod !== 0 ? (a.mod > 0 ? `+${a.mod}` : String(a.mod)) : '';
      return `${lbl} ${a.value}${mod}`;
    });
  if (attrs.length) lines.push('Attributes: ' + attrs.join(', '));

  // Skills — exclude Unskilled, dieValue < 4
  const skills = (d.skills ?? [])
    .filter(s => !['(unskilled)', 'unskilled'].includes(s.name?.toLowerCase()) && (s.dieValue ?? 0) >= 4)
    .map(s => `${s.name} ${s.value}`);
  if (skills.length) lines.push('Skills: ' + skills.join(', '));

  // Derived stats
  const derived = [];
  if (d.paceTotal  != null) derived.push(`Pace: ${d.paceTotal}`);
  if (d.parryTotal != null) derived.push(`Parry: ${d.parryTotal}`);
  if (d.toughnessAsRead)    derived.push(`Toughness: ${d.toughnessAsRead}`);
  else if (d.toughnessTotal != null) derived.push(`Toughness: ${d.toughnessTotal}`);
  if (derived.length) lines.push(derived.join('; '));

  // Hindrances
  const hindrances = (d.hindrances ?? []).map(h => h.name).filter(Boolean);
  if (hindrances.length) lines.push('Hindrances: ' + hindrances.join(', '));

  // Edges
  const edges = (d.edges ?? []).map(e => e.name).filter(Boolean);
  if (edges.length) lines.push('Edges: ' + edges.join(', '));

  // Powers and Power Points
  const powers = (d.powers ?? []).map(p => p.name).filter(Boolean);
  if (powers.length) {
    lines.push('Powers: ' + powers.join(', '));
    if (d.powerPoints != null) lines.push(`Power Points: ${d.powerPoints}`);
  }

  // Armor (equipped only, excluding Unarmored)
  const armors = (d.armor ?? []).filter(a => a.equipped && !['(unarmored)', 'unarmored'].includes(a.name?.toLowerCase()));
  if (armors.length) {
    lines.push('Armor: ' + armors.map(a => `${a.name} (Armor ${a.armor})`).join('; '));
  }

  // Weapons
  const weapons = (d.weapons ?? []).map(w => {
    const parts = [];
    const rangeStr = (w.range ?? '').toLowerCase();
    if (!rangeStr || rangeStr === 'melee') parts.push('Range Melee');
    else parts.push(`Range ${w.range}`);
    if (w.damage) parts.push(`Damage ${w.damage}`);
    if (w.rof   && w.rof > 1) parts.push(`RoF ${w.rof}`);
    if (w.ap    && w.ap > 0)  parts.push(`AP ${w.ap}`);
    return `${w.name} (${parts.join(', ')})`;
  });
  if (weapons.length) lines.push('Weapons: ' + weapons.join('; '));

  // Gear
  const gear = (d.gear ?? []).map(g => g.name).filter(Boolean);
  if (gear.length) lines.push('Gear: ' + gear.join('; '));

  // Currency
  if (d.wealthFormatted) lines.push('Current Wealth: ' + d.wealthFormatted);

  // Special Abilities (deduplicated by name)
  const seen = new Set();
  const abilities = (d.abilities ?? []).filter(a => {
    if (!a.name || seen.has(a.name)) return false;
    seen.add(a.name);
    return true;
  });
  if (abilities.length) {
    lines.push('Special Abilities:');
    for (const ab of abilities) {
      lines.push(`• ${ab.name}: ${(ab.description ?? '').replace(/\n/g, ' ').trim()}`);
    }
  }

  const text  = lines.join('\n');
  const image = (typeof d.image === 'string' && d.image.startsWith('http')) ? d.image : null;
  return { text, format: 'json', image };
}

// ============================================================
// MASTER PARSER
// ============================================================
async function parseStatBlock(raw) {
  // Normalize format before parsing — transparent to callers
  const { text } = normalizeStatBlock(raw);
  const sections = getSections(text);
  const specialAbilities  = getAbilityList(sections, 'SpecialAbilities');
  const superPowers       = getAbilityList(sections, 'SuperPowers');
  const cyberwareAbilities = getCyberwareSection(sections);
  const languageSkills    = getLanguageSection(sections);
  const weaponsGear       = await getGearByLabel(sections, /^weapons:/i);
  const armorGear         = await getGearByLabel(sections, /^armor:/i);
  const shieldGear        = await getGearByLabel(sections, /^shield:/i);
  const currency          = getCurrencyFromSections(sections);
  const gear              = await getGear(sections);

  const actor = {
    name:             getName(text),
    biography:        getBio(text, sections),
    attributes:       getAttributes(sections),
    skills:           getSkills(sections),
    pace:             getDerivedStat(sections, 'Pace'),
    toughness:        getToughness(sections),
    parry:            getDerivedStat(sections, 'Parry'),
    powerPoints:      getDerivedStat(sections, 'PowerPoints'),
    edges:            getListStat(sections, 'Edges'),
    hindrances:       getListStat(sections, 'Hindrances'),
    powers:           getListStat(sections, 'Powers'),
    specialAbilities,
    superPowers,
    cyberwareAbilities,
    languageSkills,
    weapons:  weaponsGear,
    armors:   armorGear,
    shields:  shieldGear,
    gear,
    currency,
  };

  Object.assign(actor, getSystemDefinedStats(sections));
  actor.size = getSize(actor.specialAbilities ?? {});
  if (!actor.powerPoints && actor.specialAbilities) {
    actor.powerPoints = powerPointsFromSpecialAbility(actor.specialAbilities) ?? 0;
  }
  return actor;
}

// ============================================================
// DATA BUILDER HELPERS
// ============================================================


export {
  getSections, getName, getBio,
  buildTraitDie, getAttributes, getSkills,
  getDerivedStat, getToughness, getSize, powerPointsFromSpecialAbility,
  getListStat, getAbilityList,
  parseGearItem, parseWeaponStats, getBonusNum, getArmorBonus, parseGear,
  getGearByLabel, getGear,
  getLanguageSection, getCyberwareSection, getCurrencyFromSections, getSystemDefinedStats,
  parseStatBlock,
};
