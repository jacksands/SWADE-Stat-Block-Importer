// apps/export-import-app.mjs — Export/Import dialogs (settings, profiles, lists)
import { MODULE_ID, S, SBI_HELP_CSS, injectCSS, uiInfo, uiError, getSetting } from '../utils.mjs';
import {
  ITEM_SUBTYPES, ITEM_SUBTYPE_LABEL, MAIN_REF_CATS,
  getLibrary, getNamedListsFor, getProfiles, applyProfile,
} from '../library/store.mjs';
import { exportLibraryJSON, importLibraryJSON, downloadJSON } from '../library/io.mjs';
import { validateImportData } from '../library/validation.mjs';
import { SelectCompendiums } from './settings-apps.mjs';

const CAT_LABEL = {
  skills:'Skills', edges:'Edges', powers:'Powers',
  abilities:'Abilities', hindrances:'Hindrances', races:'Races',
};

function catCheckboxRows() {
  const main = MAIN_REF_CATS.map(cat =>
    `<label class="ei-cat"><input type="checkbox" class="ei-cat-cb" data-cat="${cat}" checked> ${CAT_LABEL[cat] ?? cat}</label>`).join('');
  const items = ITEM_SUBTYPES.map(sub =>
    `<label class="ei-cat"><input type="checkbox" class="ei-cat-cb" data-cat="${sub}" data-sub="${sub}" checked> Items › ${ITEM_SUBTYPE_LABEL[sub]}</label>`).join('');
  return `<div class="ei-cat-grid">${main}${items}</div>`;
}

// ─── EXPORT APP ────────────────────────────────────────────────────────
export class SbiExportApp extends foundry.applications.api.ApplicationV2 {
  constructor(defaultCategory = null) {
    super();
    this._defaultCat = defaultCategory;
  }

  static DEFAULT_OPTIONS = {
    id: 'sbi-export',
    window: { title: 'SBI — Export', resizable: true },
    position: { width: 520, height: 'auto' },
  };

