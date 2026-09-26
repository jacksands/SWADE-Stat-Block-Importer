// lib/exporter.mjs — stat block export and analysis
import { capitalize, loc, isEmpty, stripHtml, S, getSetting, splitAbilityLines, splitRespectingParens } from '../utils.mjs';
import { getSections, getName, normalizeStatBlock, isVehicleStatBlock, parseVehicleStatBlock } from './parser.mjs';

// EXPORT — ACTOR TO STAT BLOCK
// ============================================================
function fmtMod(mod) { if (!mod) return ''; return mod > 0 ? `+${mod}` : `${mod}`; }

function exportWeapon(w) {
  const sys   = w.system;
  const parts = [];
  if (sys.range)  parts.push(`Range ${sys.range}`);
  if (sys.damage) parts.push(`Damage ${sys.damage.replace(/@str/gi, 'Str')}`);
  if (sys.rof != null) parts.push(`RoF ${sys.rof}`);
  if (sys.ap)     parts.push(`AP ${sys.ap}`);
  return parts.length ? `${w.name} (${parts.join(', ')})` : w.name;
}
function exportArmor(a)  { const b = a.system?.armor ?? 0; return b ? `${a.name} (Armor ${b})` : a.name; }
function exportShield(s) {
  const parts = [];
  if (s.system?.parry) parts.push(`Parry +${s.system.parry}`);
  if (s.system?.cover) parts.push(`Cover +${s.system.cover}`);
  return parts.length ? `${s.name} (${parts.join(', ')})` : s.name;
}

function actorToStatBlock(actor) {
  const sys   = actor.system;
  const items = actor.items.contents;
  const isWC  = sys.wildcard ?? (actor.type === 'character');
  const lines = [];

  lines.push(`${isWC ? '[WC] ' : ''}${actor.name}`);
  const bio = stripHtml(sys.details?.biography?.value);
  if (bio) { lines.push(''); lines.push(bio); }
  lines.push('');

  const at = sys.attributes;
  lines.push(`Attributes: Agility d${at.agility.die.sides}${fmtMod(at.agility.die.modifier)}, Smarts d${at.smarts.die.sides}${fmtMod(at.smarts.die.modifier)}, Spirit d${at.spirit.die.sides}${fmtMod(at.spirit.die.modifier)}, Strength d${at.strength.die.sides}${fmtMod(at.strength.die.modifier)}, Vigor d${at.vigor.die.sides}${fmtMod(at.vigor.die.modifier)}`);

  const skills = items.filter(i => i.type === 'skill').sort((a, b) => a.name.localeCompare(b.name));
  if (skills.length) lines.push(`Skills: ${skills.map(s => `${s.name} d${s.system.die.sides}${fmtMod(s.system.die.modifier)}`).join(', ')}`);

  const pace  = sys.pace?.ground ?? 6;
  const parry = sys.stats?.parry?.value ?? 0;
  const tough = sys.stats?.toughness?.value ?? 0;
  const armor = sys.stats?.toughness?.armor ?? 0;
  lines.push(`Pace: ${pace}; Parry: ${parry}; Toughness: ${armor ? `${tough} (${armor})` : tough}`);

  const hindrances = items.filter(i => i.type === 'hindrance');
  lines.push(hindrances.length
    ? `Hindrances: ${hindrances.map(h => h.name + (h.system.major ? ' (Major)' : ' (Minor)')).join(', ')}`
    : 'Hindrances: —');

  const edges = items.filter(i => i.type === 'edge');
  lines.push(edges.length ? `Edges: ${edges.map(e => e.name).join(', ')}` : 'Edges: —');

  const powers = items.filter(i => i.type === 'power');
  const pp     = sys.powerPoints?.general;
  if (powers.length) {
    let s = `Powers: ${powers.map(p => p.name.toLowerCase()).join(', ')}.`;
    if (pp?.max) s += ` Power Points: ${pp.max}`;
    lines.push(s);
  }

  const weapons  = items.filter(i => i.type === 'weapon');
  if (weapons.length) lines.push(`Weapons: ${weapons.map(exportWeapon).join('; ')}`);
  const equippedArmors = items.filter(i => i.type === 'armor' && !i.system?.isNaturalArmor);
  if (equippedArmors.length) lines.push(`Armor: ${equippedArmors.map(exportArmor).join('; ')}`);
  const shields = items.filter(i => i.type === 'shield');
  if (shields.length) lines.push(`Shield: ${shields.map(exportShield).join('; ')}`);
  const gear = items.filter(i => i.type === 'gear');
  if (gear.length) lines.push(`Gear: ${gear.map(g => g.name).join('; ')}`);

  const abilities  = items.filter(i => i.type === 'ability');
  const natArmors  = items.filter(i => i.type === 'armor' && i.system?.isNaturalArmor);
  const allSA      = [
    ...abilities,
    ...natArmors.map(a => ({ name: `Armor +${a.system.armor}`, system: { description: a.system.description ?? '' } }))
  ].sort((a, b) => a.name.localeCompare(b.name));
  if (allSA.length) {
    lines.push('Special Abilities:');
    for (const ab of allSA) {
      const desc = stripHtml(ab.system?.description);
      lines.push(desc ? `• ${ab.name}: ${desc}` : `• ${ab.name}.`);
    }
  }

  return lines.join('\n');
}

