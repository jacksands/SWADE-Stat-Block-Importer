// apps/export-import-app.mjs — Export and Import dialogs
import { MODULE_ID, SBI_HELP_CSS, injectCSS, uiInfo, uiError } from '../utils.mjs';
import { ITEM_SUBTYPES, ITEM_SUBTYPE_LABEL, getLibrary, getNamedListsFor } from '../library/store.mjs';
import { exportLibraryJSON, importLibraryJSON, downloadJSON } from '../library/io.mjs';

// ─── EXPORT APP ────────────────────────────────────────────────────────
export class SbiExportApp extends foundry.applications.api.ApplicationV2 {
  constructor(defaultCategory = null) {
    super();
    this._defaultCat = defaultCategory;
  }

  static DEFAULT_OPTIONS = {
    id: 'sbi-export',
    window: { title: 'SBI — Export Library', resizable: false },
    position: { width: 420, height: 'auto' },
  };

  _buildHTML() {
    const lib  = getLibrary();
    const cats = ['edges','powers','abilities'];
    const catRows = cats.map(cat => {
      const lists = getNamedListsFor(cat);
      const listRows = lists.map(l =>
        `<label class="lu-list-opt" style="margin-left:20px;display:block;font-size:11px;">
          <input type="checkbox" class="exp-list-cb" data-cat="${cat}" data-id="${l.id}" checked> ${l.name}</label>`
      ).join('');
      return `<label><input type="checkbox" class="exp-cat-cb" data-cat="${cat}" checked>
        <strong>${cat.charAt(0).toUpperCase() + cat.slice(1)}</strong></label>${listRows}`;
    });

    const itemRows = ITEM_SUBTYPES.map(sub => {
      const lists = getNamedListsFor('items', sub);
      const listRows = lists.map(l =>
        `<label style="margin-left:20px;display:block;font-size:11px;">
          <input type="checkbox" class="exp-list-cb" data-cat="items" data-sub="${sub}" data-id="${l.id}" checked> ${l.name}</label>`
      ).join('');
      return `<label><input type="checkbox" class="exp-cat-cb" data-cat="items" data-sub="${sub}" checked>
        Items › ${ITEM_SUBTYPE_LABEL[sub]}</label>${listRows}`;
    }).join('');

    return `<div id="sbi-exp-root" style="padding:12px;">
      <p style="font-size:12px;opacity:.7;margin:0 0 10px;">Choose what to include in the exported JSON file.</p>
      <div style="margin-bottom:10px;border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:8px;">
        <div style="font-weight:600;margin-bottom:6px;font-size:12px;">Content</div>
        <label><input type="checkbox" id="exp-inc-settings"> Game Settings (compendium selections, defaults)</label><br>
        <label><input type="checkbox" id="exp-inc-comp" checked> Compendium-loaded data</label><br>
        <label><input type="checkbox" id="exp-inc-lists" checked> Named Lists</label>
      </div>
      <div id="exp-cat-section" style="border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:8px;font-size:12px;display:flex;flex-direction:column;gap:4px;">
        <div style="font-weight:600;margin-bottom:4px;font-size:12px;">Categories to export</div>
        ${catRows.join('')}
        ${itemRows}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button id="exp-download-btn" style="padding:4px 16px;">⬇ Download JSON</button>
        <button id="exp-close-btn" style="padding:4px 12px;opacity:.6;">Cancel</button>
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
    this.element.querySelector('#exp-download-btn')?.addEventListener('click', () => this._download());
    this.element.querySelector('#exp-close-btn')?.addEventListener('click', () => this.close());
  }

  _download() {
    const get = id => this.element.querySelector(`#${id}`)?.checked ?? false;
    const catCbs = [...this.element.querySelectorAll('.exp-cat-cb')];
    const categories = catCbs.filter(cb => cb.checked).map(cb => cb.dataset.cat === 'items' ? 'items' : cb.dataset.cat);
    const uniq = [...new Set(categories)];
    const listCbs = [...this.element.querySelectorAll('.exp-list-cb')];
    const listIds = listCbs.filter(cb => cb.checked).map(cb => cb.dataset.id);
    const json = exportLibraryJSON({
      includeSettings:   get('exp-inc-settings'),
      includeCompendium: get('exp-inc-comp'),
      includeNamedLists: get('exp-inc-lists'),
      categories: uniq.length ? uniq : null,
      listIds:    listIds.length ? listIds : null,
    });
    const date = new Date().toISOString().slice(0,10);
    downloadJSON(`sbi-library-${date}.json`, json);
    uiInfo('Library exported.');
    this.close();
  }
}

