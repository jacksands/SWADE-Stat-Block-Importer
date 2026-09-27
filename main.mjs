// main.mjs — entry point for swade-stat-block-importer (V14 / SWADE v6+)
import { MODULE_ID, S, loc, uiInfo, uiError, getSetting, setSetting, injectCSS } from './utils.mjs';
import { setAllPacks, getAllActiveCompendiums } from './lib/compendium-ops.mjs';
import { SelectCompendiums, TokenSettingsApp, ImageUploadSettingsApp } from './apps/settings-apps.mjs';
import { SwadeImporterApp, openImporterDialog } from './apps/importer-app.mjs';
import { InstructionsApp, openInstructions } from './apps/instructions-app.mjs';
import { migrateOldSettings } from './library/store.mjs';

// ── Settings registration ─────────────────────────────────────────────
async function registerSettings() {
  game.settings.registerMenu(MODULE_ID, 'instructionsMenu', {
    name: 'Instructions & Reference', label: 'Instructions & Reference',
    hint: 'How to use the importer, stat block format guide, and editable reference lists for Edges, Powers, Special Abilities, and Items.',
    icon: 'fas fa-book-open', type: InstructionsApp, restricted: false,
  });
  game.settings.registerMenu(MODULE_ID, 'compendiumsMenu', {
    name: 'Compendiums to Search', label: 'Compendiums to Search',
    hint: loc('sbi.settings.CompendiumsSelectorHint'),
    icon: 'fas fa-database', type: SelectCompendiums, restricted: false,
  });
  game.settings.registerMenu(MODULE_ID, 'tokenMenu', {
    name: 'Default Token Settings', label: 'Default Token Settings',
    hint: loc('sbi.settings.TokenSettingsHint'),
    icon: 'fas fa-eye', type: TokenSettingsApp, restricted: false,
  });

  const defs = [
    { key: S.packageToUse,              type: Array,   default: [],      config: false, scope: 'world' },
    { key: S.compsToUse,                type: Array,   default: [],      config: false, scope: 'world' },
    { key: S.activeCompendiums,         type: Array,   default: [],      config: false, scope: 'world' },
    { key: S.lastSaveFolder,            type: String,  default: '',      config: false, scope: 'world' },
    { key: S.tokenSettings,             type: Object,  default: { disposition: -1, displayName: 0, vision: false, visionRange: 0, visionAngle: 360 }, config: false, scope: 'world' },
    { key: S.defaultActorType,          type: String,  default: 'npc',   config: true,  scope: 'world', name: loc('sbi.settings.DefaultActorType'), choices: { npc: 'NPC', character: 'Character' } },
    { key: S.defaultIsWildcard,         type: Boolean, default: false,   config: true,  scope: 'world', name: loc('sbi.settings.DefaultIsWildcard') },
    { key: S.numberOfBennies,           type: Number,  default: 2,       config: true,  scope: 'world', name: loc('sbi.settings.NumberOfBennies'), hint: loc('sbi.settings.NumberOfBenniesHint') },
    { key: S.bulletPointIcons,          type: String,  default: '•|■',   config: true,  scope: 'world', name: loc('sbi.settings.BulletPointIcons'),  hint: loc('sbi.settings.BulletPointIconsHint') },
    { key: S.modifiedSpecialAbs,        type: Boolean, default: false,   config: true,  scope: 'world', name: loc('sbi.settings.ModifiedSpecialAbilities'), hint: loc('sbi.settings.ModifiedSpecialAbilitiesHint') },
    { key: S.allAsSpecialAbilities,     type: Boolean, default: false,   config: true,  scope: 'world', name: loc('sbi.settings.AllAsSpecialAbilities'), hint: loc('sbi.settings.AllAsSpecialAbilitiesHint') },
    { key: S.autoCalcToughness,         type: Boolean, default: false,   config: true,  scope: 'world', name: loc('sbi.settings.AutoCalcToughness'), hint: loc('sbi.settings.AutoCalcToughnessHint') },
    { key: S.autoCalcSize,              type: Boolean, default: true,    config: true,  scope: 'world', name: loc('sbi.settings.SetTokenSize'), hint: loc('sbi.settings.SetTokenSizeHint') },
    { key: S.calculateIgnoredWounds,    type: Boolean, default: true,    config: true,  scope: 'world', name: loc('sbi.settings.CalculateIgnoredWounds'), hint: loc('sbi.settings.CalculateIgnoredWoundsHint') },
    { key: S.calculateAdditionalWounds, type: Boolean, default: true,    config: true,  scope: 'world', name: loc('sbi.settings.CalculateAdditionalWounds'), hint: loc('sbi.settings.CalculateAdditionalWoundsHint') },
    { key: S.twoHandsNotation,          type: String,  default: 'two hands|two-handed', config: true, scope: 'world', name: loc('sbi.settings.TwoHandsLabel'), hint: loc('sbi.settings.TwoHandsHint') },
    { key: S.additionalTraits,          type: String,  default: '',      config: true,  scope: 'world', name: loc('sbi.settings.AdditionalTraits'), hint: loc('sbi.settings.AdditionalTraitsHint') },
    { key: S.renderSheet,               type: Boolean, default: false,   config: true,  scope: 'world', name: loc('sbi.settings.RenderSheet') },
    { key: S.imgUploadPath, type: String, default: '', config: false, scope: 'world' },
    // Legacy ref settings — kept for migration to sbiLibrary; not shown in config UI
    { key: S.refEdges,                  type: String,  default: '',      config: false, scope: 'world' },
    { key: S.refPowers,                 type: String,  default: '',      config: false, scope: 'world' },
    { key: S.refAbilities,              type: String,  default: '',      config: false, scope: 'world' },
    // New library store (named lists, compendium slots, prefs)
    { key: S.sbiLibrary,                type: Object,  default: {},      config: false, scope: 'world' },
  ];
  for (const def of defs) game.settings.register(MODULE_ID, def.key, def);

  game.settings.registerMenu(MODULE_ID, 'imageUploadMenu', {
    name: 'Actor Image Upload Path', label: '📁 Browse…',
    hint: 'Set the Foundry folder where dropped images are uploaded. Click to browse.',
    icon: 'fas fa-folder-open', type: ImageUploadSettingsApp, restricted: false,
  });
}

