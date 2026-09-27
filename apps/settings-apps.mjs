// apps/settings-apps.mjs — SelectCompendiums and TokenSettingsApp
import { MODULE_ID, S, loc, uiInfo, getSetting, setSetting, injectCSS, SBI_CSS } from '../utils.mjs';
import { getAllItemCompendiums, getAllActiveCompendiums } from '../lib/compendium-ops.mjs';

// ── CSS injected once ────────────────────────────────────────────────
const PICKER_CSS = `
#sbi-comp-root { padding:8px; font-size:13px; box-sizing:border-box; display:flex; flex-direction:column; }
#sbi-comp-root .comp-list-scroll { flex:1; overflow-y:auto; overflow-x:hidden; padding-right:2px; min-height:0; max-height:calc(100vh - 160px); }
#sbi-comp-root .comp-group { margin-bottom:4px; border:1px solid rgba(255,255,255,.08); border-radius:4px; overflow:hidden; }
#sbi-comp-root .comp-group-header { display:flex; align-items:center; gap:6px; padding:5px 8px; background:rgba(255,255,255,.06); user-select:none; }
#sbi-comp-root .comp-group-header input[type=checkbox] { margin:0; flex-shrink:0; }
#sbi-comp-root .comp-collapse-btn { background:none; border:none; color:inherit; cursor:pointer; font-size:12px; font-weight:600; padding:0; text-align:left; flex:1; display:flex; align-items:center; gap:4px; }
#sbi-comp-root .comp-collapse-btn:hover { color:var(--accent-primary,#d4a574); }
#sbi-comp-root .col-arrow { flex-shrink:0; width:12px; display:inline-block; text-align:center; }
#sbi-comp-root .comp-count { font-size:10px; opacity:.45; white-space:nowrap; }
#sbi-comp-root .comp-group-items { padding:3px 8px 5px 28px; }
#sbi-comp-root .comp-item { display:flex; align-items:baseline; gap:5px; padding:1px 0; }
#sbi-comp-root .comp-item input { flex-shrink:0; margin:0; }
#sbi-comp-root .comp-id { font-size:10px; opacity:.4; }
#sbi-comp-root .comp-world-section { margin-top:8px; padding-top:6px; border-top:1px solid rgba(255,255,255,.1); }
#sbi-comp-root .comp-world-section h4 { margin:0 0 4px; font-size:11px; opacity:.55; letter-spacing:.06em; text-transform:uppercase; }
#sbi-comp-root .comp-save-row { display:flex; gap:6px; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,.1); justify-content:flex-end; flex-shrink:0; }
#sbi-comp-root .comp-save-row button { padding:3px 12px; font-size:12px; cursor:pointer; border-radius:3px; }
`;

// ── Helpers ───────────────────────────────────────────────────────────
function buildGroups() {
  // Merge legacy packageToUse with compsToUse to preserve old settings
  const pkgSet = new Set(getSetting(S.packageToUse) ?? []);
  const explicit = new Set(getSetting(S.compsToUse) ?? []);
  const noSelection = !pkgSet.size && !explicit.size;

  // Expand package-level selections into individual comp IDs
  const legacyExpanded = new Set();
  if (pkgSet.size) {
    (game.packs?.contents ?? []).forEach(p => {
      // Legacy used packageName as the package key
      if (pkgSet.has(p.metadata?.packageName ?? '') && p.documentName === 'Item')
        legacyExpanded.add(p.collection);
    });
  }
  const activeIds = new Set([...explicit, ...legacyExpanded]);

  const groups = { system: null, modules: {}, world: [] };
  for (const pack of (game.packs?.contents ?? [])) {
    if (pack.documentName !== 'Item') continue;
    // V14 uses packageName (not packageId) for the owning package identifier
    const packageName = pack.metadata?.packageName ?? '';
    const packageType = pack.metadata?.packageType ?? 'module';
    const entry = {
      id:      pack.collection,
      label:   pack.metadata?.label ?? pack.collection,
      checked: noSelection || activeIds.has(pack.collection),
    };
    if (packageType === 'world') {
      groups.world.push(entry);
    } else if (packageType === 'system') {
      if (!groups.system) {
        const sysTitle = game.system?.title ?? packageName ?? 'System';
        groups.system = { id: '__system__', name: `System (${sysTitle})`, packs: [] };
      }
      groups.system.packs.push(entry);
    } else {
      // module — group by packageName, look up human-readable title
      if (!groups.modules[packageName]) {
        const title = game.modules?.get(packageName)?.title ?? packageName;
        groups.modules[packageName] = { id: packageName, name: title, packs: [] };
      }
      groups.modules[packageName].packs.push(entry);
    }
  }
  // Sort modules alphabetically by display title
  const sortedModules = Object.values(groups.modules)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { system: groups.system, modules: sortedModules, world: groups.world };
}

