// apps/entry-editor-app.mjs — Add Entry dialog (type-aware form fields)
import { MODULE_ID, SBI_HELP_CSS, injectCSS, uiInfo, uiError } from '../utils.mjs';
import { ITEM_SUBTYPE_LABEL } from '../library/store.mjs';

// Returns formatted line based on category/subtype + field values
function formatEntry(category, subtype, fields) {
  const f = k => (fields[k] ?? '').trim();
  if      (category === 'edges')    return `${f('name')} | Req: ${f('req')} | ${f('desc')}`;
  if      (category === 'powers')   return `${f('name')} | PP: ${f('pp')} | Range: ${f('range')} | Dur: ${f('dur')} | ${f('desc')}`;
  if      (category === 'abilities')return `${f('name')} | ${f('desc')}`;
  if      (subtype === 'weapon')    return `${f('name')} | Dmg: ${f('dmg')} | Range: ${f('range')} | RoF: ${f('rof')} | AP: ${f('ap')} | Notes: ${f('notes')}`;
  if      (subtype === 'armor')     return `${f('name')} | Armor: ${f('armor')} | Min Str: ${f('minstr')} | Notes: ${f('notes')}`;
  if      (subtype === 'shield')    return `${f('name')} | Parry: ${f('parry')} | Cover: ${f('cover')} | Notes: ${f('notes')}`;
  if      (subtype === 'hindrance') return `${f('name')} | Type: ${f('type') || 'Minor'} | ${f('desc')}`;
  if      (subtype === 'vehmod')    return `${f('name')} | Cost: ${f('cost')} | Notes: ${f('notes')}`;
  return `${f('name')} | Notes: ${f('notes')}`;  // gear fallback
}

function buildFields(category, subtype) {
  const row = (id, label, type='text', opts='') =>
    `<div class="fg"><label style="min-width:90px">${label}</label><input id="ee-${id}" type="${type}" ${opts} style="flex:1"></div>`;
  const ta = (id, label) =>
    `<div class="fg"><label style="min-width:90px">${label}</label><textarea id="ee-${id}" rows="3" style="flex:1;resize:vertical"></textarea></div>`;
  const sel = (id, label, options) =>
    `<div class="fg"><label style="min-width:90px">${label}</label><select id="ee-${id}" style="flex:1">${options}</select></div>`;

  if (category === 'edges')     return row('name','Name *','text','required') + row('req','Requirements') + ta('desc','Description *');
  if (category === 'powers')    return row('name','Name *','text','required') + row('pp','PP Cost') + row('range','Range') + row('dur','Duration') + ta('desc','Description *');
  if (category === 'abilities') return row('name','Name *','text','required') + ta('desc','Description *');
  if (subtype === 'weapon')     return row('name','Name *','text','required') + row('dmg','Damage (e.g. Str+d8)') + row('range','Range (S/M/L or —)') + row('rof','RoF','text','placeholder="1"') + row('ap','AP','text','placeholder="0"') + ta('notes','Notes');
  if (subtype === 'armor')      return row('name','Name *','text','required') + row('armor','Armor value','text','placeholder="2"') + row('minstr','Min Str') + ta('notes','Notes');
  if (subtype === 'shield')     return row('name','Name *','text','required') + row('parry','Parry bonus','text','placeholder="+1"') + row('cover','Cover bonus','text','placeholder="+1"') + ta('notes','Notes');
  if (subtype === 'hindrance')  return row('name','Name *','text','required') + sel('type','Type','<option value="Minor">Minor</option><option value="Major">Major</option>') + ta('desc','Description *');
  if (subtype === 'vehmod')     return row('name','Name *','text','required') + row('cost','Cost') + ta('notes','Notes');
  return row('name','Name *','text','required') + row('weight','Weight') + row('cost','Cost') + ta('notes','Notes'); // gear
}

export class EntryEditorApp extends foundry.applications.api.ApplicationV2 {
  constructor(category, subtype, listName, onSave) {
    super();
    this._category = category;
    this._subtype  = subtype;
    this._listName = listName;
    this._onSave   = onSave;   // callback(formattedLine)
  }

  static DEFAULT_OPTIONS = {
    id: 'sbi-entry-editor',
    window: { title: 'SBI — Add Entry', resizable: false },
    position: { width: 480, height: 'auto' },
  };

  _buildHTML() {
    const label = this._subtype ? ITEM_SUBTYPE_LABEL[this._subtype] : (this._category.charAt(0).toUpperCase() + this._category.slice(1));
    return `<div id="sbi-ee-root" style="padding:12px;">
      <p style="font-size:12px;opacity:.65;margin:0 0 10px;">
        Adding entry to <strong>${this._listName}</strong> (${label}).
      </p>
      <div id="ee-fields" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
        ${buildFields(this._category, this._subtype)}
      </div>
      <div id="ee-preview" style="font-size:11px;opacity:.6;font-family:monospace;white-space:pre-wrap;padding:4px;background:rgba(0,0,0,.3);border-radius:3px;margin-bottom:10px;min-height:20px;"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button id="ee-add-btn" style="padding:4px 16px;">➕ Add to List</button>
        <button id="ee-close-btn" style="padding:4px 12px;opacity:.6;">Cancel</button>
      </div>
    </div>`;
  }

  async _renderHTML(context, options) {
    injectCSS('sbi-help-css', SBI_HELP_CSS);
    const div = document.createElement('div');
    div.innerHTML = this._buildHTML();
    return div;
  }

  _replaceHTML(result, content, options) {
    this.element.querySelector('.window-content').replaceChildren(result);
    this._onRender();
  }

  _getFields() {
    const out = {};
    this.element.querySelectorAll('[id^="ee-"]').forEach(el => {
      const key = el.id.replace('ee-','');
      if (['fields','preview','add-btn','close-btn','root'].includes(key)) return;
      out[key] = el.value ?? '';
    });
    return out;
  }

  _updatePreview() {
    const line = formatEntry(this._category, this._subtype, this._getFields());
    const prev = this.element.querySelector('#ee-preview');
    if (prev) prev.textContent = line;
  }

  _onRender() {
    this.element.querySelectorAll('[id^="ee-"]').forEach(el => {
      el.addEventListener('input', () => this._updatePreview());
      el.addEventListener('change', () => this._updatePreview());
    });
    this._updatePreview();
    this.element.querySelector('#ee-add-btn')?.addEventListener('click', () => this._add());
    this.element.querySelector('#ee-close-btn')?.addEventListener('click', () => this.close());
  }

  _add() {
    const fields = this._getFields();
    if (!(fields.name ?? '').trim()) { uiError('Name is required.'); return; }
    const line = formatEntry(this._category, this._subtype, fields);
    this._onSave(line);
    // Clear fields for another entry
    this.element.querySelectorAll('[id^="ee-"]').forEach(el => {
      if (!['fields','preview','add-btn','close-btn','root'].some(k => el.id === `ee-${k}`)) el.value = '';
    });
    this.element.querySelector('#ee-name')?.focus();
    uiInfo('Entry added.');
  }
}
