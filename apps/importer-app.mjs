// apps/importer-app.mjs — SwadeImporterApp
import { MODULE_ID, S, loc, uiInfo, uiError, getSetting, setSetting, injectCSS, SBI_CSS,
         isEmpty } from '../utils.mjs';
import { getFolderId, getAllActorFolders, getAllActiveCompendiums } from '../lib/compendium-ops.mjs';
import { buildAndImport } from '../lib/builder.mjs';
import { actorToStatBlock, analyzeStatBlock, renderAnalysis, analyzeVehicleStatBlock, renderVehicleAnalysis } from '../lib/exporter.mjs';
import { isVehicleStatBlock } from '../lib/parser.mjs';
import { openInstructions } from './instructions-app.mjs';

let _importerApp = null;

class SwadeImporterApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id:       `${MODULE_ID}.importer`,
    window:   { title: 'SWADE Stat Block Importer', resizable: true, minimizable: true },
    position: { width: 560 },
  };

  _activeTab    = 'import';
  _analysisOK   = false;
  _imageSrc     = '';

  async _prepareContext(options) {
    const tokenDefs = getSetting(S.tokenSettings) ?? {};
    return {
      actorType:   getSetting(S.defaultActorType)  ?? 'npc',
      isWildcard:  getSetting(S.defaultIsWildcard) ?? false,
      disposition: tokenDefs.disposition ?? -1,
      vision:      tokenDefs.vision ?? false,
      visionRange: tokenDefs.visionRange ?? 0,
      visionAngle: tokenDefs.visionAngle ?? 360,
      lastFolder:  getSetting(S.lastSaveFolder) ?? '',
    };
  }

  async _renderHTML(context, options) {
    injectCSS('sbi-global-styles', SBI_CSS);
    const el   = document.createElement('div');
    el.id      = 'sbi-root';
    el.innerHTML = this._buildHTML(context);
    return el;
  }

  _replaceHTML(result, content, options) { content.replaceChildren(result); }

  _onRender(context, options) {
    this._sizeObserver();
    this._tabs();
    this._importHandlers();
    this._imageHandlers();
    this._exportHandlers();
    if (this._activeTab !== 'import') this._switchTab(this._activeTab);
  }

  _sizeObserver() {
    requestAnimationFrame(() => {
      const content = this.element.querySelector('.window-content');
      const header  = this.element.querySelector('.window-header');
      const inner   = this.element.querySelector('#sbi-root');
      if (!content || !inner) return;
      const apply = () => {
        const avail = window.innerHeight - 60 - (header?.offsetHeight ?? 40);
        content.style.setProperty('height', `${Math.max(380, avail)}px`, 'important');
        content.style.setProperty('overflow-y', 'auto', 'important');
      };
      apply();
      new ResizeObserver(apply).observe(inner);
    });
  }

  _tabs() {
    this.element.querySelectorAll('.sbi-tab-btn').forEach(btn =>
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab))
    );
  }

  _switchTab(tab) {
    this._activeTab = tab;
    this.element.querySelectorAll('.sbi-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    this.element.querySelectorAll('.sbi-tab-pane').forEach(p => { p.style.display = p.dataset.tab === tab ? '' : 'none'; });
  }

  _importHandlers() {
    this.element.querySelector('#sbi-open-help')?.addEventListener('click', openInstructions);
    this.element.querySelector('#sbi-analyze-btn')?.addEventListener('click',  () => this._doAnalyze());
    this.element.querySelector('#sbi-do-import-btn')?.addEventListener('click', () => this._doImport());
    this.element.querySelector('#sbi-close-import')?.addEventListener('click', () => this.close());
    this.element.querySelector('#sbi-statblock')?.addEventListener('input', () => {
      this._analysisOK = false;
      const btn = this.element.querySelector('#sbi-do-import-btn');
      if (btn) btn.disabled = true;
      const out = this.element.querySelector('#sbi-analysis-output');
      if (out) out.innerHTML = '';
    });
    // Wire actor type radios — Vehicle disables Wild Card
    this.element.querySelectorAll('input[name="sbi-actorType"]').forEach(radio => {
      radio.addEventListener('change', () => this._updateVehicleUI(radio.value === 'vehicle'));
    });
  }

  _updateVehicleUI(isVehicle) {
    const wcBox  = this.element.querySelector('#sbi-isWildCard');
    const wcNote = this.element.querySelector('#sbi-wc-note');
    if (wcBox)  { wcBox.disabled = isVehicle; if (isVehicle) wcBox.checked = false; }
    if (wcNote) wcNote.style.opacity = isVehicle ? '1' : '0';
  }

  async _doAnalyze() {
    const raw = this.element.querySelector('#sbi-statblock')?.value ?? '';
    if (!raw.trim()) { uiInfo(loc('sbi.parser.EmptyClipboard')); return; }
    const out = this.element.querySelector('#sbi-analysis-output');
    const btn = this.element.querySelector('#sbi-do-import-btn');

    if (isVehicleStatBlock(raw)) {
      // Auto-select Vehicle radio
      const vRadio = this.element.querySelector('input[name="sbi-actorType"][value="vehicle"]');
      if (vRadio) { vRadio.checked = true; this._updateVehicleUI(true); }
      const result = await analyzeVehicleStatBlock(raw);
      this._analysisOK = result.valid;
      if (out) out.innerHTML = renderVehicleAnalysis(result);
    } else {
      const result = analyzeStatBlock(raw);
      this._analysisOK = result.valid && !!result.sections.attributes;
      if (out) out.innerHTML = renderAnalysis(result);
      // Auto-populate image from JSON extract if field is empty
      if (result.extractedImage && !this._imageSrc) {
        this._imageSrc = result.extractedImage;
        const urlField = this.element.querySelector('#sbi-img-url');
        if (urlField) urlField.value = result.extractedImage;
        this._updateImagePreview();
      }
    }
    if (btn) btn.disabled = !this._analysisOK;
  }

  async _doImport() {
    if (!this._analysisOK) return;
    const el       = this.element;
    const settings = {
      actorType:  el.querySelector('input[name="sbi-actorType"]:checked')?.value ?? 'npc',
      isWildCard: !!el.querySelector('#sbi-isWildCard')?.checked,
      saveFolder: el.querySelector('#sbi-saveFolder')?.value ?? '',
      img:        this._imageSrc || (el.querySelector('#sbi-img-url')?.value?.trim() || ''),
      tokenSettings: {
        disposition: parseInt(el.querySelector('input[name="sbi-disposition"]:checked')?.value ?? '-1'),
        vision:      !!el.querySelector('#sbi-vision')?.checked,
        visionRange: parseInt(el.querySelector('#sbi-visionRange')?.value ?? '0'),
        visionAngle: parseInt(el.querySelector('#sbi-visionAngle')?.value ?? '360'),
      },
    };
    await setSetting(S.lastSaveFolder, settings.saveFolder);
    await buildAndImport(settings, el.querySelector('#sbi-statblock')?.value ?? '');
  }

  _imageHandlers() {
    const zone     = this.element.querySelector('#sbi-img-zone');
    const urlFld   = this.element.querySelector('#sbi-img-url');
    const clearBtn = this.element.querySelector('#sbi-img-clear');
    const browseBtn= this.element.querySelector('#sbi-img-browse');

    // Helper: set image source and update UI
    const setImg = (src, displayText = null) => {
      this._imageSrc = src;
      if (urlFld) urlFld.value = displayText ?? src;
      this._updateImagePreview();
    };

    // Manual URL input
    urlFld?.addEventListener('change', () => {
      this._imageSrc = urlFld.value.trim();
      this._updateImagePreview();
    });

    // Clear button
    clearBtn?.addEventListener('click', () => {
      this._imageSrc = '';
      if (urlFld) urlFld.value = '';
      this._updateImagePreview();
    });

    // 📁 Browse: open Foundry FilePicker
    browseBtn?.addEventListener('click', () => {
      const startPath = this._imageSrc?.startsWith('http') ? '' :
        (this._imageSrc || getSetting(S.imgUploadPath)?.trim() ||
         `worlds/${game.world?.id ?? ''}/actors/`);
      const fp = new FilePicker({
        type:     'image',
        current:  startPath,
        callback: (path) => setImg(path),
      });
      fp.render(true);
    });

    // Drag-and-drop: upload to Foundry file system
    zone?.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('img-drag'); });
    zone?.addEventListener('dragleave', ()  => zone.classList.remove('img-drag'));
    zone?.addEventListener('drop', async e => {
      e.preventDefault();
      zone.classList.remove('img-drag');
      const file = e.dataTransfer?.files?.[0];
      if (!file || !file.type.startsWith('image/')) { uiInfo('Please drop an image file.'); return; }
      const uploadFolder = getSetting(S.imgUploadPath)?.trim() ||
        `worlds/${game.world?.id ?? 'world'}/actors`;
      try {
        // Ensure folder exists then upload
        await FilePicker.createDirectory('data', uploadFolder, {}).catch(() => {});
        const result = await FilePicker.upload('data', uploadFolder, file, {});
        if (result?.path) { setImg(result.path); }
        else throw new Error('Upload returned no path');
      } catch(err) {
        console.warn('[SBI] Upload failed, falling back to data URI:', err);
        // Fallback: base64 data URI (works for this session only)
        const reader = new FileReader();
        reader.onload = ev => setImg(ev.target.result, '(local — not saved to server)');
        reader.readAsDataURL(file);
        uiInfo('Image uploaded locally only. Check the upload path in module settings.');
      }
    });
  }

  _updateImagePreview() {
    const preview     = this.element.querySelector('#sbi-img-preview');
    const placeholder = this.element.querySelector('#sbi-img-placeholder');
    const clearBtn    = this.element.querySelector('#sbi-img-clear');
    const hasImg = !!this._imageSrc;
    if (preview) { preview.src = hasImg ? this._imageSrc : ''; preview.style.display = hasImg ? 'block' : 'none'; }
    if (placeholder) placeholder.style.display = hasImg ? 'none' : '';
    if (clearBtn) clearBtn.disabled = !hasImg;
  }

  _exportHandlers() {
    const dropZone = this.element.querySelector('#sbi-drop-zone');
    dropZone?.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone?.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
    dropZone?.addEventListener('drop',      e  => { e.preventDefault(); dropZone.classList.remove('drag-over'); this._handleDrop(e); });

    const search = this.element.querySelector('#sbi-actor-search');
    search?.addEventListener('input', () => this._searchActors(search.value));

    this.element.querySelector('#sbi-copy-btn')?.addEventListener('click', async () => {
      const text = this.element.querySelector('#sbi-export-output')?.value;
      if (!text) return;
      try { await navigator.clipboard.writeText(text); uiInfo('Stat block copied to clipboard.'); }
      catch { uiError('Clipboard write failed — select all text and copy manually.'); }
    });
    this.element.querySelector('#sbi-close-export')?.addEventListener('click', () => this.close());
  }

  async _handleDrop(e) {
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    if (data?.type !== 'Actor') return;
    try {
      const actor = await fromUuid(data.uuid);
      if (actor) this._renderExport(actor);
    } catch(err) { console.error('[SBI] drop error', err); }
  }

  _searchActors(query) {
    const ul = this.element.querySelector('#sbi-search-results');
    if (!ul) return;
    if (!query || query.length < 2) { ul.innerHTML = ''; return; }
    ul.innerHTML = '';
    (game.actors?.contents ?? []).filter(a => a.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
      .forEach(actor => {
        const li = document.createElement('li');
        li.textContent = `${actor.name} (${actor.type})`;
        li.addEventListener('click', () => {
          this._renderExport(actor);
          ul.innerHTML = '';
          const inp = this.element.querySelector('#sbi-actor-search');
          if (inp) inp.value = actor.name;
        });
        ul.append(li);
      });
  }

  _renderExport(actor) {
    try {
      const text = actorToStatBlock(actor);
      const ta   = this.element.querySelector('#sbi-export-output');
      if (ta) ta.value = text;
      const lbl = this.element.querySelector('#sbi-export-label');
      if (lbl) lbl.textContent = `${actor.name} (${actor.type})`;
    } catch(err) {
      console.error('[SBI] export error', err);
      uiError('Failed to generate stat block — see console.');
    }
  }

  _buildHTML(ctx) {
    const chk     = (a, b) => a == b ? 'checked' : '';
    const folders = getAllActorFolders().map(f => `<option value="${f}" ${ctx.lastFolder === f ? 'selected' : ''}>${f}</option>`).join('');
    return `
<div class="sbi-tab-header">
  <div class="sbi-tabs">
    <button type="button" class="sbi-tab-btn active" data-tab="import">⬇ Import</button>
    <button type="button" class="sbi-tab-btn" data-tab="export">⬆ Export</button>
  </div>
  <button type="button" id="sbi-open-help" style="font-size:11px;padding:2px 8px;opacity:0.75;white-space:nowrap;" title="Instructions &amp; Reference">📖 Help</button>
</div>

<!-- IMPORT TAB -->
<div class="sbi-tab-pane" data-tab="import">
  <div class="fg"><label>Actor Type</label><div class="fr">
    <label><input type="radio" name="sbi-actorType" value="npc" ${chk(ctx.actorType,'npc')}/> NPC</label>
    <label><input type="radio" name="sbi-actorType" value="character" ${chk(ctx.actorType,'character')}/> Character</label>
    <label><input type="radio" name="sbi-actorType" value="vehicle" ${chk(ctx.actorType,'vehicle')}/> Vehicle</label>
  </div></div>
  <div class="fg"><label><input type="checkbox" id="sbi-isWildCard" ${ctx.isWildcard?'checked':''}/> Wild Card</label>
    <span id="sbi-wc-note" style="font-size:10px;opacity:0;color:var(--color-level-warning,#e8a030);margin-left:6px;">(not applicable for vehicles)</span></div>
  <div class="fg"><label>Disposition</label><div class="fr">
    <label><input type="radio" name="sbi-disposition" value="-1" ${chk(ctx.disposition,-1)}/> Hostile</label>
    <label><input type="radio" name="sbi-disposition" value="0"  ${chk(ctx.disposition, 0)}/> Neutral</label>
    <label><input type="radio" name="sbi-disposition" value="1"  ${chk(ctx.disposition, 1)}/> Friendly</label>
    <label><input type="radio" name="sbi-disposition" value="-2" ${chk(ctx.disposition,-2)}/> Secret</label>
  </div></div>
  <div class="fg">
    <label><input type="checkbox" id="sbi-vision" ${ctx.vision?'checked':''}/> Has Vision</label>
    <label>Range <input type="number" id="sbi-visionRange" value="${ctx.visionRange}" style="width:56px"/></label>
    <label>Angle <input type="number" id="sbi-visionAngle" value="${ctx.visionAngle}" style="width:56px" max="360"/></label>
  </div>
  <div class="fg"><label>Folder</label>
    <select id="sbi-saveFolder" style="flex:1;"><option value="">— no folder —</option>${folders}</select>
  </div>
  <div class="fg" style="align-items:center;gap:6px;">
    <label style="white-space:nowrap;">Actor Image</label>
    <div id="sbi-img-zone" style="display:flex;align-items:center;gap:6px;flex:1;border:1px dashed var(--border-accent);border-radius:4px;padding:4px 6px;cursor:default;" title="Drop image file here, browse files, or enter a URL">
      <img id="sbi-img-preview" src="" alt="" style="display:none;max-height:40px;max-width:40px;object-fit:contain;border-radius:3px;border:1px solid var(--border-primary);"/>
      <span id="sbi-img-placeholder" style="font-size:11px;opacity:0.55;white-space:nowrap;">Drop image or browse</span>
      <input type="text" id="sbi-img-url" placeholder="https://... or Foundry path" style="flex:1;min-width:0;font-size:11px;"/>
      <button type="button" id="sbi-img-browse" title="Browse Foundry file system" style="font-size:13px;padding:1px 5px;line-height:1.4;">📁</button>
      <button type="button" id="sbi-img-clear"  disabled title="Clear image" style="font-size:11px;padding:1px 5px;line-height:1.4;">✕</button>
    </div>
  </div>
  <div style="margin:6px 0 2px"><strong>Stat Block</strong> <span style="font-size:10px;opacity:0.55;">(Pinnacle, Savaged.us plain/markdown/JSON)</span></div>
  <textarea id="sbi-statblock" rows="10" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:11px;resize:vertical;"
    placeholder="Paste any supported stat block format here…"></textarea>
  <div id="sbi-analysis-output"></div>
  <div class="sbi-footer">
    <button type="button" id="sbi-close-import">Cancel</button>
    <button type="button" id="sbi-analyze-btn">🔍 Analyze</button>
    <button type="button" id="sbi-do-import-btn" disabled>⬇ Import</button>
  </div>
</div>

<!-- EXPORT TAB -->
<div class="sbi-tab-pane" data-tab="export" style="display:none">
  <div id="sbi-drop-zone">
    <i class="fas fa-user" style="font-size:1.6em;display:block;margin-bottom:6px;"></i>
    Drop an actor from the Actors sidebar here
    <div id="sbi-export-label" style="margin-top:4px;font-size:11px;opacity:0.7;"></div>
  </div>
  <div class="fg" style="margin-bottom:6px;"><label>Search actor:</label>
    <input type="text" id="sbi-actor-search" style="flex:1;" placeholder="Type actor name…"/>
  </div>
  <ul id="sbi-search-results"></ul>
  <textarea id="sbi-export-output" rows="14" readonly
    style="width:100%;box-sizing:border-box;font-family:monospace;font-size:11px;resize:vertical;"
    placeholder="Select or drop an actor to generate its stat block…"></textarea>
  <div class="sbi-footer">
    <button type="button" id="sbi-close-export">Close</button>
    <button type="button" id="sbi-copy-btn">📋 Copy to Clipboard</button>
  </div>
</div>`;
  }
}

function openImporterDialog() {
  const existing = foundry.applications.instances?.get(`${MODULE_ID}.importer`);
  if (existing?.rendered) { try { existing.bringToFront(); } catch { existing.render({ force: true }); } return; }
  _importerApp = new SwadeImporterApp();
  _importerApp.render({ force: true });
}

// ============================================================
// SETTINGS MENUS (V14 ApplicationV2 — _renderHTML + _replaceHTML required)
// ============================================================


export { SwadeImporterApp, openImporterDialog };
