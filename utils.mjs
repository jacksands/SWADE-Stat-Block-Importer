// utils.mjs — shared constants, utilities, CSS
const MODULE_ID = 'swade-stat-block-importer';
const S = {
  packageToUse:              'packageToUse',
  compsToUse:                'compsToUse',
  activeCompendiums:         'activeCompendiums',
  defaultActorType:          'defaultActorType',
  defaultIsWildcard:         'defaultIsWildcard',
  numberOfBennies:           'numberOfBennies',
  bulletPointIcons:          'bulletPointIcons',
  modifiedSpecialAbs:        'modSpecialAbs',
  allAsSpecialAbilities:     'allAsSpecialAbilities',
  autoCalcToughness:         'autoCalcToughness',
  autoCalcSize:              'autoCalcSize',
  calculateIgnoredWounds:    'calculateIgnoredWounds',
  calculateAdditionalWounds: 'calculateAdditionalWounds',
  twoHandsNotation:          'twoHandsNotation',
  lastSaveFolder:            'lastSaveFolder',
  tokenSettings:             'tokenSettings',
  additionalTraits:          'additionalTraits',
  renderSheet:               'renderSheet',
  imgUploadPath:             'imgUploadPath',
  refEdges:                  'refEdges',
  refPowers:                 'refPowers',
  refAbilities:              'refAbilities',
  sbiLibrary:                'sbiLibrary',
};
const NEW_LINE = /\r\n|\n|\r/g;
const ARMOR_MOD = /\+\d+/;

// ============================================================
// UTILITIES
// ============================================================
function loc(key)          { return game.i18n?.localize(key) ?? key; }
function uiInfo(msg)       { ui.notifications?.info(msg); }
function uiError(msg)      { ui.notifications?.error(msg); }
function getSetting(key)   { try { return game.settings.get(MODULE_ID, key); } catch { return undefined; } }
async function setSetting(key, v) { return game.settings.set(MODULE_ID, key, v); }
function isEmpty(o)        { return o == null || (typeof o === 'object' && Object.keys(o).length === 0); }
function stripHtml(html)   { return (html ?? '').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').trim(); }

function capitalize(s)        { return s.replace(/(?:^|\s)\S/g, a => a.toUpperCase()); }
function capitalizeEveryWord(s) {
  return s.split(' ').map(w => capitalize(w.toLowerCase())).join(' ').replace(/[-()][a-z]| [a-z]/g, m => m.toUpperCase());
}
function splitAndTrim(str, sep) {
  return str.split(sep).map(i => i.replace(NEW_LINE, ' ').trim()).filter(i => i.length > 0 && /[a-zA-Z]/.test(i));
}
function splitAndSort(text) {
  return text.split(/[\s,]+/).map(x => x.toLowerCase().trim()).sort().filter(s => /[a-zA-Z]/.test(s));
}
function cleanKeyName(key) { return key.replace(/^@([aehw]|sa)/, '').toLowerCase().trim(); }

// Splits a comma-separated string respecting parentheses.
// Uses ';' as primary separator if present, then comma-aware fallback.
function splitRespectingParens(str) {
  if (!str) return [];
  if (str.includes(';')) return splitAndTrim(str, ';');
  const result = [];
  let depth = 0, current = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (depth === 0 && ch === ',' && i + 1 < str.length && str[i + 1] === ' ') {
      result.push(current.trim());
      current = ''; i++; continue;
    }
    current += ch;
  }
  if (current.trim()) result.push(current.trim());
  return result.filter(s => /[a-zA-Z]/.test(s));
}

// Builds bullet-split regex from the setting string (e.g. '•|■')
function buildBulletRegex() {
  const raw = getSetting(S.bulletPointIcons) || '•';
  const parts = raw.split('|').filter(Boolean).map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(parts.join('|'), 'g');
}