// ─── IMPORT APP ────────────────────────────────────────────────────────
export class SbiImportApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'sbi-import',
    window: { title: 'SBI — Import Library', resizable: false },
    position: { width: 420, height: 'auto' },
  };

  _buildHTML() {
    return `<div id="sbi-imp-root" style="padding:12px;">
      <p style="font-size:12px;opacity:.7;margin:0 0 10px;">
        Select a previously exported <code>.json</code> SBI library file.
      </p>
      <div style="margin-bottom:10px;">
        <input type="file" id="imp-file-input" accept=".json" style="width:100%">
      </div>
      <div id="imp-preview" style="font-size:11px;font-family:monospace;white-space:pre-wrap;padding:6px;background:rgba(0,0,0,.3);border-radius:3px;min-height:40px;max-height:160px;overflow-y:auto;margin-bottom:10px;opacity:.7;">
        No file selected.
      </div>
      <div style="border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:8px;margin-bottom:10px;font-size:12px;">
        <div style="font-weight:600;margin-bottom:6px;">Import Mode</div>
        <label><input type="radio" name="imp-mode" value="merge" checked> <strong>Merge</strong> — add lists, append compendium data. Existing data kept.</label><br>
        <label><input type="radio" name="imp-mode" value="replace"> <strong>Replace</strong> — overwrite named lists for imported categories. Settings replaced if included.</label>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button id="imp-import-btn" style="padding:4px 16px;" disabled>⬆ Import</button>
        <button id="imp-close-btn" style="padding:4px 12px;opacity:.6;">Cancel</button>
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
    this._fileContent = null;
  }

  _onRender() {
    this.element.querySelector('#imp-file-input')?.addEventListener('change', e => this._onFile(e));
    this.element.querySelector('#imp-import-btn')?.addEventListener('click', () => this._import());
    this.element.querySelector('#imp-close-btn')?.addEventListener('click', () => this.close());
  }

  _onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      this._fileContent = ev.target.result;
      const prev = this.element.querySelector('#imp-preview');
      try {
        const parsed = JSON.parse(this._fileContent);
        const summary = [
          `Type: ${parsed.type ?? '?'} v${parsed.version ?? '?'}`,
          `Date: ${parsed.exportDate ?? '?'}`,
          parsed.data?.namedLists ? `Named Lists: ${parsed.data.namedLists.length}` : '',
          parsed.data?.settings   ? 'Settings: included' : '',
          parsed.data?.compendium ? 'Compendium: included' : '',
        ].filter(Boolean).join('\n');
        if (prev) prev.textContent = summary;
        this.element.querySelector('#imp-import-btn').disabled = false;
      } catch {
        if (prev) prev.textContent = 'Invalid JSON file.';
        this.element.querySelector('#imp-import-btn').disabled = true;
      }
    };
    reader.readAsText(file);
  }

  async _import() {
    if (!this._fileContent) return;
    const mode = this.element.querySelector('input[name="imp-mode"]:checked')?.value ?? 'merge';
    const btn  = this.element.querySelector('#imp-import-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Importing...';
    try {
      await importLibraryJSON(this._fileContent, mode);
      uiInfo('Library imported successfully.');
      this.close();
    } catch(e) {
      uiError(`Import failed: ${e.message}`);
      btn.disabled = false;
      btn.textContent = '⬆ Import';
    }
  }
}

export function openExport(defaultCategory = null) { new SbiExportApp(defaultCategory).render({ force: true }); }
export function openImport()                        { new SbiImportApp().render({ force: true }); }
