// apps/library-use-app.mjs — Library to Use dialog (select which sources combine in Copy Master)
import { MODULE_ID, SBI_HELP_CSS, injectCSS, uiInfo } from '../utils.mjs';
import {
  ITEM_SUBTYPES, ITEM_SUBTYPE_LABEL, MAIN_REF_CATS,
  getLibrary, setPrefs, getDefaultContent, getCompendiumContent,
  getNamedListsFor, hasDefaultContent,
} from '../library/store.mjs';
import { SelectCompendiums } from './settings-apps.mjs';

const CAT_LABELS = {
  skills:'Skills', edges:'Edges', powers:'Powers',
  abilities:'Abilities', hindrances:'Hindrances', races:'Races',
};

export class LibraryUseApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'sbi-library-use',
    window: { title: 'SBI — Library to Use', resizable: true },
    position: { width: 520, height: 'auto' },
  };

  _buildHTML() {
    const lib = getLibrary();

    const rowHTML = (cat, subtype, prefs) => {
      const label   = subtype ? `Items › ${ITEM_SUBTYPE_LABEL[subtype]}` : (CAT_LABELS[cat] ?? (cat.charAt(0).toUpperCase() + cat.slice(1)));
      const hasComp = !!getCompendiumContent(cat, subtype);
      const lists   = getNamedListsFor(cat, subtype);
      const hasDefault = hasDefaultContent(cat);
      return `<tr data-cat="${cat}" data-sub="${subtype ?? ''}">
        <td class="lu-cat-label">${label}</td>
        <td>${hasDefault ? `<label><input type="checkbox" class="lu-check" data-src="default" ${prefs.useDefault ? 'checked' : ''} ${!hasDefault ? 'disabled' : ''}> Default</label>` : '<span style="opacity:.35">—</span>'}</td>
        <td>${hasComp ? `<label><input type="checkbox" class="lu-check" data-src="compendium" ${prefs.useCompendium ? 'checked' : ''}> Compendium</label>` : '<span style="opacity:.35">—</span>'}</td>
        <td>${lists.map(l => `<label><input type="checkbox" class="lu-check" data-src="list" data-list-id="${l.id}" ${(prefs.listIds ?? []).includes(l.id) ? 'checked' : ''}> ${l.name}</label>`).join('<br>') || '<span style="opacity:.35">—</span>'}</td>
      </tr>`;
    };

    const lib2 = lib;
    let rows = MAIN_REF_CATS.map(cat => rowHTML(cat, null, lib2.prefs[cat] ?? {})).join('');
    rows += ITEM_SUBTYPES.map(sub => rowHTML('items', sub, lib2.prefs.items?.[sub] ?? {})).join('');

    return `<div id="sbi-lu-root" style="padding:8px;">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        <p style="font-size:12px;opacity:.7;margin:0;flex:1;">
          Select which sources are combined when you click <strong>📋 Copy for AI</strong> in each category.<br>
          Unchecked sources are stored but excluded from the AI prompt output.
        </p>
        <button type="button" id="lu-open-comps" title="Configure which compendiums are searched" style="flex-shrink:0;padding:3px 10px;font-size:11px;white-space:nowrap;">⚙ Compendiums to Search</button>
      </div>
      <table class="lu-table" style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr>
          <th style="text-align:left;padding:3px 6px;border-bottom:1px solid rgba(255,255,255,.15)">Category</th>
          <th style="padding:3px 6px;border-bottom:1px solid rgba(255,255,255,.15)">Default</th>
          <th style="padding:3px 6px;border-bottom:1px solid rgba(255,255,255,.15)">Compendium</th>
          <th style="padding:3px 6px;border-bottom:1px solid rgba(255,255,255,.15)">Named Lists</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;border-top:1px solid rgba(255,255,255,.1);padding-top:10px;">
        <button id="lu-save-btn" style="padding:4px 16px;">💾 Save</button>
        <button id="lu-close-btn" style="padding:4px 12px;opacity:.6;">Cancel</button>
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
    this.element.querySelector('#lu-open-comps')?.addEventListener('click', () => new SelectCompendiums().render({ force: true }));
    this.element.querySelector('#lu-save-btn')?.addEventListener('click', () => this._save());
    this.element.querySelector('#lu-close-btn')?.addEventListener('click', () => this.close());
  }

  async _save() {
    const rows = this.element.querySelectorAll('tr[data-cat]');
    for (const row of rows) {
      const cat    = row.dataset.cat;
      const subtype = row.dataset.sub || null;
      const checks = row.querySelectorAll('.lu-check');
      const prefs  = { useDefault: false, useCompendium: false, listIds: [] };
      for (const cb of checks) {
        if (!cb.checked) continue;
        if (cb.dataset.src === 'default')     prefs.useDefault    = true;
        if (cb.dataset.src === 'compendium')  prefs.useCompendium = true;
        if (cb.dataset.src === 'list')        prefs.listIds.push(cb.dataset.listId);
      }
      await setPrefs(cat, subtype, prefs);
    }
    uiInfo('Library to Use saved.');
    this.close();
  }
}

export function openLibraryUse() { new LibraryUseApp().render({ force: true }); }