function groupHeaderState(packs) {
  const allC  = packs.every(p => p.checked);
  const someC = packs.some(p => p.checked);
  return { allC, indeterminate: someC && !allC };
}

// ── SelectCompendiums ─────────────────────────────────────────────────
export class SelectCompendiums extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id:       `${MODULE_ID}.compendiumsSelector`,
    window:   { title: 'Compendiums to Search', resizable: true },
    position: { width: 500, height: 520 },
  };

  _collapsed         = new Set();
  _handlersInstalled = false;  // prevents double-registration if framework calls _onRender twice

  _renderGroup(grp) {
    const { allC, indeterminate } = groupHeaderState(grp.packs);
    const isCollapsed = this._collapsed.has(grp.id);
    const items = grp.packs.map(p =>
      `<label class="comp-item">
         <input type="checkbox" data-comp="${p.id}" ${p.checked ? 'checked' : ''}/>
         ${p.label} <span class="comp-id">${p.id}</span>
       </label>`).join('');
    return `
<div class="comp-group" data-gid="${grp.id}">
  <div class="comp-group-header">
    <input type="checkbox" class="comp-ghdr-chk" data-gid="${grp.id}"
      ${allC ? 'checked' : ''} ${indeterminate ? 'data-ind="1"' : ''}/>
    <button type="button" class="comp-collapse-btn" data-gid="${grp.id}">
      <span class="col-arrow">${isCollapsed ? '▶' : '▼'}</span>${grp.name}
    </button>
    <span class="comp-count">(${grp.packs.length})</span>
  </div>
  <div class="comp-group-items" data-gid="${grp.id}" ${isCollapsed ? 'style="display:none"' : ''}>${items}</div>
</div>`;
  }

  async _renderHTML(context, options) {
    injectCSS('sbi-comp-picker-css', PICKER_CSS);
    const g  = buildGroups();
    let list = '';
    if (g.system) list += this._renderGroup(g.system);
    for (const mod of g.modules) list += this._renderGroup(mod);
    if (g.world.length) {
      list += `<div class="comp-world-section"><h4>World Compendiums</h4>`;
      list += this._renderGroup({ id:'__world__', name:'World', packs: g.world });
      list += `</div>`;
    }
    if (!list) list = '<p style="opacity:.5;padding:12px;">No Item compendiums found.</p>';
    const html = `
      <div class="comp-list-scroll">${list}</div>
      <div class="comp-save-row">
        <button type="button" id="sbi-cmp-none" title="Deselect all">☐ None</button>
        <button type="button" id="sbi-cmp-all"  title="Select all">☑ All</button>
        <button type="button" id="sbi-cmp-save">💾 Save</button>
      </div>`;
    const div = document.createElement('div');
    div.id = 'sbi-comp-root';
    div.innerHTML = html;
    return div;
  }

  _replaceHTML(result, content, options) {
    this._handlersInstalled = false;  // reset so _onRender can register fresh handlers
    content.replaceChildren(result);
    // Framework calls _onRender automatically after this
  }

  _onRender(context, options) {
    if (this._handlersInstalled) return;
    this._handlersInstalled = true;
    const el = this.element;

    // Resize — set window-content height AND inner scroll area as belt-and-suspenders
    requestAnimationFrame(() => {
      const inner   = document.querySelector('#sbi-comp-root');
      const win     = inner?.closest('.window-app');
      const header  = win?.querySelector('.window-header');
      const footer  = win?.querySelector('footer, .window-footer, .form-footer');
      const content = win?.querySelector('.window-content');
      const scroll  = inner?.querySelector('.comp-list-scroll');
      const saveRow = inner?.querySelector('.comp-save-row');
      if (!inner) return;
      function applyH() {
        const avail = window.innerHeight - 40
          - (header?.offsetHeight  ?? 40)
          - (footer?.offsetHeight  ?? 0);
        // Standard window-content approach
        if (content) {
          content.style.setProperty('height',     `${Math.max(280, avail)}px`, 'important');
          content.style.setProperty('overflow-y', 'auto', 'important');
        }
        // Inner scroll area: avail minus save-row so buttons stay visible
        if (scroll) {
          const saveH = saveRow?.offsetHeight ?? 48;
          scroll.style.maxHeight = `${Math.max(200, avail - saveH - 24)}px`;
          scroll.style.overflowY = 'auto';
        }
      }
      applyH();
      new ResizeObserver(applyH).observe(inner);
    });

    // Set indeterminate state (JS-only property)
    el.querySelectorAll('.comp-ghdr-chk[data-ind="1"]').forEach(c => { c.indeterminate = true; });

    // Collapse / expand — update the arrow span, not full textContent
    el.querySelectorAll('.comp-collapse-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const gid   = btn.dataset.gid;
        const items = el.querySelector(`.comp-group-items[data-gid="${gid}"]`);
        if (!items) return;
        const nowHidden = items.style.display === 'none';
        items.style.display = nowHidden ? '' : 'none';
        if (nowHidden) this._collapsed.delete(gid); else this._collapsed.add(gid);
        const arrowSpan = btn.querySelector('.col-arrow');
        if (arrowSpan) arrowSpan.textContent = nowHidden ? '▼' : '▶';
      });
    });

    // Header checkbox → cascade to children
    el.querySelectorAll('.comp-ghdr-chk').forEach(hdr => {
      hdr.addEventListener('change', () => {
        const gid = hdr.dataset.gid;
        el.querySelectorAll(`.comp-group-items[data-gid="${gid}"] input[data-comp]`).forEach(c => {
          c.checked = hdr.checked;
        });
        hdr.indeterminate = false;
      });
    });

    // Child → update header state
    el.querySelectorAll('input[data-comp]').forEach(chk => {
      chk.addEventListener('change', () => {
        const items = chk.closest('.comp-group-items');
        if (!items) return;
        const gid     = items.dataset.gid;
        const hdr     = el.querySelector(`.comp-ghdr-chk[data-gid="${gid}"]`);
        if (!hdr) return;
        const children = [...items.querySelectorAll('input[data-comp]')];
        const allC     = children.every(c => c.checked);
        const someC    = children.some(c => c.checked);
        hdr.checked       = allC;
        hdr.indeterminate = someC && !allC;
      });
    });

    // All / None
    el.querySelector('#sbi-cmp-all')?.addEventListener('click', () => {
      el.querySelectorAll('input[data-comp]').forEach(c => c.checked = true);
      el.querySelectorAll('.comp-ghdr-chk').forEach(h => { h.checked = true; h.indeterminate = false; });
    });
    el.querySelector('#sbi-cmp-none')?.addEventListener('click', () => {
      el.querySelectorAll('input[data-comp]').forEach(c => c.checked = false);
      el.querySelectorAll('.comp-ghdr-chk').forEach(h => { h.checked = false; h.indeterminate = false; });
    });

    // Save
    el.querySelector('#sbi-cmp-save')?.addEventListener('click', async () => {
      const allIds  = getAllItemCompendiums();
      const checked = [...el.querySelectorAll('input[data-comp]:checked')].map(c => c.dataset.comp);
      // If all are checked → store empty (= "use all", matches getAllActiveCompendiums logic)
      const storeEmpty = checked.length === allIds.length && allIds.every(id => checked.includes(id));
      await setSetting(S.compsToUse, storeEmpty ? [] : checked);
      await setSetting(S.packageToUse, []);   // clear legacy package-level setting
      uiInfo('Compendium settings saved.');
      this.close();
    });
  }
}