// ── Foundry lifecycle hooks ───────────────────────────────────────────
Hooks.on('ready', async () => {
  await setAllPacks();
  await registerSettings();
  await setSetting(S.activeCompendiums, getAllActiveCompendiums());
  await migrateOldSettings();
  console.log('[SBI] SWADE Stat Block Importer ready (V14 / SWADE v6+).');
});

Hooks.on('renderActorDirectory', (app, html) => {
  if (!game.userId || !game.users?.get(game.userId)?.can('ACTOR_CREATE')) return;
  if (html.querySelector('#sbi-import-btn')) return;

  // SBI button: large, full-width, on top
  const btn = document.createElement('button');
  btn.id            = 'sbi-import-btn';
  btn.innerHTML     = `<i class="fas fa-align-left"></i> ${loc('sbi.HTML.StatBlockImporterTitle')}`;
  btn.style.cssText = 'width:100%;padding:4px 8px;font-size:13px;font-weight:600;';
  btn.addEventListener('click', openImporterDialog);

  // V14: restructure .action-buttons so SBI is large/top, natives smaller/below side-by-side
  const actionBtns = html.querySelector('.directory-header .action-buttons')
    ?? html.querySelector('.directory-header');
  const nativeBtns = actionBtns ? [...actionBtns.querySelectorAll('button')] : [];

  if (actionBtns && nativeBtns.length) {
    const nativeRow = document.createElement('div');
    nativeRow.style.cssText = 'display:flex;gap:4px;width:100%;';
    nativeBtns.forEach(b => {
      b.style.setProperty('flex', '1', 'important');
      b.style.setProperty('font-size', '11px', 'important');
      b.style.setProperty('padding', '2px 4px', 'important');
      nativeRow.appendChild(b);
    });
    actionBtns.style.cssText = 'display:flex;flex-direction:column;gap:3px;padding:2px 0;';
    actionBtns.appendChild(btn);
    actionBtns.appendChild(nativeRow);
  } else {
    btn.style.cssText = 'width:calc(100% - 8px);margin:4px 4px 0;';
    html.querySelector('.directory-footer')?.append(btn);
  }
  // Instructions: Game Settings (registerMenu) + importer dialog Help button
});