// ============================================================
// ANALYZER
// ============================================================
function analyzeStatBlock(raw) {
  const result = { valid: false, error: null, name: '', isWildCard: false, format: 'pinnacle', extractedImage: null, sections: {}, warnings: [], counts: {} };
  try {
    const { text, format, image } = normalizeStatBlock(raw);
    result.format         = format;
    result.extractedImage = image;
    const sections       = getSections(text);
    result.valid         = true;
    result.name          = getName(text);
    result.isWildCard    = text.trim().startsWith('[WC]');

    const check = (key, rx) => {
      const found = sections.find(s => rx.test(s));
      if (found) result.sections[key] = found.replace(rx, '').trim();
      return !!found;
    };
    check('attributes',  /^Attributes:/i);
    check('skills',      /^Skills:/i);
    check('hindrances',  /^Hindrances:/i);
    check('edges',       /^Edges:/i);
    check('powers',      /^Powers:/i);
    check('gear',        /^Gear:/i);
    check('specials',    new RegExp(`^${loc('sbi.parser.SpecialAbilities') || 'Special Abilities'}:?`, 'i'));
    check('weapons',     /^Weapons:/i);
    check('armor',       /^Armor:/i);
    check('shield',      /^Shield:/i);
    check('language',    /^Languages? Known:/i);
    check('cyberware',   /^Cyberware:/i);

    if (result.sections.attributes) result.counts.attributes = result.sections.attributes.split(',').filter(Boolean).length;
    if (result.sections.skills)     result.counts.skills     = result.sections.skills.split(',').filter(Boolean).length;
    if (result.sections.specials) {
      const parts = splitAbilityLines(result.sections.specials);
      result.counts.specials = parts.filter(s => s.length > 2).length;
    }
    if (result.sections.weapons) result.counts.weapons = splitRespectingParens(result.sections.weapons).length;

    if (!result.sections.attributes) result.warnings.push('No Attributes: section — is this a SWADE stat block?');
    if (!result.sections.skills)     result.warnings.push('No Skills: section detected');
    if (result.sections.specials && result.counts.specials === 0) {
      result.warnings.push(`Special Abilities found but no entries detected. Current bullet setting: "${getSetting(S.bulletPointIcons) || '•'}". Try adding the bullet character used in the stat block.`);
    }
    if (result.sections.specials?.match(/\beakness\b/i)) {
      result.warnings.push('Possible OCR error: "eakness" detected — should be "Weakness"');
    }
    ['Agility','Smarts','Spirit','Strength','Vigor'].forEach(attr => {
      if (result.sections.attributes && !result.sections.attributes.includes(attr)) {
        result.warnings.push(`Attribute "${attr}" not found`);
      }
    });
  } catch(e) {
    result.valid = false;
    result.error = e.message;
  }
  return result;
}

function renderAnalysis(result) {
  if (!result.valid) {
    return `<div style="color:#c55;padding:8px;border:1px solid #c55;border-radius:4px;margin-top:6px;">
      ❌ <strong>Parse error:</strong> ${result.error}
    </div>`;
  }
  const icon   = has => has ? '✅' : '<span style="opacity:0.4">⚪</span>';
  const row    = (key, label, count) => {
    const has = !!result.sections[key];
    const ct  = count != null ? ` <em style="opacity:0.7">(${count})</em>` : '';
    return `<li style="margin:1px 0;">${icon(has)} ${label}${ct}</li>`;
  };
  const FORMAT_LABELS = { pinnacle:'Pinnacle', json:'Savaged.us JSON', markdown:'Savaged.us Markdown', 'savedus-plain':'Savaged.us Plain Text' };
  let html = `<div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:8px;margin-top:6px;font-size:12px;">`;
  html += `<div style="font-weight:bold;margin-bottom:2px;">${result.isWildCard ? '[WC] ' : ''}${result.name}</div>`;
  html += `<div style="font-size:10px;opacity:0.6;margin-bottom:4px;">Format: ${FORMAT_LABELS[result.format] ?? result.format}</div>`;
  html += `<ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;">`;
  html += row('attributes', 'Attributes', result.counts.attributes);
  html += row('skills',     'Skills',     result.counts.skills);
  html += row('hindrances', 'Hindrances');
  html += row('edges',      'Edges');
  html += row('powers',     'Powers');
  html += row('gear',       'Gear');
  html += row('specials',   'Special Abilities', result.counts.specials);
  html += row('weapons',    'Weapons',    result.counts.weapons);
  html += row('armor',      'Armor');
  html += row('shield',     'Shield');
  html += row('language',   'Language');
  html += row('cyberware',  'Cyberware');
  html += '</ul>';
  if (result.warnings.length) {
    html += `<div style="margin-top:6px;color:#c90;font-size:11px;"><strong>⚠ Warnings</strong><ul style="margin:2px 0;padding-left:1.2em;">`;
    result.warnings.forEach(w => html += `<li>${w}</li>`);
    html += '</ul></div>';
  } else {
    html += `<div style="color:#4a4;margin-top:4px;font-size:11px;">✅ No issues detected — ready to import.</div>`;
  }
  html += '</div>';
  return html;
}