// ── ImageUploadSettingsApp ────────────────────────────────────────────
export class ImageUploadSettingsApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id:       `${MODULE_ID}.imageUploadSettings`,
    window:   { title: 'Actor Image Upload Path' },
    position: { width: 500 },
  };

  _handlersInstalled = false;

  async _renderHTML(context, options) {
    const current     = getSetting(S.imgUploadPath) ?? '';
    const defaultPath = `worlds/${game.world?.id ?? '[world-id]'}/actors`;
    const div = document.createElement('div');
    div.id = 'sbi-iup-root';
    div.style.cssText = 'padding:12px;font-size:13px;';
    div.innerHTML = `
      <p style="margin:0 0 10px;opacity:.75;font-size:12px;">
        Folder where dropped images are saved in Foundry's file system.<br>
        Leave blank to use the default: <code style="font-size:11px;">${defaultPath}</code>
      </p>
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="text" id="iup-path" value="${current}" placeholder="${defaultPath}"
               style="flex:1;font-size:12px;padding:4px 6px;font-family:monospace;border-radius:3px;"/>
        <button type="button" id="iup-browse" title="Browse Foundry folders"
                style="padding:4px 10px;font-size:14px;cursor:pointer;border-radius:3px;">📁 Browse</button>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;border-top:1px solid rgba(255,255,255,.1);padding-top:10px;">
        <button type="button" id="iup-clear" style="font-size:12px;padding:3px 10px;opacity:.7;cursor:pointer;border-radius:3px;">✕ Clear (use default)</button>
        <button type="button" id="iup-save"  style="font-size:12px;padding:3px 14px;cursor:pointer;border-radius:3px;">💾 Save</button>
      </div>`;
    return div;
  }

  _replaceHTML(result, content, options) {
    this._handlersInstalled = false;
    content.replaceChildren(result);
  }

  _onRender(context, options) {
    if (this._handlersInstalled) return;
    this._handlersInstalled = true;
    const pathInput = this.element.querySelector('#iup-path');

    // 📁 Browse: open Foundry FilePicker in folder mode
    this.element.querySelector('#iup-browse')?.addEventListener('click', () => {
      const current = pathInput?.value?.trim() || `worlds/${game.world?.id ?? ''}/actors/`;
      const fp = new FilePicker({
        type:     'folder',
        current,
        callback: (path) => { if (pathInput) pathInput.value = path; },
      });
      fp.render(true);
    });

    this.element.querySelector('#iup-clear')?.addEventListener('click', () => {
      if (pathInput) pathInput.value = '';
    });

    this.element.querySelector('#iup-save')?.addEventListener('click', async () => {
      await setSetting(S.imgUploadPath, pathInput?.value?.trim() ?? '');
      uiInfo('Image upload path saved.');
      this.close();
    });
  }
}