  _buildHTML() {
    const lib = getLibrary();
    const listRows = lib.namedLists.map(l =>
      `<label class="ei-list" style="margin-left:18px;display:block;font-size:11px;">
        <input type="checkbox" class="ei-list-cb" data-cat="${l.category}" data-sub="${l.subtype ?? ''}" data-id="${l.id}" checked>
        ${l.name} <span style="opacity:.5">(${l.category}${l.subtype ? ' › ' + l.subtype : ''})</span></label>`).join('') ||
      '<span style="opacity:.5;font-size:11px;">No named lists saved.</span>';

    return `<div id="sbi-exp-root">
      <p class="ei-intro">Choose what to include in the exported JSON file. Actor data and images are never exported.</p>

      <div class="ei-box">
        <div class="ei-box-title">Export preset</div>
        <label><input type="radio" name="exp-preset" value="full" checked> <strong>Full Backup</strong> — settings, usage profiles, setting rules, compendium data and named lists</label>
        <label><input type="radio" name="exp-preset" value="settings"> <strong>Settings only</strong> — module settings + setting rules</label>
        <label><input type="radio" name="exp-preset" value="profiles"> <strong>Usage Profiles only</strong> — profiles + library source selections</label>
        <label><input type="radio" name="exp-preset" value="category"> <strong>Per category</strong> — pick categories below</label>
      </div>

      <div class="ei-box" id="exp-cat-box" style="display:none;">
        <div class="ei-box-title">Categories to export</div>
        ${catCheckboxRows()}
      </div>

      <div class="ei-box">
        <div class="ei-box-title">Named lists <button type="button" class="ei-mini" id="exp-lists-all">All</button> <button type="button" class="ei-mini" id="exp-lists-none">None</button></div>
        <div class="ei-list-scroll">${listRows}</div>
      </div>

      <div class="ei-footer">
        <button id="exp-close-btn" class="ei-secondary">Cancel</button>
        <button id="exp-download-btn">⬇ Download JSON</button>
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

  _onRender() {
    this.element.querySelectorAll('input[name="exp-preset"]').forEach(r =>
      r.addEventListener('change', () => {
        const isCat = this.element.querySelector('input[name="exp-preset"]:checked')?.value === 'category';
        const box = this.element.querySelector('#exp-cat-box');
        if (box) box.style.display = isCat ? '' : 'none';
      }));
    this.element.querySelector('#exp-lists-all')?.addEventListener('click', () =>
      this.element.querySelectorAll('.ei-list-cb').forEach(c => c.checked = true));
    this.element.querySelector('#exp-lists-none')?.addEventListener('click', () =>
      this.element.querySelectorAll('.ei-list-cb').forEach(c => c.checked = false));
    this.element.querySelector('#exp-download-btn')?.addEventListener('click', () => this._download());
    this.element.querySelector('#exp-close-btn')?.addEventListener('click', () => this.close());
  }

  _download() {
    const preset = this.element.querySelector('input[name="exp-preset"]:checked')?.value ?? 'full';
    const categories = [...this.element.querySelectorAll('.ei-cat-cb:checked')]
      .map(cb => cb.dataset.sub || cb.dataset.cat);
    const listIds = [...this.element.querySelectorAll('.ei-list-cb:checked')].map(cb => cb.dataset.id);

    const json = exportLibraryJSON({
      exportType: preset === 'category' ? 'category' : preset,
      includeSettings:   preset === 'settings',
      includeProfiles:   preset === 'profiles',
      includeCompendium: preset === 'full',
      includeNamedLists: true,
      categories: preset === 'category' && categories.length ? categories : null,
      listIds: (preset === 'full' || preset === 'category') && listIds.length ? listIds : null,
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadJSON(`sbi-export-${preset}-${date}.json`, json);
    uiInfo('Export downloaded.');
    this.close();
  }
}

// ─── IMPORT APP ────────────────────────────────────────────────────────
export class SbiImportApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'sbi-import',
    window: { title: 'SBI — Import', resizable: true },
    position: { width: 560, height: 'auto' },
  };

  _parsed = null;
  _fileContent = null;
  _validation = null;

  _buildHTML() {
    const profiles = getProfiles();
    const profileOpts = profiles.items
      .map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    return `<div id="sbi-imp-root">
      <p class="ei-intro">Select a previously exported <code>.json</code> file. Import is validated before anything is applied.</p>

      <div class="ei-box">
        <input type="file" id="imp-file-input" accept=".json" style="width:100%">
      </div>

      <div id="imp-validation" class="ei-validation" style="display:none;"></div>

      <div class="ei-box">
        <div class="ei-box-title">Import mode</div>
        <label><input type="radio" name="imp-mode" value="merge" checked> <strong>Merge</strong> — add/update by id; keep existing data</label>
        <label><input type="radio" name="imp-mode" value="replace"> <strong>Replace</strong> — overwrite matching categories</label>
        <label><input type="radio" name="imp-mode" value="selective"> <strong>Selective</strong> — only the categories below</label>
        <div id="imp-cat-box" style="display:none;margin-top:6px;">
          ${catCheckboxRows()}
        </div>
      </div>

      <div class="ei-box" id="imp-profile-box" style="display:none;">
        <div class="ei-box-title">Library source selections (optional)</div>
        <label><input type="checkbox" id="imp-apply-current"> Apply imported library sources to the <strong>active</strong> profile</label><br>
        <label><input type="checkbox" id="imp-create-profile"> Create a new profile from the imported library sources</label>
        <div style="margin-top:6px;">
          <label>Or overwrite profile: <select id="imp-target-profile"><option value="">— none —</option>${profileOpts}</select></label>
        </div>
      </div>

      <div class="ei-footer">
        <button id="imp-close-btn" class="ei-secondary">Cancel</button>
        <button id="imp-import-btn" disabled>⬆ Import</button>
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
    this._parsed = null;
    this._fileContent = null;
    this._validation = null;
    this._onRender();
  }

  _onRender() {
    this.element.querySelector('#imp-file-input')?.addEventListener('change', e => this._onFile(e));
    this.element.querySelector('#imp-import-btn')?.addEventListener('click', () => this._import());
    this.element.querySelector('#imp-close-btn')?.addEventListener('click', () => this.close());
    this.element.querySelectorAll('input[name="imp-mode"]').forEach(r =>
      r.addEventListener('change', () => {
        const selective = this.element.querySelector('input[name="imp-mode"]:checked')?.value === 'selective';
        const box = this.element.querySelector('#imp-cat-box');
        if (box) box.style.display = selective ? '' : 'none';
      }));
  }