// ============================================================
// VEHICLE ANALYSIS
// ============================================================

export async function analyzeVehicleStatBlock(raw) {
  const result = {
    valid: false, error: null,
    name: '', format: 'vehicle', classification: '',
    toughnessTotal: 0, toughnessArmor: 0,
    handling: 0, topSpeed: 0,
    crewRequired: 0, crewOptional: 0, driverSkill: '',
    size: 0, modsMax: 0,
    hasWeapons: false, hasAbilities: false,
  };
  try {
    const parsed = await parseVehicleStatBlock(raw);
    result.valid          = !!(parsed.name && (parsed.toughnessTotal || parsed.topSpeed || parsed.handling));
    result.name           = parsed.name;
    result.classification = parsed.classification;
    result.toughnessTotal = parsed.toughnessTotal;
    result.toughnessArmor = parsed.toughnessArmor;
    result.handling       = parsed.handling;
    result.topSpeed       = parsed.topSpeed;
    result.crewRequired   = parsed.crewRequired;
    result.crewOptional   = parsed.crewOptional;
    result.driverSkill    = parsed.driverSkill;
    result.size           = parsed.size;
    result.modsMax        = parsed.modsMax;
    result.hasWeapons     = Object.keys(parsed.weapons  ?? {}).length > 0;
    result.hasAbilities   = Object.keys(parsed.abilities ?? {}).length > 0;
  } catch(e) {
    result.error = e?.message ?? String(e);
  }
  return result;
}

export function renderVehicleAnalysis(result) {
  if (!result.valid && result.error) {
    return `<div style="color:var(--color-level-error,#e84030);font-size:12px;margin-top:6px;">⚠ ${result.error}</div>`;
  }
  if (!result.valid) {
    return `<div style="color:var(--color-level-error,#e84030);font-size:12px;margin-top:6px;">⚠ Could not find vehicle stats — check format (Acc/Top Speed, Handling, Crew required).</div>`;
  }
  const handlingStr = result.handling >= 0 ? `+${result.handling}` : String(result.handling);
  const crewStr     = result.crewOptional > 0 ? `${result.crewRequired}+${result.crewOptional}` : String(result.crewRequired);
  const tnStr       = result.toughnessArmor ? `${result.toughnessTotal} (${result.toughnessArmor})` : String(result.toughnessTotal);
  const detailFlags = [
    result.hasWeapons   ? '✓ Weapons'          : '',
    result.hasAbilities ? '✓ Special Abilities' : '',
    result.modsMax      ? `Mods: ${result.modsMax}` : '',
  ].filter(Boolean).join(' · ');

  return `<div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:8px;margin-top:6px;font-size:12px;">
  <div style="font-weight:bold;margin-bottom:2px;">${result.name}</div>
  <div style="font-size:10px;opacity:0.6;margin-bottom:6px;">Vehicle${result.classification ? ` · ${result.classification}` : ''}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;">
    <span>🛡 Toughness: ${tnStr}</span><span>⚡ Top Speed: ${result.topSpeed}</span>
    <span>🎯 Handling: ${handlingStr}</span><span>👥 Crew: ${crewStr}</span>
    ${result.driverSkill ? `<span>🚗 Driver Skill: ${result.driverSkill}</span>` : ''}
    ${result.size ? `<span>📏 Size: ${result.size}</span>` : ''}
  </div>
  ${detailFlags ? `<div style="margin-top:6px;opacity:0.65;font-size:10px;">${detailFlags}</div>` : ''}
  <div style="color:#4a4;margin-top:4px;font-size:11px;">✅ Vehicle detected — ready to import.</div>
</div>`;
}

// ============================================================

export { fmtMod, exportWeapon, exportArmor, exportShield, actorToStatBlock, analyzeStatBlock, renderAnalysis };