// ── TokenSettingsApp ──────────────────────────────────────────────────
export class TokenSettingsApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id:       `${MODULE_ID}.tokenSettings`,
    window:   { title: 'Default Token Settings' },
    position: { width: 380 },
  };
  async _prepareContext(options) {
    return getSetting(S.tokenSettings) ?? { disposition: -1, displayName: 0, vision: false, visionRange: 0, visionAngle: 360 };
  }
  async _renderHTML(context, options) {
    const c   = context;
    const sel = (v, m) => v == m ? 'selected' : '';
    const div = document.createElement('div');
    div.style.padding = '8px';
    div.innerHTML = `
      <div class="form-group"><label>Disposition</label>
        <select name="disposition">
          <option value="-1" ${sel(c.disposition,-1)}>Hostile</option>
          <option value="0"  ${sel(c.disposition, 0)}>Neutral</option>
          <option value="1"  ${sel(c.disposition, 1)}>Friendly</option>
          <option value="-2" ${sel(c.disposition,-2)}>Secret</option>
        </select></div>
      <div class="form-group"><label>Display Name</label>
        <select name="displayName">
          <option value="0"  ${sel(c.displayName, 0)}>Never</option>
          <option value="10" ${sel(c.displayName,10)}>When Controlled</option>
          <option value="20" ${sel(c.displayName,20)}>Owner Hover</option>
          <option value="30" ${sel(c.displayName,30)}>Hover</option>
          <option value="40" ${sel(c.displayName,40)}>Owner Always</option>
          <option value="50" ${sel(c.displayName,50)}>Always</option>
        </select></div>
      <hr>
      <div class="form-group"><label><input type="checkbox" name="vision" ${c.vision?'checked':''}/> Has Vision</label></div>
      <div class="form-group"><label>Vision Range</label><input type="number" name="visionRange" value="${c.visionRange??0}" style="width:80px"/></div>
      <div class="form-group"><label>Vision Angle</label><input type="number" name="visionAngle" value="${c.visionAngle??360}" style="width:80px" max="360"/></div>
      <div style="margin-top:10px;text-align:right;"><button type="button" data-action="save">💾 Save</button></div>`;
    return div;
  }
  _replaceHTML(result, content, options) { content.replaceChildren(result); }
  _onRender(context, options) {
    this.element.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      const el  = this.element;
      const get = n => el.querySelector(`[name="${n}"]`)?.value;
      await setSetting(S.tokenSettings, {
        disposition:  parseInt(get('disposition') ?? '-1'),
        displayName:  parseInt(get('displayName') ?? '0'),
        vision:       !!el.querySelector('[name="vision"]')?.checked,
        visionRange:  parseInt(get('visionRange') ?? '0'),
        visionAngle:  parseInt(get('visionAngle') ?? '360'),
      });
      uiInfo('Token settings saved.');
      this.close();
    });
  }
}