  async _onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    this._fileContent = await file.text();
    const validator = this.element.querySelector('#imp-validation');
    try {
      this._parsed = JSON.parse(this._fileContent);
      // Validate (async)
      this._validation = await validateImportData(this._parsed.data);
      if (validator) {
        validator.style.display = '';
        validator.innerHTML = this._renderValidation(this._validation, this._parsed);
      }
      // Show profile options only when the file carries library sources
      const hasPrefs = !!this._parsed.data?.prefs || !!this._parsed.data?.profiles;
      const pbox = this.element.querySelector('#imp-profile-box');
      if (pbox) pbox.style.display = hasPrefs ? '' : 'none';
      this.element.querySelector('#imp-import-btn').disabled = !this._validation.valid;
    } catch (err) {
      this._parsed = null;
      this._validation = { valid: false, errors: [err.message], warnings: [], info: [] };
      if (validator) { validator.style.display = ''; validator.innerHTML = this._renderValidation(this._validation, null); }
      this.element.querySelector('#imp-import-btn').disabled = true;
    }
  }

  _renderValidation(v, parsed) {
    const meta = parsed ? `<div class="ei-meta">Type: ${parsed.type ?? '?'} · v${parsed.version ?? '?'} · kind: ${parsed.kind ?? 'legacy'} · ${parsed.exportDate ?? ''}</div>` : '';
    const section = (title, arr, cls) => arr?.length
      ? `<div class="ei-val-${cls}"><strong>${title}</strong><ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul></div>` : '';
    const ok = v.valid && !v.warnings?.length && !v.info?.length
      ? '<div class="ei-val-ok">✅ No issues detected — ready to import.</div>' : '';
    return `${meta}${section('Errors', v.errors, 'err')}${section('Warnings', v.warnings, 'warn')}${section('Info', v.info, 'info')}${ok}`;
  }

  async _import() {
    if (!this._fileContent || !this._parsed) return;
    const mode = this.element.querySelector('input[name="imp-mode"]:checked')?.value ?? 'merge';
    const categories = [...this.element.querySelectorAll('#imp-cat-box .ei-cat-cb:checked')]
      .map(cb => cb.dataset.sub || cb.dataset.cat);

    const applyToCurrentProfile = !!this.element.querySelector('#imp-apply-current')?.checked;
    const createProfile = !!this.element.querySelector('#imp-create-profile')?.checked;
    const targetProfileId = this.element.querySelector('#imp-target-profile')?.value || null;

    const btn = this.element.querySelector('#imp-import-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Importing...';
    try {
      const result = await importLibraryJSON(this._fileContent, {
        mode,
        targetCategories: mode === 'selective' && categories.length ? categories : null,
        applyToCurrentProfile,
        targetProfileId,
        createProfile,
      });
      const parts = ['Import complete.'];
      if (result?.availability?.warnings?.length) parts.push('', ...result.availability.warnings);
      if (result?.availability?.info?.length)     parts.push('', ...result.availability.info);
      uiInfo(parts.join('\n'));
      this.close();
    } catch (e) {
      uiError(`Import failed: ${e.message}`);
      btn.disabled = false;
      btn.textContent = '⬆ Import';
    }
  }
}

// ─── MENU APP (registered as a module settings menu) ─────────────────────
export class ExportImportMenuApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'sbi-export-import-menu',
    window: { title: 'SBI — Export / Import Settings', resizable: false },
    position: { width: 460, height: 'auto' },
  };

  _buildHTML() { return `
    <div id="sbi-eim-root" style="padding:12px;">
      <p style="font-size:12px;opacity:.75;margin:0 0 10px;">
        Back up or transfer the module configuration — settings, usage profiles, setting rules,
        compendium data and named lists. Actor data and images are not included.
      </p>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
        <button type="button" id="eim-export" style="padding:6px 12px;">⬇ Export…</button>
        <button type="button" id="eim-import" style="padding:6px 12px;">⬆ Import…</button>
        <button type="button" id="eim-comps"  style="padding:6px 12px;">⚙ Compendiums to Search</button>
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button type="button" id="eim-close" style="padding:4px 12px;opacity:.6;">Close</button>
      </div>
    </div>`;
  }

  async _renderHTML() {
    injectCSS('sbi-help-css', SBI_HELP_CSS);
    const div = document.createElement('div');
    div.innerHTML = this._buildHTML();
    return div;
  }

  _replaceHTML(result, content) {
    this.element.querySelector('.window-content').replaceChildren(result);
    this._onRender();
  }

  _onRender() {
    this.element.querySelector('#eim-export')?.addEventListener('click', () => openExport());
    this.element.querySelector('#eim-import')?.addEventListener('click', () => openImport());
    this.element.querySelector('#eim-comps')?.addEventListener('click',  () => new SelectCompendiums().render({ force: true }));
    this.element.querySelector('#eim-close')?.addEventListener('click',  () => this.close());
  }
}

export function openExport(defaultCategory = null) { new SbiExportApp(defaultCategory).render({ force: true }); }
export function openImport()                        { new SbiImportApp().render({ force: true }); }