// Splits Special Abilities text, with fallback for no-bullet format
function splitAbilityLines(raw) {
  const bulletRx = buildBulletRegex();
  const parts = splitAndTrim(raw, bulletRx).filter(s => s.length > 2);
  if (parts.length > 1) return parts;
  // Fallback: split on ". Name:" pattern (handles PDF copies without bullets)
  const fallback = raw
    .split(/(?<=[.!?])\s+(?=[A-Za-z][a-zA-Z\s/\(\)\+\-\d]{1,50}:)/)
    .map(s => s.trim()).filter(s => /[a-zA-Z]/.test(s) && s.length > 2);
  if (fallback.length > 1) return fallback;
  // Third fallback: savagedus "Name [details] (source): desc." pattern — split on ". CapWord ["
  const svd = raw.split(/(?<=\.)\s+(?=[A-Z][a-zA-Z\s]+\s\[)/)
    .map(s => s.trim()).filter(s => /[a-zA-Z]/.test(s) && s.length > 2);
  if (svd.length > 1) return svd;
  return parts.length === 1 ? parts : [raw.trim()].filter(s => s.length > 2);
}

function injectCSS(id, css) {
  if (document.getElementById(id)) return;
  const el = Object.assign(document.createElement('style'), { id, textContent: css });
  document.head.appendChild(el);
}


const SBI_CSS = `
#sbi-root { font-size:13px; padding:4px 0; }
#sbi-root .sbi-tab-header { display:flex; align-items:center; border-bottom:2px solid rgba(255,255,255,0.1); margin-bottom:8px; gap:4px; }
#sbi-root .sbi-tabs { display:flex; gap:2px; flex:1; }
#sbi-root .sbi-tab-btn { padding:6px 18px; cursor:pointer; background:none; border:none; border-bottom:2px solid transparent;
  color:var(--color-text-primary,#ccc); margin-bottom:-2px; font-size:13px; }
#sbi-root .sbi-tab-btn.active { color:var(--color-level-warning,#d4a574); border-bottom-color:var(--color-level-warning,#d4a574); font-weight:bold; }
#sbi-root .sbi-tab-btn:hover { color:var(--color-text-hyperlink,#e8c090); }
#sbi-root .fg { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:4px 0; }
#sbi-root .fg label { min-width:110px; white-space:nowrap; }
#sbi-root .fr { display:flex; gap:12px; }
#sbi-root .sbi-footer { display:flex; justify-content:flex-end; gap:8px; padding:8px 0 2px; border-top:1px solid rgba(255,255,255,0.1); margin-top:6px; }
#sbi-root button { cursor:pointer; padding:4px 12px; border-radius:3px; }
#sbi-root button:disabled { opacity:0.4; cursor:not-allowed; }
#sbi-root #sbi-drop-zone { border:2px dashed rgba(255,255,255,0.2); border-radius:6px; padding:16px; text-align:center;
  color:rgba(255,255,255,0.4); margin-bottom:8px; transition:border-color .2s; user-select:none; }
#sbi-root #sbi-drop-zone.drag-over { border-color:var(--color-level-warning,#d4a574); color:var(--color-text-primary,#ccc); }
#sbi-root #sbi-search-results { list-style:none; padding:0; margin:0 0 6px; border:1px solid rgba(255,255,255,0.1);
  border-radius:4px; max-height:140px; overflow-y:auto; background:rgba(0,0,0,0.3); }
#sbi-root #sbi-search-results:empty { display:none; }
#sbi-root #sbi-search-results li { padding:4px 8px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05); }
#sbi-root #sbi-search-results li:hover { background:rgba(255,255,255,0.05); }
`;

const SBI_HELP_CSS = `
#sbi-help-root { font-size:13px; line-height:1.5; padding:0; }
#sbi-help-root .h-tabs { display:flex; flex-wrap:wrap; gap:2px; border-bottom:2px solid rgba(255,255,255,0.1); padding:4px 4px 0; background:rgba(0,0,0,0.2); }
#sbi-help-root .h-tab { padding:5px 12px; cursor:pointer; background:none; border:none; border-bottom:2px solid transparent; color:rgba(255,255,255,0.6); font-size:12px; margin-bottom:-2px; white-space:nowrap; }
#sbi-help-root .h-tab.active { color:var(--color-level-warning,#d4a574); border-bottom-color:var(--color-level-warning,#d4a574); font-weight:bold; }
#sbi-help-root .h-tab:hover:not(.active) { color:rgba(255,255,255,0.9); }
#sbi-help-root .h-pane { display:none; padding:12px; overflow-y:auto; }
#sbi-help-root .h-pane.active { display:block; }
#sbi-help-root h3 { color:var(--color-level-warning,#d4a574); margin:12px 0 4px; font-size:13px; text-transform:uppercase; letter-spacing:0.05em; }
#sbi-help-root h4 { margin:8px 0 2px; font-size:12px; }
#sbi-help-root p, #sbi-help-root li { margin:3px 0; font-size:12px; }
#sbi-help-root ul { padding-left:1.2em; margin:4px 0; }
#sbi-help-root code { background:rgba(0,0,0,0.4); padding:1px 4px; border-radius:3px; font-size:11px; font-family:monospace; }
#sbi-help-root pre { background:rgba(0,0,0,0.3); padding:8px; border-radius:4px; font-size:11px; overflow-x:auto; white-space:pre-wrap; border:1px solid rgba(255,255,255,0.1); }
#sbi-help-root .ref-wrap { position:relative; margin:6px 0; }
#sbi-help-root textarea.ref-area { width:100%; box-sizing:border-box; font-family:monospace; font-size:11px; background:rgba(0,0,0,0.3); color:#ccc; border:1px solid rgba(255,255,255,0.15); border-radius:4px; padding:6px; resize:vertical; min-height:320px; }
#sbi-help-root .ref-actions { display:flex; gap:6px; margin:4px 0 8px; flex-wrap:wrap; }
#sbi-help-root .ref-actions button { font-size:11px; padding:3px 10px; cursor:pointer; border-radius:3px; }
#sbi-help-root .hint { font-size:11px; color:rgba(255,255,255,0.5); margin:2px 0 6px; font-style:italic; }
#sbi-help-root .tag { display:inline-block; background:rgba(212,165,116,0.2); color:var(--color-level-warning,#d4a574); border-radius:3px; padding:1px 6px; font-size:11px; margin:1px 2px; }

#sbi-help-root .src-picker { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; }
#sbi-help-root .src-btn { padding:3px 10px; font-size:12px; border-radius:3px; opacity:0.65; border:1px solid rgba(255,255,255,0.15); cursor:pointer; }
#sbi-help-root .src-btn.active { opacity:1; border-color:var(--color-level-warning,#d4a574); background:rgba(212,165,116,0.15); font-weight:600; }
#sbi-help-root .src-btn.src-new { opacity:0.45; font-style:italic; }
#sbi-help-root .ref-actions { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; }
#sbi-help-root .src-action { padding:2px 8px; font-size:11px; cursor:pointer; border-radius:3px; }
#sbi-help-root .ref-list-mgmt { display:flex; gap:4px; margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.08); }
#sbi-help-root .src-readonly-notice { font-size:11px; opacity:0.55; padding:2px 4px; margin-bottom:4px; font-style:italic; }
#sbi-help-root .h-sub-tabs { display:flex; flex-wrap:wrap; gap:2px; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:4px; }
#sbi-help-root .h-sub-tab { padding:3px 10px; font-size:11px; border-radius:3px; opacity:0.6; cursor:pointer; background:none; border:none; color:inherit; }
#sbi-help-root .h-sub-tab.active { opacity:1; color:var(--color-level-warning,#d4a574); font-weight:600; border-bottom:2px solid var(--color-level-warning,#d4a574); }
#sbi-help-root .h-sub-pane { display:none; }
#sbi-help-root .h-sub-pane.active { display:block; }

/* Master copy bar */
#sbi-help-root .h-master-bar { display:flex; align-items:center; gap:10px; padding:5px 12px; background:rgba(212,165,116,0.08); border-bottom:1px solid rgba(212,165,116,0.2); }
#sbi-help-root .h-master-bar button { font-size:12px; padding:3px 12px; font-weight:600; background:rgba(212,165,116,0.18); border:1px solid var(--color-level-warning,#d4a574); color:var(--color-level-warning,#d4a574); border-radius:4px; cursor:pointer; white-space:nowrap; }
#sbi-help-root .h-master-bar button:hover { background:rgba(212,165,116,0.3); }

/* Ignore row */
#sbi-help-root .ignore-row { display:flex; align-items:center; gap:8px; margin:4px 0 8px; padding:4px 8px; background:rgba(0,0,0,0.15); border-radius:4px; border:1px solid rgba(255,255,255,0.06); }
#sbi-help-root .ignore-toggle { font-size:11px; padding:2px 10px; border-radius:3px; cursor:pointer; }

/* Setting rules pane */
#sbi-sr-pane .fg { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
#sbi-sr-pane input[type=number], #sbi-sr-pane input[type=text], #sbi-sr-pane textarea {
  background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); border-radius:4px;
  padding:4px 6px; color:inherit; font-size:12px; box-sizing:border-box; }
#sbi-sr-pane textarea { width:100%; resize:vertical; font-family:monospace; }
#sbi-sr-pane input[readonly], #sbi-sr-pane textarea[readonly] { opacity:0.55; cursor:not-allowed; }
#sbi-sr-pane input:disabled { opacity:0.6; cursor:not-allowed; }
#sbi-sr-pane button { font-size:12px; padding:3px 10px; cursor:pointer; border-radius:3px; }

/* Setting Rules - collapsible groups */
#sbi-sr-pane .sr-group { border:1px solid rgba(255,255,255,.08); border-radius:4px; overflow:hidden; margin-bottom:8px; }
#sbi-sr-pane .sr-group-summary { padding:6px 10px; background:rgba(255,255,255,.06); cursor:pointer; font-weight:600; display:flex; align-items:center; gap:8px; list-style:none; }
#sbi-sr-pane .sr-group-summary::-webkit-details-marker { display:none; }
#sbi-sr-pane .sr-group-help { font-size:10px; opacity:.6; font-weight:normal; flex:1; }
#sbi-sr-pane .sr-group-body { padding:8px 10px; display:flex; flex-direction:column; gap:6px; }

/* Rule rows */
#sbi-sr-pane .sr-rule-item { display:flex; flex-direction:column; gap:2px; }
#sbi-sr-pane .sr-rule-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
#sbi-sr-pane .sr-rule-head input[type=checkbox] { flex-shrink:0; margin:0; }
#sbi-sr-pane .sr-rule-label { flex:1; min-width:180px; cursor:pointer; }
#sbi-sr-pane .sr-rule-head input[type=number] { width:80px; }

/* Help buttons / text */
#sbi-sr-pane .sr-help-btn { flex-shrink:0; padding:0 6px; font-size:11px; opacity:.7; background:none; border:none; color:inherit; cursor:pointer; line-height:1.4; }
#sbi-sr-pane .sr-help-btn:hover { opacity:1; color:var(--color-level-warning,#d4a574); }
#sbi-sr-pane .sr-help-text { display:none; font-size:10px; opacity:.8; padding:2px 0 2px 4px; border-left:2px solid rgba(212,165,116,.35); margin-left:2px; }

/* Scrollable container */
#sbi-sr-pane .sr-scroll { max-height:min(46vh, 420px); overflow-y:auto; overflow-x:hidden; padding-right:4px; }

/* Footer buttons */
#sbi-sr-pane #sbi-sr-mgmt { display:none; gap:6px; margin:6px 0; padding-top:6px; border-top:1px solid rgba(255,255,255,.1); }

/* Setting rules ↔ profile link */
#sbi-sr-pane .sr-link-box { display:flex; flex-direction:column; gap:2px; margin:4px 0 10px; padding:6px 8px; background:rgba(0,0,0,.15); border:1px solid rgba(255,255,255,.06); border-radius:4px; }
#sbi-sr-pane .sr-link-box select { max-width:280px; }
#sbi-sr-pane .sr-link-hint { font-size:10px; opacity:.6; }

/* Usage Profiles pane */
#sbi-up-pane .up-meta-box { display:flex; flex-wrap:wrap; gap:8px; margin:8px 0; }
#sbi-up-pane .up-meta-box label { display:flex; flex-direction:column; font-size:11px; gap:2px; flex:1; min-width:180px; }
#sbi-up-pane .up-meta-box input { padding:3px 6px; font-size:12px; }
#sbi-up-pane .up-actions { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
#sbi-up-pane .up-actions button { font-size:11px; padding:3px 10px; cursor:pointer; border-radius:3px; }
#sbi-up-pane .up-link-box { display:flex; flex-direction:column; gap:2px; margin:0 0 10px; padding:6px 8px; background:rgba(0,0,0,.15); border:1px solid rgba(255,255,255,.06); border-radius:4px; }
#sbi-up-pane .up-link-box select { max-width:280px; }
#sbi-up-pane .up-hint { font-size:10px; opacity:.6; }
#sbi-up-pane .up-inline-btn { font-size:11px; padding:2px 10px; cursor:pointer; border-radius:3px; margin-left:4px; vertical-align:middle; }
#sbi-up-pane .up-scroll { max-height:min(42vh, 380px); overflow-y:auto; overflow-x:hidden; border:1px solid rgba(255,255,255,.08); border-radius:4px; }
#sbi-up-pane .up-table { width:100%; border-collapse:collapse; font-size:11px; }
#sbi-up-pane .up-table thead th { position:sticky; top:0; background:rgba(0,0,0,.5); padding:4px 6px; border-bottom:1px solid rgba(255,255,255,.15); text-align:center; }
#sbi-up-pane .up-table thead th:first-child { text-align:left; }
#sbi-up-pane .up-table td { padding:4px 6px; border-bottom:1px solid rgba(255,255,255,.05); vertical-align:top; }
#sbi-up-pane .up-table td:not(:first-child) { text-align:center; }
#sbi-up-pane .up-table td label { display:block; white-space:nowrap; cursor:pointer; }
#sbi-up-pane .up-cat { white-space:nowrap; }

/* Export / Import pane */
#sbi-ei-pane .ei-actions { display:flex; flex-wrap:wrap; gap:8px; margin:8px 0 14px; }
#sbi-ei-pane .ei-actions button { font-size:12px; padding:4px 14px; cursor:pointer; border-radius:3px; }

/* Export / Import dialogs */
#sbi-exp-root, #sbi-imp-root { padding:12px; font-size:12px; }
#sbi-exp-root .ei-intro, #sbi-imp-root .ei-intro { font-size:12px; opacity:.75; margin:0 0 10px; }
.ei-box { border:1px solid rgba(255,255,255,.1); border-radius:4px; padding:8px; margin-bottom:10px; display:flex; flex-direction:column; gap:4px; }
.ei-box-title { font-weight:600; font-size:12px; margin-bottom:2px; }
.ei-box label { font-size:12px; line-height:1.5; cursor:pointer; }
.ei-cat-grid { display:grid; grid-template-columns:1fr 1fr; gap:2px 12px; }
.ei-cat { font-size:12px; cursor:pointer; }
.ei-list-scroll { max-height:180px; overflow-y:auto; }
.ei-mini { font-size:10px; padding:0 6px; cursor:pointer; }
.ei-footer { display:flex; justify-content:flex-end; gap:8px; margin-top:6px; }
.ei-footer button { padding:4px 16px; cursor:pointer; border-radius:3px; }
.ei-secondary { opacity:.6; }
.ei-validation { border-radius:4px; padding:8px; margin-bottom:10px; font-size:11px; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.1); }
.ei-validation ul { margin:2px 0 6px 0; padding-left:1.2em; }
.ei-meta { opacity:.6; margin-bottom:6px; font-family:monospace; }
.ei-val-err strong { color:#e06050; }
.ei-val-warn strong { color:#e0a030; }
.ei-val-info strong { color:#7ab0e0; }
.ei-val-ok { color:#5a5; }
`;

function escHtml(s) { return (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

export {
  MODULE_ID, S, NEW_LINE, ARMOR_MOD,
  loc, uiInfo, uiError, getSetting, setSetting,
  isEmpty, stripHtml, capitalize, capitalizeEveryWord,
  splitAndTrim, splitAndSort, cleanKeyName,
  splitRespectingParens, buildBulletRegex, splitAbilityLines,
  injectCSS, SBI_CSS, SBI_HELP_CSS, escHtml,
};
