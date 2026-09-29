// apps/instructions-app.mjs — InstructionsApp with named list library system
import { uiInfo, uiError, loc, injectCSS, SBI_HELP_CSS, escHtml, getSetting, setSetting, S } from '../utils.mjs';
import {
  ITEM_SUBTYPES, ITEM_SUBTYPE_LABEL, MAIN_REF_CATS,
  getDefaultContent, getCompendiumContent, getNamedListsFor, getNamedListById,
  hasDefaultContent, buildMasterList,
  createNamedList, saveNamedList, renameNamedList, deleteNamedList,
  saveCompendiumContent, loadFromCompendiums,
  getSettingRules, getActiveSettingRuleSet,
  setActiveSettingRuleSet, createSettingRuleSet, saveSettingRuleSet,
  renameSettingRuleSet, deleteSettingRuleSet,
  SETTING_RULE_CATALOG,
  getProfiles, getActiveProfile, setActiveProfile, createProfile, saveProfile,
  renameProfile, deleteProfile, normalizePrefs, applyProfile, applyProfilePrefs,
} from '../library/store.mjs';
import { SelectCompendiums } from './settings-apps.mjs';
import { EntryEditorApp } from './entry-editor-app.mjs';
import { openExport, openImport } from './export-import-app.mjs';

// Skills is always included in master copy — cannot be ignored
const ALWAYS_INCLUDED = new Set(['skills']);

const CAT_LABEL_PLAIN = {
  skills:'Skills', edges:'Edges', powers:'Powers',
  abilities:'Abilities', hindrances:'Hindrances', races:'Races',
};
const ITEM_ICONS = { weapon:'⚔', armor:'🛡', shield:'🔰', gear:'🎒', hindrance:'⚠', vehmod:'🔧' };

// Prefaces prepended when copying individual tab lists to clipboard
const CLIPBOARD_PREFACES = {
  skills: `=== SWADE SKILLS REFERENCE ===
The following is the list of available skills for SWADE (Adventure Edition) character and NPC creation.
Each skill is linked to an attribute. Use exactly the skill names shown below.
When assigning skills, provide a die value (d4, d6, d8, d10, or d12).
---\n`,
  edges: `=== SWADE EDGES REFERENCE ===
The following is a list of Edges for SWADE character and NPC creation.
When assigning Edges, select from this list and use the exact names shown.
Characters must meet all listed requirements before taking an Edge.
---\n`,
  powers: `=== SWADE POWERS REFERENCE ===
The following is a list of Powers available for characters with an Arcane Background.
When assigning Powers, select from this list. Include the Power Points cost in the stat block.
---\n`,
  abilities: `=== SWADE SPECIAL ABILITIES REFERENCE ===
The following is a list of Special Abilities for SWADE creatures and characters.
Use these when creating NPCs or monsters with special traits.
Each ability should appear on its own bullet line: • AbilityName: Description.
---\n`,
  hindrances: `=== SWADE HINDRANCES REFERENCE ===
The following is a list of Hindrances for SWADE character and NPC creation.
Minor Hindrances give 1 point; Major Hindrances give 2 points.
At creation a character may take up to 1 Major + 2 Minor hindrances.
---\n`,
  races: `=== SWADE RACES / ANCESTRIES REFERENCE ===
The following is a list of playable races for SWADE character creation.
Apply ALL listed racial abilities to the character. Racial negative traits (like Outsider or All Thumbs) still apply.
---\n`,
};

// Plain-text version of format instructions (used in master copy)
const FORMAT_INSTRUCTIONS_TEXT = `=== SWADE STAT BLOCK FORMAT ===
Use EXACTLY this format. Do not add extra sections or change label names.

[WC] Character Name
(Optional: one or two sentence description or biography.)

Attributes: Agility dX, Smarts dX, Spirit dX, Strength dX, Vigor dX
Skills: Skill1 dX, Skill2 dX, Skill3 dX
Pace: N; Parry: N; Toughness: N (armor bonus if any)
Hindrances: Hindrance1, Hindrance2 (or — if none)
Edges: Edge1, Edge2 (or — if none)
Powers: power1, power2. Power Points: N  (omit entirely if no Arcane Background)
Weapons: WeaponA (Range Melee, Damage Str+dX); WeaponB (Range S/M/L, Damage XdY, RoF N, AP N)
Armor: ArmorName (Armor N)  (omit if none)
Shield: ShieldName (Parry +N)  (omit if none)
Gear: item1; item2; item3  (omit if none)
Special Abilities:
• AbilityName: Description.
• AbilityName: Description.

KEY RULES:
- Include [WC] prefix only for Wild Cards. Omit for Extras.
- Toughness format: Total (ArmorBonus). Example: 7 (2) = 5 base + 2 armor.
- Parry = 2 + half of Fighting die (d4=2, d6=3, d8=4, d10=5, d12=6).
- Toughness base = 2 + half of Vigor die (same scale as Parry above).
- Use bullet (•) before each Special Ability. Name followed by colon and description.
- Separate Weapons/Gear/Armor items with semicolons (;).`;

function keyToCatSub(key) {
  if (MAIN_REF_CATS.includes(key)) return { category: key, subtype: null };
  return { category: 'items', subtype: key };
}

export class InstructionsApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'sbi-help',
    window: { title: 'SWADE Stat Block Importer — Instructions & Reference', resizable: true },
    position: { width: 720, height: 620 },
  };

  _activeSource  = {};
  _activeItemSub = 'weapon';
  _activeTab     = 'quick-start';
  _ignoredCats   = new Set();
  _fromCompsInProgress = false; // cats to exclude from master copy (skills never added here)

  // ── HTML builders ──────────────────────────────────────────────────
  _buildTabs() {
    const tabs = [
      ['profiles','🎛️ Library Sources'],
      ['quick-start','🚀 Quick Start'], ['settings','⚙ Settings'],
      ['format','📄 Format'], ['ai','🤖 AI Creation'],
      ['setting-rules','📐 Setting Rules'],
      ['export-import','📤 Export/Import'],
      ['skills','📘 Skills'], ['edges','✦ Edges'], ['powers','✦ Powers'],
      ['abilities','✦ Abilities'], ['hindrances','⚠ Hindrances'],
      ['races','🧝 Races'], ['items','📦 Items'],
    ];
    return `<div class="h-tabs">${tabs.map(([id,lbl]) => `<button class="h-tab" data-tab="${id}">${lbl}</button>`).join('')}</div>`;
  }

  _buildRefPaneInner(key, { noIgnore = false } = {}) {
    const ignoreSection = noIgnore ? '' : `
<div class="ignore-row" id="sbi-ignore-row-${key}">
  <button class="src-action ignore-toggle" data-action="toggle-ignore" data-key="${key}">
    ✓ Include in Copy All for AI
  </button>
  <span class="ignore-warning" id="sbi-ignore-warn-${key}" style="display:none;font-size:10px;color:var(--warning);">
    ⚠ This list will be excluded from the master copy.
  </span>
</div>`;
    return `<div class="src-picker" id="sbi-sp-${key}"></div>
<div class="ref-actions">
  <button class="src-action" data-action="copy-master" data-key="${key}" title="Copy with AI preface">📋 Copy for AI</button>
  <button class="src-action" data-action="add-entry"   data-key="${key}" title="Add entry to selected list" disabled>➕ Add Entry</button>
  <button class="src-action" data-action="from-comps"  data-key="${key}" title="Load from configured compendiums">🔄 From Comps</button>
  <button class="src-action" data-action="do-export"   data-key="${key}" title="Export as JSON">⬇ Export</button>
  <button class="src-action" data-action="do-import"   data-key="${key}" title="Import from JSON">⬆ Import</button>
</div>
${ignoreSection}
<div class="ref-wrap">
  <div class="src-readonly-notice" id="sbi-ro-${key}" style="display:none">📖 Read-only — select a Named List to edit</div>
  <textarea id="sbi-ta-${key}" class="ref-area" readonly></textarea>
</div>
<div class="ref-list-mgmt" id="sbi-lm-${key}" style="display:none">
  <button class="src-action" data-action="save-list"   data-key="${key}">💾 Save</button>
  <button class="src-action" data-action="rename-list" data-key="${key}">✏️ Rename</button>
  <button class="src-action" data-action="delete-list" data-key="${key}">🗑️ Delete</button>
</div>`;
  }

  _buildSettingRulesPane() {
    const groupOrder = ['core', 'setting', 'optional', 'params'];
    const groupLabels = {
      core: 'Core Setting Rules',
      setting: 'Setting-Specific Rules',
      optional: 'Optional Rules',
      params: 'Character Creation Parameters',
    };
    const groupHelps = {
      core: 'Official SWADE Adventure Edition setting rules that modify character creation and gameplay.',
      setting: 'Rules for settings that use Frameworks (classes/archetypes) or Factions.',
      optional: 'Optional rules that add granularity (encumbrance, minimum strength, wealth system).',
      params: 'Numeric/text parameters that define the starting power level of characters.',
    };

    // Render one rule (boolean checkbox or parameter input). Help button lives
    // OUTSIDE the <label> so clicking it never toggles the checkbox.
    const renderRule = (rule) => {
      const id = `sr-${rule.key}`;
      const helpId = `sr-help-${rule.key}`;
      let head;
      if (rule.type === 'boolean') {
        head = `<input type="checkbox" id="${id}" data-key="${rule.key}" style="flex-shrink:0;margin-top:2px;">
          <label for="${id}" class="sr-rule-label">${rule.label}</label>`;
      } else {
        const inputType = rule.type === 'number' ? 'number' : 'text';
        const min = rule.min != null ? `min="${rule.min}"` : '';
        const max = rule.max != null ? `max="${rule.max}"` : '';
        const style = rule.type === 'number' ? 'width:80px' : 'flex:1;min-width:200px';
        const placeholder = rule.type === 'number' ? '' : 'placeholder="e.g. Initiate, Adept, Master..."';
        head = `<label for="${id}" class="sr-rule-label">${rule.label}</label>
          <input type="${inputType}" id="${id}" data-key="${rule.key}" ${min} ${max} style="${style}" ${placeholder}>`;
      }
      return `<div class="sr-rule-item">
        <div class="sr-rule-head">
          ${head}
          <button type="button" class="sr-help-btn" data-help="${helpId}" title="${escHtml(rule.help)}">ⓘ</button>
        </div>
        <div class="sr-help-text" id="${helpId}">${escHtml(rule.help)}</div>
      </div>`;
    };

    let html = '<div id="sbi-sr-pane">';
    html += '<h3>Setting Rules</h3>';
    html += '<p style="font-size:12px;">Define character creation rules for your campaign setting. The active rule set is included in <strong>📋 Copy All for AI</strong>.</p>';

    // Rule set picker
    html += '<div id="sbi-sr-picker" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;"></div>';

    // Linked usage profile
    html += `<div class="sr-link-box">
      <label>Linked Usage Profile <select id="sr-linked-profile"></select></label>
      <span class="sr-link-hint">When set, loading this rule set can also switch the library sources (you'll be asked to confirm).</span>
    </div>`;

    // Read-only notice for default
    html += `<div id="sbi-sr-ro-notice" style="display:none;font-size:11px;color:var(--fg-muted);margin:4px 0 8px;">📖 Default rules — these values are read-only. Create a new set to customize.</div>`;

    // Scrollable rules container
    html += '<div class="sr-scroll">';

    for (const grp of groupOrder) {
      const rules = SETTING_RULE_CATALOG.filter(r => r.group === grp);
      if (!rules.length) continue;

      html += `<details class="sr-group" open>`;
      html += `<summary class="sr-group-summary">`;
      html += `<span>${groupLabels[grp]}</span>`;
      html += `<span class="sr-group-help">${groupHelps[grp]}</span>`;
      html += `</summary>`;
      html += `<div class="sr-group-body">`;
      for (const rule of rules) html += renderRule(rule);
      html += `</div></details>`;
    }

    // Freeform / Homebrew group — ALWAYS kept (Core Skills + extra notes)
    html += `<details class="sr-group" open>`;
    html += `<summary class="sr-group-summary"><span>Core Skills &amp; Homebrew (Freeform)</span><span class="sr-group-help">Editable reference text included in the AI prompt.</span></summary>`;
    html += `<div class="sr-group-body">`;
    html += `<label class="sr-rule-label" for="sr-core-skills" style="margin-bottom:2px;">Core Skills (start at d4 free, one per line):</label>`;
    html += `<textarea id="sr-core-skills" rows="5" placeholder="Athletics (Agility d4)&#10;Common Knowledge (Smarts d4)&#10;..."></textarea>`;
    html += `<label class="sr-rule-label" for="sr-notes" style="margin-top:6px;margin-bottom:2px;">Extra / Homebrew Instructions (freeform notes for the AI):</label>`;
    html += `<textarea id="sr-notes" rows="3" placeholder="E.g., No Power Points rule is active. Starting funds $1000. Extra skill: Hacking (Smarts)."></textarea>`;
    html += `</div></details>`;

    html += '</div>'; // .sr-scroll

    // Management buttons
    html += `<div id="sbi-sr-mgmt">
      <button type="button" id="sr-save-btn">💾 Save</button>
      <button type="button" id="sr-rename-btn">✏️ Rename</button>
      <button type="button" id="sr-delete-btn">🗑️ Delete</button>
    </div>`;

    // Usage help
    html += `<hr style="margin:12px 0;opacity:0.3;"/>
    <h4 style="margin:4px 0;">How to Use Setting Rules</h4>
    <ul style="font-size:12px;margin:4px 0;padding-left:1.4em;">
      <li>Select <strong>Default SWADE AE</strong> for standard Adventure Edition rules.</li>
      <li>Click <strong>➕ New Set</strong> to create setting-specific rules (e.g., "Modern Horror", "Sci-Fi").</li>
      <li>Toggle rules and edit parameters, then click <strong>💾 Save</strong>. Click <strong>ⓘ</strong> for a rule's description.</li>
      <li>The active set's values are automatically included in <strong>📋 Copy All for AI</strong>.</li>
      <li>Only one setting rule set can be active at a time.</li>
    </ul>`;

    html += '</div>';
    return html;
  }

  // ── Library Sources (Usage Profiles) pane ────────────────────────────
  _buildProfilesPane() { return `
<div id="sbi-up-pane">
  <h3>Library Sources — Usage Profiles</h3>
  <p style="font-size:12px;">Choose which sources feed each category (Default, Compendium, or Named Lists). Save the selection as a reusable <strong>usage profile</strong> and load it later. The active profile's sources are what <strong>📋 Copy All for AI</strong> uses.</p>
  <p style="font-size:12px;">Remember that all libraries listed here depend on the compendiums allowed to be searched, defined in the module settings under <strong>“Compendiums to Search”</strong>.
    <button type="button" id="up-open-comps" class="up-inline-btn" title="Open the Compendiums to Search settings">⚙ Open Compendiums to Search</button></p>

  <div id="sbi-up-picker" class="src-picker"></div>

  <div class="up-meta-box">
    <label>Profile name <input type="text" id="up-name" placeholder="Profile name"></label>
    <label>Description <input type="text" id="up-desc" placeholder="Optional description"></label>
  </div>

  <div class="up-actions">
    <button type="button" id="up-save-btn">💾 Save Profile</button>
    <button type="button" id="up-apply-btn">📥 Apply / Load</button>
    <button type="button" id="up-rename-btn">✏️ Rename</button>
    <button type="button" id="up-delete-btn">🗑️ Delete</button>
    <button type="button" id="up-comps-btn">⚙ Compendiums to Search</button>
  </div>

  <div class="up-link-box">
    <label>Linked Setting Rule Set <select id="up-rule-set"></select></label>
    <span class="up-hint">When set, loading this profile can also switch the Setting Rules (you'll be asked to confirm).</span>
  </div>

  <div class="up-scroll">
    <table class="up-table">
      <thead><tr>
        <th style="text-align:left;">Category</th>
        <th>Default</th><th>Compendium</th><th>Named Lists</th>
      </tr></thead>
      <tbody id="up-tbody"></tbody>
    </table>
  </div>
</div>`; }

  _buildExportImportPane() { return `
<div id="sbi-ei-pane">
  <h3>Export / Import</h3>
  <p style="font-size:12px;">Back up or transfer the module configuration. <strong>Actor data and images are never exported</strong> — they are created by the module but are not part of it.</p>

  <div class="ei-actions">
    <button type="button" id="ei-export-btn">⬇ Export…</button>
    <button type="button" id="ei-import-btn">⬆ Import…</button>
    <button type="button" id="ei-comps-btn">⚙ Compendiums to Search</button>
  </div>

  <h4>Export presets</h4>
  <ul style="font-size:12px;line-height:1.6;">
    <li><strong>Full Backup</strong> — settings, usage profiles, setting rules, compendium data and named lists.</li>
    <li><strong>Settings only</strong> — module settings + setting rules.</li>
    <li><strong>Usage Profiles only</strong> — profiles + library source selections.</li>
    <li><strong>Per category</strong> — choose the tabs to export.</li>
  </ul>

  <h4>Import</h4>
  <ul style="font-size:12px;line-height:1.6;">
    <li>Merge, Replace, or Selective (per category).</li>
    <li>Optionally apply the imported library sources to your active profile, a chosen profile, or a new profile.</li>
    <li>The file is <strong>validated first</strong>: you are warned about missing modules/compendiums and informed about new libraries found locally.</li>
  </ul>
</div>`; }

  _buildHTML() {
    const refPanes = MAIN_REF_CATS.map(key => `
<div class="h-pane" data-tab="${key}">
  ${this._buildRefPaneInner(key, { noIgnore: ALWAYS_INCLUDED.has(key) })}
  ${this._buildRefHowTo(key)}
</div>`).join('');

    const subTabBtns = ITEM_SUBTYPES.map((sub,i) =>
      `<button class="h-sub-tab${i===0?' active':''}\" data-subtab="${sub}">${ITEM_ICONS[sub]} ${ITEM_SUBTYPE_LABEL[sub]}</button>`).join('');
    const subPanes = ITEM_SUBTYPES.map((sub,i) =>
      `<div class="h-sub-pane${i===0?' active':''}\" data-subtab="${sub}">${this._buildRefPaneInner(sub)}</div>`).join('');

    return `<div id="sbi-help-root">
  ${this._buildTabs()}
  <div class="h-master-bar">
    <span style="font-size:11px;opacity:0.7;">Combine all AI instructions into one clipboard paste:</span>
    <button type="button" id="sbi-copy-all-btn" title="Copy setting rules + format + all non-ignored lists for AI">📋 Copy All for AI</button>
  </div>
  <div class="h-pane" data-tab="quick-start">${this._buildQuickStart()}</div>
  <div class="h-pane" data-tab="profiles">${this._buildProfilesPane()}</div>
  <div class="h-pane" data-tab="settings">${this._buildSettings()}</div>
  <div class="h-pane" data-tab="format">${this._buildFormat()}</div>
  <div class="h-pane" data-tab="ai">${this._buildAI()}</div>
  <div class="h-pane" data-tab="setting-rules">${this._buildSettingRulesPane()}</div>
  <div class="h-pane" data-tab="export-import">${this._buildExportImportPane()}</div>
  ${refPanes}
  <div class="h-pane" data-tab="items">
    <div class="h-sub-tabs">${subTabBtns}</div>
    ${subPanes}
  </div>
</div>`;
  }

  _buildQuickStart() { return `
<h3>What This Module Does</h3>
<p>Imports SWADE stat blocks as Foundry actors. Accepts multiple formats: <strong>Pinnacle (PEG) standard</strong>, <strong>Savaged.us plain text</strong>, <strong>Savaged.us Markdown</strong>, and <strong>Savaged.us JSON export</strong>. Paste the stat block, click Analyze, then Import.</p>
<p>Also exports existing actors back to stat block text for sharing or AI editing.</p>

<h3>Accepted Stat Block Formats</h3>
<ul>
  <li><strong>Pinnacle (PEG):</strong> Official format from all SWADE publications and supplements.</li>
  <li><strong>Savaged.us Plain Text:</strong> Copy the "Statblock" section from savaged.us (with or without the Analyzer header).</li>
  <li><strong>Savaged.us Markdown:</strong> The Markdown export from savaged.us character builder.</li>
  <li><strong>Savaged.us JSON:</strong> The JSON export from savaged.us. Image URL is auto-detected and fills the image field.</li>
</ul>
<p style="font-size:11px;opacity:0.7;">Format is detected automatically. If Analyze shows warnings, check the <strong>📄 Format</strong> tab for format details.</p>

<h3>Import Flow</h3>
<ul>
  <li>1. Paste the stat block (any supported format) into the text area.</li>
  <li>2. Optionally add an image URL or drop an image file onto the image zone.</li>
  <li>3. Set Actor Type (NPC or Character) and Wild Card checkbox.</li>
  <li>4. Click <strong>🔍 Analyze</strong> — check the summary for issues and detected format.</li>
  <li>5. Click <strong>⬇ Import</strong> — actor is created in your world.</li>
</ul>

<h3>AI-Assisted Creation Workflow</h3>
<ul>
  <li>1. Configure your <strong>📐 Setting Rules</strong> tab.</li>
  <li>2. Set up reference lists in the Skills, Edges, Powers, etc. tabs.</li>
  <li>3. Click <strong>📋 Copy All for AI</strong> (top of this window) to get all instructions at once.</li>
  <li>4. Paste into your AI, describe the character, get a stat block back.</li>
  <li>5. Paste the result into the importer.</li>
</ul>

<h3>First-Time Setup</h3>
<ul>
  <li>Go to <strong>Game Settings → Module Settings → SWADE Stat Block Importer</strong>.</li>
  <li>Click <strong>Compendiums to Search</strong> and select packages with your SWADE items (e.g. <code>swade-core-rules</code>). Without this, edges/skills/powers import without descriptions or artwork.</li>
</ul>`; }

  _buildSettings() { return `
<h3>Compendiums to Search</h3>
<p>Which compendiums the importer searches when matching item names (edges, skills, powers, gear). Select packages to include all their Item compendiums, or pick individual compendiums. <em>If nothing is selected, all Item compendiums are searched.</em></p>
<h3>Default Token Settings</h3>
<p>Prototype token defaults applied to all imported actors. Override per-import in the dialog.</p>
<h3>Default Actor Type / Wild Card</h3>
<p>Whether new imports default to NPC or Character, and whether Wild Card is pre-checked.</p>
<h3>Special Ability bullet icon(s)</h3>
<p>Character(s) the parser looks for to split Special Abilities entries. Default is <code>•|■</code>. If your stat block uses different bullets, add them here.</p>
<h3>Use @ notation for Special Abilities</h3>
<p>Force item types with prefixes: <code>@w</code>=weapon, <code>@a</code>=armor, <code>@e</code>=edge, <code>@h</code>=hindrance, <code>@sa</code>=special ability.</p>
<h3>Import all Special Abilities as Ability items</h3>
<p>Skips automatic weapon/armor detection inside Special Abilities. Use when creature descriptions shouldn't be treated as weapons.</p>
<h3>Auto-calculate Toughness / Token Size / Ignored Wounds / Extra Wounds</h3>
<p>Various automation options — see the tooltips in the module settings for details.</p>
<h3>Additional stat labels</h3>
<p>Comma-separated list of extra stat block labels to detect. Must be followed by a colon in the stat block.</p>`; }

  _buildFormat() { return `
<h3>Supported Input Formats</h3>
<p>The importer auto-detects format. All formats are converted to Pinnacle internally before parsing.</p>

<h4>1. Pinnacle (PEG) Standard</h4>
<p>Official format from all SWADE publications.</p>
<pre>[WC] Wild Card Name
Optional flavor text.

Attributes: Agility d6, Smarts d8, Spirit d6, Strength d6, Vigor d8
Skills: Athletics d6, Fighting d8, Notice d6, Shooting d6, Stealth d4
Pace: 6; Parry: 6; Toughness: 7 (2)
Hindrances: Overconfident
Edges: Combat Reflexes, Level Headed
Powers: bolt, deflection. Power Points: 10
Gear: Knife (Str+d4), Pistol (Range 12/24/48, Damage 2d6, RoF 1, AP 1)
Special Abilities:
• Armor +2: Thick hide.
• Fearless: Immune to Fear and Intimidation.</pre>

<h4>2. Savaged.us Plain Text</h4>
<p>Paste the full page export from savaged.us — the importer strips the "SWADE Statblock Analyzer" header and the "Analysis" section automatically.</p>

<h4>3. Savaged.us Markdown</h4>
<p>The Markdown export from savaged.us. Bold labels (<code>**Attributes**:</code>) and headers (<code>## Section</code>) are normalized automatically.</p>

<h4>4. Savaged.us JSON</h4>
<p>Paste the raw JSON export from savaged.us. The image URL is auto-detected and fills the image field in the importer.</p>

<h3>Key Parsing Rules</h3>
<ul>
  <li>Wild Cards: prefix name with <code>[WC]</code>.</li>
  <li>Toughness with armor: <code>Toughness: 7 (2)</code> — total (armor portion).</li>
  <li>Special Abilities: one per bullet. Name followed by colon, then description.</li>
  <li>Separate Weapons/Gear items with <code>;</code> (semicolons).</li>
  <li>If Special Abilities shows 0 entries: check the bullet character in Settings.</li>
</ul>

<h3>Extended Format Sections (Savaged.us / Homebrew)</h3>
<pre>Weapons: Knife (Str+d4); Pistol (Range 12/24/48, Damage 2d6, RoF 1, AP 1)
Armor: Lined Coat (Armor 3)
Shield: Heater Shield (Parry +1, Cover +1)
Languages Known: Native (native, d8)
Cyberware
Datajack [0 Implant Points] (1 strain): Description.
Current Wealth: 500</pre>`; }

  _buildAI() { return `
<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
  <button type="button" id="sbi-copy-ai-btn" style="font-size:12px;padding:3px 10px;">📋 Copy AI Instructions</button>
  <button type="button" id="sbi-copy-sr-btn" style="font-size:12px;padding:3px 10px;" title="Copy only the active setting rules for AI">📐 Copy Setting Rules</button>
  <span style="font-size:10px;opacity:0.6;">(copies only the workflow text below, without the lists)</span>
</div>

<h3>How It Works</h3>
<p>This tool helps you use an external AI (ChatGPT, Claude, etc.) to generate SWADE characters and NPCs in the correct format for import. <strong>Important: the AI is a helper, not a replacement for the GM or player. Always review all results before using them in play.</strong></p>

<h3>Workflow</h3>
<ol style="padding-left:1.4em;line-height:1.8;">
  <li><strong>Define Setting Rules</strong> — go to the <span class="tag">📐 Setting Rules</span> tab. Select the default SWADE AE rules or create a custom rule set for your campaign (modern, sci-fi, fantasy variant, etc.). Configure Core rules (Born a Hero, Multiple Languages, No Power Points, etc.), Setting-Specific (Frameworks, Factions), Optional rules (Encumbrance, Minimum Strength, Wealth), and Character Creation Parameters (Attribute/Skill points, Extra Perks, Starting Wealth, Rank Names). Only one setting is active at a time.</li>
  <li><strong>Configure Reference Lists</strong> — use the <span class="tag">🎛️ Library Sources</span> tab to choose which sources feed each category (Default / Compendium / Named Lists) and save them as reusable <em>usage profiles</em>. Then use the <span class="tag">📘 Skills</span>, <span class="tag">✦ Edges</span>, <span class="tag">✦ Powers</span>, <span class="tag">✦ Abilities</span>, <span class="tag">⚠ Hindrances</span>, <span class="tag">🧝 Races</span>, and <span class="tag">📦 Items</span> tabs to edit the lists themselves. In each tab you can click <strong>📋 Copy for AI</strong> to copy just that list with a preface the AI will understand.</li>
  <li><strong>Mark unused tabs as Ignored</strong> — if your setting has no Powers (e.g., a gritty realistic game), click <strong>✓ Include in Copy All for AI</strong> in the Powers tab to toggle it to "excluded." Skills are always included and cannot be excluded.</li>
  <li><strong>Copy everything for AI</strong> — click <strong>📋 Copy All for AI</strong> at the top of this window. This assembles: Setting Rules + Stat Block Format + all non-ignored reference lists into a single clipboard paste.</li>
  <li><strong>Create your character/NPC with AI</strong> — paste the copied instructions into your AI, describe the character you want, and ask for a SWADE stat block in the Pinnacle format.</li>
  <li><strong>Import the result</strong> — paste the AI's stat block into the Importer, click Analyze, then Import.</li>
</ol>

<h3>Player Character Creation (Novice)</h3>
<p><em>Check the <span class="tag">📐 Setting Rules</span> tab for your campaign's specific values. These are the SWADE AE defaults:</em></p>
<ul style="line-height:1.8;">
  <li><strong>Attribute Points:</strong> 5. Raise one die type per point (all start at d4, max d12).</li>
  <li><strong>Skill Points:</strong> 12. Raise one die type per point if at or below the linked attribute; 2 points per step if above.</li>
  <li><strong>Core Skills:</strong> Athletics, Common Knowledge, Notice, Persuasion, Stealth — all start at d4 for free (do not spend points to reach d4).</li>
  <li><strong>Hindrances:</strong> Up to 1 Major (2 pts) + 2 Minor (1 pt each). Spend points on: Attribute point (2), Edge (2), Skill point (1), or +100% starting funds (1).</li>
  <li><strong>Starting Edges:</strong> Determined by Hindrance points only; no free Edges at Novice (unlike Extras). Must meet all requirements.</li>
  <li><strong>Starting funds:</strong> $500 (default). Adjust per setting.</li>
  <li><strong>Rank:</strong> Novice (0 advances). Characters advance every 4 XP.</li>
</ul>

<h3>NPC Creation</h3>
<p>NPCs do not follow strict creation rules — design them to fit the encounter.</p>
<ul style="line-height:1.8;">
  <li><strong>Extras (rank-and-file):</strong> d4-d6 in most traits, 2-4 skills, 0-1 Edges. 1 Wound before Incapacitated. Do NOT use [WC] prefix.</li>
  <li><strong>Wild Cards (bosses/named NPCs):</strong> Use [WC] prefix. Appropriate stats for their role and rank. 1-3 Edges, may have Hindrances for flavor. 3 Wounds before Incapacitated.</li>
</ul>

<h3>Rank Scale Reference</h3>
<ul style="line-height:1.6;">
  <li><strong>Novice (0-3 adv):</strong> Attributes mostly d4-d6, primary skill d6-d8.</li>
  <li><strong>Seasoned (4-7 adv):</strong> Competent, 1-2 combat Edges. Primary attribute d8.</li>
  <li><strong>Veteran (8-11 adv):</strong> Dangerous. Primary attribute d10, specialized Edges.</li>
  <li><strong>Heroic (12-15 adv):</strong> Elite. d10-d12 in main stats, multiple Edges.</li>
  <li><strong>Legendary (16+ adv):</strong> Boss-tier. d12 primary stats, unique or iconic abilities.</li>
</ul>

<h3>Quick Math</h3>
<ul style="line-height:1.6;">
  <li><strong>Parry</strong> = 2 + half Fighting die: d4=2, d6=3, d8=4, d10=5, d12=6. +1 per Block Edge.</li>
  <li><strong>Toughness</strong> = 2 + half Vigor die + Armor bonus. +1 for Brawny Edge.</li>
</ul>

<h3>Example Prompts</h3>
<pre style="font-size:11px;">Create a Seasoned Wild Card NPC: a scarred mercenary enforcer, prefers shotgun and knife, 
intimidating and brutal. Use the Pinnacle SWADE stat block format with bullet points (•) 
for Special Abilities.</pre>
<pre style="font-size:11px;">Create a Novice Extra: street gang member, pistol, not very skilled. Not a Wild Card.
Keep attributes at d4-d6.</pre>
<pre style="font-size:11px;">Create a Novice Player Character: a former soldier turned investigator, balanced combat and 
social skills, takes Cautious and Loyal as Minor Hindrances. Spend Hindrance points on 
Combat Reflexes Edge.</pre>
<pre style="font-size:11px;">Create a Veteran creature: large undead bear, Size 4, mindless, aggressive. Include Undead, 
Fear, natural claw attack, Hardy. No Edges or Hindrances.</pre>

<h3>Adding Homebrew to Reference Lists</h3>
<p>Go to the relevant tab (e.g., Edges), select or create a Named List, and paste new entries under the <code>## HOMEBREW ADDITIONS</code> section. Or ask the AI to format a new entry, then paste it in and click 💾 Save.</p>`; }

  _buildRefHowTo(key) {
    const examples = {
      skills:    `Skill Name | Linked Attribute | Notes`,
      edges:     `Edge Name | Req: Rank, Attribute dX+ | Brief mechanical effect`,
      powers:    `Power Name | Rank | PP: X | Range: Y | Dur: Z | Brief description`,
      abilities: `Ability Name | Mechanical effect (damage dice, conditions, Vigor/Spirit rolls)`,
      hindrances:`Hindrance Name | Type: Major or Minor | Description and mechanical effect`,
      races:     `Race Name\nAbility Name: Description and mechanical effect.`,
    };
    const tips = {
      skills:    `List the linked attribute so the AI assigns it correctly. Mark core skills with (*).`,
      edges:     `Group under <code>## Section Name</code> headers. Always include Requirements.`,
      powers:    `Include Rank, PP cost, Range, and Duration — the AI uses these to assess resource cost.`,
      abilities: `Keep descriptions short but complete. Include damage dice, conditions, and any saves required.`,
      hindrances:`Include the severity (Minor/Major) and the exact mechanical penalty so the AI applies it correctly.`,
      races:     `List each racial ability on its own line. Include both positive and negative traits.`,
    };
    return `<h3>Format &amp; Tips</h3>
<p>Entries follow this format (one per line):</p>
<pre>${examples[key] ?? ''}</pre>
<p>${tips[key] ?? ''}</p>
<p>Lines starting with <code>#</code> are comments — ignored by AI parsers.</p>`;
  }

  // ── Render pipeline ─────────────────────────────────────────────────
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
    this.element.querySelectorAll('.h-tab').forEach(btn =>
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab)));
    this.element.querySelectorAll('.h-sub-tab').forEach(btn =>
      btn.addEventListener('click', () => this._switchItemSub(btn.dataset.subtab)));
    this._setupAITab();
    this._setupProfilesPane();
    this._setupExportImportPane();
    this._setupSettingRulesPane();
    for (const key of MAIN_REF_CATS) this._setupRefPane(key);
    for (const sub of ITEM_SUBTYPES)  this._setupRefPane(sub);
    this._switchTab(this._activeTab);
    this._sizeObserver();
  }

  // ── Confirmation helper ──────────────────────────────────────────────
  async _confirm(title, html) {
    const res = await foundry.applications.api.DialogV2.wait({
      window: { title },
      content: `<div style="padding:10px;font-size:12px;line-height:1.5;">${html}</div>`,
      buttons: [
        { label: 'Confirm', action: 'ok', icon: 'fas fa-check', default: true },
        { label: 'Cancel',  action: 'cancel', icon: 'fas fa-times' },
      ], rejectClose: false,
    });
    return res === 'ok';
  }

  // ── Export / Import pane ─────────────────────────────────────────────
  _setupExportImportPane() {
    this.element.querySelector('#ei-export-btn')?.addEventListener('click', () => openExport());
    this.element.querySelector('#ei-import-btn')?.addEventListener('click', () => openImport());
    this.element.querySelector('#ei-comps-btn')?.addEventListener('click',  () => new SelectCompendiums().render({ force: true }));
  }

  // ── Library Sources (Usage Profiles) pane ────────────────────────────
  _setupProfilesPane() {
    const el = this.element;
    el.querySelector('#up-save-btn')?.addEventListener('click', () => this._upSave());
    el.querySelector('#up-apply-btn')?.addEventListener('click', () => this._upApply());
    el.querySelector('#up-rename-btn')?.addEventListener('click', () => this._upRename());
    el.querySelector('#up-delete-btn')?.addEventListener('click', () => this._upDelete());
    el.querySelector('#up-comps-btn')?.addEventListener('click', () => new SelectCompendiums().render({ force: true }));
    el.querySelector('#up-open-comps')?.addEventListener('click', () => new SelectCompendiums().render({ force: true }));
    this._rebuildUPPicker();
  }

  _rebuildUPPicker() {
    const picker = this.element.querySelector('#sbi-up-picker');
    if (!picker) return;
    const profiles = getProfiles();
    const activeId = profiles.active;
    const btns = profiles.items.map(p =>
      `<button class="src-btn${p.id === activeId ? ' active' : ''}" data-upid="${p.id}">${escHtml(p.name)}</button>`);
    btns.push(`<button class="src-btn src-new" data-upid="__new__">➕ New Profile</button>`);
    picker.innerHTML = btns.join('');
    picker.querySelectorAll('.src-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (btn.dataset.upid === '__new__') { await this._upCreate(); return; }
        if (btn.dataset.upid === activeId) { this._loadUPFields(); return; }
        await this._upLoadProfile(btn.dataset.upid);
      }));
    this._loadUPFields();
  }

  _loadUPFields() {
    const el = this.element;
    const profile = getActiveProfile();
    if (!profile) return;
    const nameEl = el.querySelector('#up-name');
    const descEl = el.querySelector('#up-desc');
    if (nameEl) nameEl.value = profile.name ?? '';
    if (descEl) descEl.value = profile.description ?? '';

    // Linked rule set select
    const sel = el.querySelector('#up-rule-set');
    if (sel) {
      const sr = getSettingRules();
      const opts = [`<option value="">— none —</option>`,
        `<option value="default">📚 Default SWADE AE</option>`,
        ...(sr.namedSets ?? []).map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`)];
      sel.innerHTML = opts.join('');
      sel.value = profile.settingRuleSetId ?? '';
      sel.onchange = async () => {
        await saveProfile(profile.id, { settingRuleSetId: sel.value || null });
        uiInfo('Profile link saved.');
      };
    }

    // Table rows
    const tbody = el.querySelector('#up-tbody');
    if (!tbody) return;
    const prefs = profile.prefs ?? {};
    const row = (cat, subtype, p) => {
      const label = subtype ? `Items › ${ITEM_SUBTYPE_LABEL[subtype]}` : (CAT_LABEL_PLAIN[cat] ?? cat);
      const hasComp = !!getCompendiumContent(cat, subtype);
      const lists = getNamedListsFor(cat, subtype);
      const hasDefault = hasDefaultContent(cat);
      return `<tr data-cat="${cat}" data-sub="${subtype ?? ''}">
        <td class="up-cat">${label}</td>
        <td>${hasDefault ? `<label><input type="checkbox" class="up-check" data-src="default" ${p.useDefault ? 'checked' : ''}> Default</label>` : '<span style="opacity:.3">—</span>'}</td>
        <td>${hasComp ? `<label><input type="checkbox" class="up-check" data-src="compendium" ${p.useCompendium ? 'checked' : ''}> Compendium</label>` : '<span style="opacity:.3">—</span>'}</td>
        <td>${lists.map(l => `<label><input type="checkbox" class="up-check" data-src="list" data-list-id="${l.id}" ${(p.listIds ?? []).includes(l.id) ? 'checked' : ''}> ${escHtml(l.name)}</label>`).join(' ') || '<span style="opacity:.3">—</span>'}</td>
      </tr>`;
    };
    let rows = MAIN_REF_CATS.map(cat => row(cat, null, prefs[cat] ?? {})).join('');
    rows += ITEM_SUBTYPES.map(sub => row('items', sub, prefs.items?.[sub] ?? {})).join('');
    tbody.innerHTML = rows;
  }

  _upCollectPrefs() {
    const prefs = {};
    for (const cat of MAIN_REF_CATS) prefs[cat] = { useDefault: false, useCompendium: false, listIds: [] };
    prefs.items = {};
    for (const sub of ITEM_SUBTYPES) prefs.items[sub] = { useCompendium: false, listIds: [] };
    this.element.querySelectorAll('#up-tbody tr[data-cat]').forEach(row => {
      const cat = row.dataset.cat;
      const sub = row.dataset.sub || null;
      const target = sub ? prefs.items[sub] : prefs[cat];
      if (!target) return;
      row.querySelectorAll('.up-check').forEach(cb => {
        if (!cb.checked) return;
        if (cb.dataset.src === 'default')    target.useDefault = true;
        if (cb.dataset.src === 'compendium') target.useCompendium = true;
        if (cb.dataset.src === 'list')       target.listIds.push(cb.dataset.listId);
      });
    });
    return prefs;
  }

  async _upSave() {
    const profile = getActiveProfile();
    if (!profile) return;
    await saveProfile(profile.id, {
      name: this.element.querySelector('#up-name')?.value?.trim() || profile.name,
      description: this.element.querySelector('#up-desc')?.value ?? '',
      prefs: this._upCollectPrefs(),
      settingRuleSetId: this.element.querySelector('#up-rule-set')?.value || null,
    });
    this._rebuildUPPicker();
    uiInfo('Profile saved.');
  }

  async _upCreate() {
    const name = await this._promptText('New Usage Profile', 'Profile name (e.g. "Fantasy Campaign", "Sci-Fi"):', 'My Profile');
    if (!name) return;
    await createProfile(name);
    this._rebuildUPPicker();
    uiInfo('Profile created.');
  }

  async _upLoadProfile(id) {
    const profile = getProfiles().items.find(p => p.id === id);
    if (!profile) return;
    const ok = await this._confirm('Load Usage Profile', `
      Load <strong>${escHtml(profile.name)}</strong>?<br><br>
      This replaces the current <strong>library source selection</strong> (Default/Compendium/Named Lists per category).
      ${profile.settingRuleSetId ? '<br><br>This profile is linked to a Setting Rule Set — you will be asked to switch it.' : ''}`);
    if (!ok) return;

    await applyProfilePrefs(id);

    if (profile.settingRuleSetId) {
      const sr = getSettingRules();
      const set = profile.settingRuleSetId === 'default'
        ? { name: 'Default SWADE AE' }
        : (sr.namedSets ?? []).find(s => s.id === profile.settingRuleSetId);
      if (set) {
        const applyRules = await this._confirm('Switch Setting Rules?', `Also switch the active Setting Rules to <strong>${escHtml(set.name)}</strong>?`);
        if (applyRules) await setActiveSettingRuleSet(profile.settingRuleSetId);
      }
    }

    this._rebuildUPPicker();
    this._rebuildSRPicker();
    uiInfo('Profile loaded.');
  }

  async _upApply() {
    const profile = getActiveProfile();
    if (!profile) return;
    const ok = await this._confirm('Apply Profile', `Apply <strong>${escHtml(profile.name)}</strong> now? This sets the active library sources${profile.settingRuleSetId ? ' and switches the linked Setting Rule Set' : ''}.`);
    if (!ok) return;
    await applyProfile(profile.id);
    this._rebuildUPPicker();
    this._rebuildSRPicker();
    uiInfo('Profile applied.');
  }

  async _upRename() {
    const profile = getActiveProfile();
    if (!profile) return;
    const newName = await this._promptText('Rename Profile', 'New name:', profile.name);
    if (!newName || newName === profile.name) return;
    await renameProfile(profile.id, newName);
    this._rebuildUPPicker();
  }

  async _upDelete() {
    const profile = getActiveProfile();
    if (!profile) return;
    if (getProfiles().items.length <= 1) { uiError('You must keep at least one usage profile.'); return; }
    const ok = await this._confirm('Delete Profile', `Delete <strong>${escHtml(profile.name)}</strong>? This cannot be undone.`);
    if (!ok) return;
    await deleteProfile(profile.id);
    this._rebuildUPPicker();
    uiInfo('Profile deleted.');
  }

  // Small text-prompt helper
  async _promptText(title, label, value = '') {
    const res = await foundry.applications.api.DialogV2.wait({
      window: { title },
      content: `<div style="padding:8px"><label>${label}<br>
        <input type="text" id="sbi-prompt-text" value="${escHtml(value)}" style="width:100%;margin-top:4px"></label></div>`,
      buttons: [
        { label: 'OK', action: 'ok', icon: 'fas fa-check',
          callback: (ev, btn, dlg) => dlg.element.querySelector('#sbi-prompt-text')?.value?.trim() || null },
        { label: 'Cancel', action: 'cancel', icon: 'fas fa-times' },
      ], rejectClose: false,
    });
    return res && res !== 'cancel' ? res : null;
  }

  // ── Setting Rules pane ───────────────────────────────────────────────
  _setupSettingRulesPane() {
    this._rebuildSRPicker();
    // Wire management buttons
    this.element.querySelector('#sr-save-btn')?.addEventListener('click', () => this._srSave());
    this.element.querySelector('#sr-rename-btn')?.addEventListener('click', () => this._srRename());
    this.element.querySelector('#sr-delete-btn')?.addEventListener('click', () => this._srDelete());
  }

  _rebuildSRPicker() {
    const picker = this.element.querySelector('#sbi-sr-picker');
    if (!picker) return;
    const sr   = getSettingRules();
    const sets = sr.namedSets ?? [];
    const btns = [];
    btns.push(`<button class="src-btn${(sr.active ?? 'default') === 'default' ? ' active' : ''}" data-srid="default">📚 Default SWADE AE</button>`);
    for (const s of sets)
      btns.push(`<button class="src-btn${sr.active === s.id ? ' active' : ''}" data-srid="${s.id}">${escHtml(s.name)}</button>`);
    btns.push(`<button class="src-btn src-new" data-srid="__new__">➕ New Set</button>`);
    picker.innerHTML = btns.join('');
    picker.querySelectorAll('.src-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (btn.dataset.srid === '__new__') { await this._srCreate(); return; }
        const id = btn.dataset.srid;
        await setActiveSettingRuleSet(id);
        this._rebuildSRPicker();
        this._loadSRFields();
        // Offer to apply a linked usage profile
        const srNow = getSettingRules();
        const set = id === 'default' ? null : (srNow.namedSets ?? []).find(s => s.id === id);
        if (set?.libraryProfileId) {
          const profile = getProfiles().items.find(p => p.id === set.libraryProfileId);
          if (profile) {
            const ok = await this._confirm('Apply Linked Library Sources?',
              `Rule set <strong>${escHtml(set.name)}</strong> is linked to usage profile <strong>${escHtml(profile.name)}</strong>.<br><br>Apply its library sources now?`);
            if (ok) {
              await applyProfilePrefs(profile.id);
              this._rebuildUPPicker();
              uiInfo('Library sources applied from linked profile.');
            }
          }
        }
      }));
    this._loadSRFields();
  }

  _loadSRFields() {
    const active  = getActiveSettingRuleSet();
    const isDefault = active.id === 'default';
    const el = k => this.element.querySelector(k);

    // Boolean rules (checkboxes)
    for (const rule of SETTING_RULE_CATALOG.filter(r => r.type === 'boolean')) {
      const inp = el(`#sr-${rule.key}`);
      if (inp) { inp.checked = !!active[rule.key]; inp.disabled = isDefault; }
    }
    // Numeric/text params
    for (const rule of SETTING_RULE_CATALOG.filter(r => r.type !== 'boolean')) {
      const inp = el(`#sr-${rule.key}`);
      if (inp) { inp.value = active[rule.key] ?? ''; inp.readOnly = isDefault; }
    }
    // Legacy fields
    const coreSkills = el('#sr-core-skills');
    const notes = el('#sr-notes');
    if (coreSkills) { coreSkills.value = active.coreSkills ?? ''; coreSkills.readOnly = isDefault; }
    if (notes) { notes.value = active.notes ?? ''; notes.readOnly = isDefault; }

    const roNotice = el('#sbi-sr-ro-notice');
    if (roNotice) roNotice.style.display = isDefault ? 'block' : 'none';
    const mgmt = el('#sbi-sr-mgmt');
    if (mgmt) mgmt.style.display = isDefault ? 'none' : 'flex';

    // Linked usage profile
    const linkedSel = el('#sr-linked-profile');
    if (linkedSel) {
      const profiles = getProfiles();
      linkedSel.innerHTML = ['<option value="">— none —</option>',
        ...profiles.items.map(p => `<option value="${p.id}">${escHtml(p.name)}</option>`)].join('');
      linkedSel.value = active.libraryProfileId ?? '';
      linkedSel.disabled = isDefault;
      linkedSel.onchange = async () => {
        await saveSettingRuleSet(active.id, { libraryProfileId: linkedSel.value || null });
        uiInfo('Rule set link saved.');
      };
    }

    // Wire help toggles
    this.element.querySelectorAll('.sr-help-btn').forEach(btn => {
      btn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const helpEl = this.element.querySelector(`#${btn.dataset.help}`);
        if (helpEl) helpEl.style.display = helpEl.style.display === 'none' ? 'block' : 'none';
      };
    });
  }

  async _srCreate() {
    const name = await foundry.applications.api.DialogV2.wait({
      window: { title: 'New Rule Set' },
      content: `<div style="padding:8px"><label>Rule set name (e.g. "Modern Horror", "Fantasy Variant"):<br>
        <input type="text" id="dlg-srn" placeholder="My Setting" style="width:100%;margin-top:4px"></label></div>`,
      buttons: [
        { label: 'Create', action: 'ok', icon: 'fas fa-plus',
          callback: (ev, btn, dlg) => dlg.element.querySelector('#dlg-srn')?.value?.trim() || 'New Setting' },
        { label: 'Cancel', action: 'cancel', icon: 'fas fa-times' },
      ], rejectClose: false,
    });
    if (!name || name === 'cancel') return;
    await createSettingRuleSet(name);
    this._rebuildSRPicker();
    this._loadSRFields();
  }

  async _srSave() {
    const active = getActiveSettingRuleSet();
    if (active.id === 'default') return;
    const el = k => this.element.querySelector(k);
    const data = {};

    // Boolean rules
    for (const rule of SETTING_RULE_CATALOG.filter(r => r.type === 'boolean')) {
      data[rule.key] = !!el(`#sr-${rule.key}`)?.checked;
    }
    // Numeric/text params
    for (const rule of SETTING_RULE_CATALOG.filter(r => r.type !== 'boolean')) {
      const inp = el(`#sr-${rule.key}`);
      if (!inp) continue;
      if (rule.type === 'number') {
        const n = parseInt(inp.value, 10);
        data[rule.key] = Number.isNaN(n) ? (rule.min ?? 0) : n;
      } else {
        data[rule.key] = inp.value ?? '';
      }
    }
    // Legacy fields
    data.coreSkills = el('#sr-core-skills')?.value ?? '';
    data.notes = el('#sr-notes')?.value ?? '';

    await saveSettingRuleSet(active.id, data);
    uiInfo('Rule set saved.');
  }

  async _srRename() {
    const active = getActiveSettingRuleSet();
    if (active.id === 'default') return;
    const newName = await foundry.applications.api.DialogV2.wait({
      window: { title: 'Rename Rule Set' },
      content: `<div style="padding:8px"><label>New name:<br>
        <input type="text" id="dlg-srrn" value="${escHtml(active.name)}" style="width:100%;margin-top:4px"></label></div>`,
      buttons: [
        { label: 'Rename', action: 'ok', icon: 'fas fa-check',
          callback: (ev, btn, dlg) => dlg.element.querySelector('#dlg-srrn')?.value?.trim() || null },
        { label: 'Cancel', action: 'cancel', icon: 'fas fa-times' },
      ], rejectClose: false,
    });
    if (!newName || newName === 'cancel') return;
    await renameSettingRuleSet(active.id, newName);
    this._rebuildSRPicker();
  }

  async _srDelete() {
    const active = getActiveSettingRuleSet();
    if (active.id === 'default') return;
    const ok = await foundry.applications.api.DialogV2.wait({
      window: { title: 'Delete Rule Set' },
      content: `<p style="padding:8px">Delete "<strong>${escHtml(active.name)}</strong>"? This cannot be undone.</p>`,
      buttons: [
        { label: 'Delete', action: 'ok', icon: 'fas fa-trash' },
        { label: 'Cancel', action: 'cancel', icon: 'fas fa-times' },
      ], rejectClose: false,
    });
    if (ok !== 'ok') return;
    await deleteSettingRuleSet(active.id);
    this._rebuildSRPicker();
    uiInfo('Rule set deleted.');
  }

  _getActiveSettingRulesText() {
    const active = getActiveSettingRuleSet();
    const lines = ['=== CAMPAIGN SETTING RULES ==='];
    lines.push(`Setting: ${active.name}`);

    // Core rules
    const coreRules = SETTING_RULE_CATALOG.filter(r => r.group === 'core' && r.type === 'boolean');
    const enabledCore = coreRules.filter(r => active[r.key]);
    if (enabledCore.length) {
      lines.push('\n--- Core Setting Rules ---');
      for (const r of enabledCore) lines.push(`✓ ${r.label}: ${r.help}`);
    }

    // Setting-specific rules
    const settingRules = SETTING_RULE_CATALOG.filter(r => r.group === 'setting' && r.type === 'boolean');
    const enabledSetting = settingRules.filter(r => active[r.key]);
    if (enabledSetting.length) {
      lines.push('\n--- Setting-Specific Rules ---');
      for (const r of enabledSetting) lines.push(`✓ ${r.label}: ${r.help}`);
    }

    // Optional rules
    const optionalRules = SETTING_RULE_CATALOG.filter(r => r.group === 'optional' && r.type === 'boolean');
    const enabledOptional = optionalRules.filter(r => active[r.key]);
    if (enabledOptional.length) {
      lines.push('\n--- Optional Rules ---');
      for (const r of enabledOptional) lines.push(`✓ ${r.label}: ${r.help}`);
    }

    // Parameters
    const params = SETTING_RULE_CATALOG.filter(r => r.group === 'params');
    if (params.length) {
      lines.push('\n--- Character Creation Parameters ---');
      for (const r of params) {
        const val = active[r.key];
        if (val !== '' && val !== undefined && val !== null) lines.push(`${r.label}: ${val}`);
      }
    }

    // Legacy fields
    if (active.coreSkills?.trim()) {
      lines.push(`\nCore Skills (start at d4 free):\n${active.coreSkills.trim()}`);
    }
    if (active.notes?.trim()) {
      lines.push(`\nExtra Instructions / Homebrew:\n${active.notes.trim()}`);
    }
    if (!enabledCore.length && !enabledSetting.length && !enabledOptional.length) {
      lines.push('\nNo optional setting rules are enabled — use standard SWADE Adventure Edition rules.');
    }
    return lines.join('\n');
  }

  // ── Source picker ───────────────────────────────────────────────────
  _setupRefPane(paneKey) {
    const { category, subtype } = keyToCatSub(paneKey);
    this._rebuildSourcePicker(paneKey, category, subtype);
    const pane = this._getPaneEl(paneKey);
    if (!pane) return;
    // Wire ALL action buttons via a single delegation layer (avoids duplicate listeners)
    pane.querySelectorAll(`.src-action[data-key="${paneKey}"]`).forEach(btn => {
      btn.addEventListener('click', () =>
        this._handleAction(btn.dataset.action, paneKey, category, subtype));
    });
    // Update ignore UI state (no additional listener — _handleAction handles toggle-ignore)
    if (!ALWAYS_INCLUDED.has(paneKey)) this._updateIgnoreUI(paneKey);
    const init = this._activeSource[paneKey] ?? (subtype ? 'compendium' : 'default');
    this._selectSource(paneKey, category, subtype, init);
  }

  _getPaneEl(paneKey) {
    if (MAIN_REF_CATS.includes(paneKey))
      return this.element.querySelector(`.h-pane[data-tab="${paneKey}"]`);
    return this.element.querySelector(`.h-sub-pane[data-subtab="${paneKey}"]`);
  }

  _rebuildSourcePicker(paneKey, category, subtype) {
    const picker = this.element.querySelector(`#sbi-sp-${paneKey}`);
    if (!picker) return;
    const active = this._activeSource[paneKey] ?? (subtype ? 'compendium' : 'default');
    const lists  = getNamedListsFor(category, subtype);
    const comp   = getCompendiumContent(category, subtype);
    const btns   = [];
    if (hasDefaultContent(category))
      btns.push(`<button class="src-btn${active==='default'?' active':''}" data-sid="default">📚 Default</button>`);
    btns.push(`<button class="src-btn${active==='compendium'?' active':''}" data-sid="compendium">📦 Compendium${comp?'':' (empty)'}</button>`);
    for (const l of lists)
      btns.push(`<button class="src-btn${active===l.id?' active':''}" data-sid="${l.id}">${escHtml(l.name)}</button>`);
    btns.push(`<button class="src-btn src-new" data-sid="__new__">➕ New List</button>`);
    picker.innerHTML = btns.join('');
    picker.querySelectorAll('.src-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        if (btn.dataset.sid === '__new__') { this._newList(paneKey, category, subtype); return; }
        this._selectSource(paneKey, category, subtype, btn.dataset.sid);
      }));
  }

  _selectSource(paneKey, category, subtype, sourceId) {
    this._activeSource[paneKey] = sourceId;
    const pane = this._getPaneEl(paneKey);
    if (!pane) return;
    pane.querySelectorAll('.src-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.sid === sourceId));
    let content = '';
    let editable = false;
    if      (sourceId === 'default')    { content = getDefaultContent(category, subtype); }
    else if (sourceId === 'compendium') { content = getCompendiumContent(category, subtype); }
    else    { content = getNamedListById(sourceId)?.content ?? ''; editable = true; }
    const ta = pane.querySelector(`#sbi-ta-${paneKey}`);
    if (ta) { ta.value = content; ta.readOnly = !editable; }
    const ro = pane.querySelector(`#sbi-ro-${paneKey}`);
    if (ro) ro.style.display = editable ? 'none' : 'block';
    const lm = pane.querySelector(`#sbi-lm-${paneKey}`);
    if (lm) lm.style.display = editable ? 'flex' : 'none';
    const addBtn = pane.querySelector(`[data-action="add-entry"][data-key="${paneKey}"]`);
    if (addBtn) addBtn.disabled = !editable;
  }

  // ── Ignore toggle ────────────────────────────────────────────────────
  _handleIgnoreToggle(paneKey) {
    if (ALWAYS_INCLUDED.has(paneKey)) return;
    if (this._ignoredCats.has(paneKey)) this._ignoredCats.delete(paneKey);
    else this._ignoredCats.add(paneKey);
    this._updateIgnoreUI(paneKey);
  }

  _updateIgnoreUI(paneKey) {
    const ignored = this._ignoredCats.has(paneKey);
    const btn  = this.element.querySelector(`[data-action="toggle-ignore"][data-key="${paneKey}"]`);
    const warn = this.element.querySelector(`#sbi-ignore-warn-${paneKey}`);
    if (btn) {
      btn.textContent = ignored ? '✗ Excluded from Copy All for AI' : '✓ Include in Copy All for AI';
      btn.style.color = ignored ? 'var(--warning)' : '';
    }
    if (warn) warn.style.display = ignored ? 'inline' : 'none';
  }

  // ── Master copy ──────────────────────────────────────────────────────
  async _doCopyAll() {
    const parts = [];
    // 1. Setting Rules
    parts.push(this._getActiveSettingRulesText());
    // 2. Format instructions (static plain text)
    parts.push(FORMAT_INSTRUCTIONS_TEXT);
    // 3. Skills — always included
    const skillsText = buildMasterList('skills');
    if (skillsText) parts.push(CLIPBOARD_PREFACES.skills + skillsText);
    // 4. Other ref cats — skip if ignored
    for (const cat of ['edges','powers','abilities','hindrances','races']) {
      if (!this._ignoredCats.has(cat)) {
        const text = buildMasterList(cat);
        if (text) parts.push(CLIPBOARD_PREFACES[cat] + text);
      }
    }
    const separator = '\n\n' + '='.repeat(60) + '\n\n';
    const full = parts.join(separator);
    try {
      await navigator.clipboard.writeText(full);
      uiInfo('All AI instructions copied to clipboard!');
    } catch {
      uiError('Clipboard write failed — use individual Copy buttons instead.');
    }
  }

  // ── AI tab setup ─────────────────────────────────────────────────────
  _setupAITab() {
    // Per-tab "Copy AI Instructions" (workflow text only)
    this.element.querySelector('#sbi-copy-ai-btn')?.addEventListener('click', async () => {
      const pane = this.element.querySelector('.h-pane[data-tab="ai"]');
      if (!pane) return;
      const clone = pane.cloneNode(true);
      clone.querySelector('#sbi-copy-ai-btn')?.closest('div')?.remove();
      clone.querySelector('#sbi-copy-sr-btn')?.closest('div')?.remove();
      const text = (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
      try { await navigator.clipboard.writeText(text); uiInfo('AI instructions copied!'); }
      catch { uiError('Copy failed — select all and copy manually.'); }
    });
    // Copy Setting Rules only
    this.element.querySelector('#sbi-copy-sr-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this._getActiveSettingRulesText());
        uiInfo('Setting Rules copied for AI!');
      } catch { uiError('Copy failed — select all and copy manually.'); }
    });
    // Master copy button (always visible in h-master-bar)
    this.element.querySelector('#sbi-copy-all-btn')?.addEventListener('click', () => this._doCopyAll());
  }

  // ── Action handler ──────────────────────────────────────────────────
  async _handleAction(action, paneKey, category, subtype) {
    const sourceId = this._activeSource[paneKey];

    if (action === 'toggle-ignore') {
      this._handleIgnoreToggle(paneKey);
      return;
    }

    if (action === 'copy-master') {
      const text = buildMasterList(category, subtype);
      if (!text) { uiInfo('Master list is empty — configure Library to Use to add sources.'); return; }
      const preface = CLIPBOARD_PREFACES[category] ?? '';
      try { await navigator.clipboard.writeText(preface + text); uiInfo(`${category.charAt(0).toUpperCase() + category.slice(1)} list copied for AI!`); }
      catch { uiError('Clipboard write failed — copy manually (Ctrl+A, Ctrl+C in textarea).'); }

    } else if (action === 'add-entry') {
      if (!sourceId || sourceId === 'default' || sourceId === 'compendium') return;
      const list = getNamedListById(sourceId);
      if (!list) return;
      new EntryEditorApp(category, subtype, list.name, async (line) => {
        const ta = this._getPaneEl(paneKey)?.querySelector(`#sbi-ta-${paneKey}`);
        if (ta) ta.value = ta.value ? ta.value + '\n' + line : line;
      }).render({ force: true });

    } else if (action === 'from-comps') {
      if (this._fromCompsInProgress) return;
      this._fromCompsInProgress = true;
      const fromBtn = this.element.querySelector(`[data-action="from-comps"][data-key="${paneKey}"]`);
      if (fromBtn) { fromBtn.disabled = true; fromBtn.textContent = '⏳...'; }
      const restoreBtn = () => { this._fromCompsInProgress = false; if (fromBtn) { fromBtn.disabled = false; fromBtn.textContent = '🔄 From Comps'; } };
      try {
        const text = await loadFromCompendiums(category, subtype);
        if (!text) { uiInfo('No items found in configured compendiums for this type.'); restoreBtn(); return; }
        const choice = await foundry.applications.api.DialogV2.wait({
          window: { title: 'From Compendiums — Save As?' },
          content: `<p style="padding:8px;font-size:13px">Items loaded from compendiums.<br><br>
            <strong>Compendium Slot</strong> — overwrites the read-only Compendium source.<br>
            <strong>New Named List</strong> — saves as a new editable named list.</p>`,
          buttons: [
            { label: 'Compendium Slot', action: 'comp', icon: 'fas fa-database' },
            { label: 'New Named List',  action: 'list', icon: 'fas fa-list' },
            { label: 'Cancel',          action: 'cancel', icon: 'fas fa-times' },
          ], rejectClose: false,
        });
        if (choice === 'comp') {
          await saveCompendiumContent(category, subtype, text);
          this._rebuildSourcePicker(paneKey, category, subtype);
          if (sourceId === 'compendium')
            this._selectSource(paneKey, category, subtype, 'compendium');
          uiInfo('Compendium slot updated.');
        } else if (choice === 'list') {
          await this._newList(paneKey, category, subtype, text);
        }
      } catch(e) { console.error('[SBI] from-comps', e); uiError('Failed to load from compendiums.'); }
      finally { restoreBtn(); }

    } else if (action === 'do-export') {
      openExport(category);

    } else if (action === 'do-import') {
      openImport();

    } else if (action === 'save-list') {
      if (!sourceId || sourceId === 'default' || sourceId === 'compendium') return;
      const ta = this._getPaneEl(paneKey)?.querySelector(`#sbi-ta-${paneKey}`);
      if (!ta) return;
      await saveNamedList(sourceId, ta.value);
      uiInfo('List saved.');

    } else if (action === 'rename-list') {
      if (!sourceId || sourceId === 'default' || sourceId === 'compendium') return;
      const list = getNamedListById(sourceId);
      if (!list) return;
      const newName = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Rename List' },
        content: `<div style="padding:8px"><label>New name:<br>
          <input type="text" id="dlg-rn" value="${escHtml(list.name)}" style="width:100%;margin-top:4px"></label></div>`,
        buttons: [
          { label: 'Rename', action: 'ok', icon: 'fas fa-check',
            callback: (ev, btn, dlg) => dlg.element.querySelector('#dlg-rn')?.value?.trim() || null },
          { label: 'Cancel', action: 'cancel', icon: 'fas fa-times' },
        ], rejectClose: false,
      });
      if (newName && newName !== 'cancel') {
        await renameNamedList(sourceId, newName);
        this._rebuildSourcePicker(paneKey, category, subtype);
      }

    } else if (action === 'delete-list') {
      if (!sourceId || sourceId === 'default' || sourceId === 'compendium') return;
      const list = getNamedListById(sourceId);
      if (!list) return;
      const ok = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Delete List' },
        content: `<p style="padding:8px">Delete "<strong>${escHtml(list.name)}</strong>"? This cannot be undone.</p>`,
        buttons: [
          { label: 'Delete', action: 'ok',    icon: 'fas fa-trash' },
          { label: 'Cancel', action: 'cancel', icon: 'fas fa-times' },
        ], rejectClose: false,
      });
      if (ok === 'ok') {
        await deleteNamedList(sourceId);
        const fallback = subtype ? 'compendium' : 'default';
        this._activeSource[paneKey] = fallback;
        this._rebuildSourcePicker(paneKey, category, subtype);
        this._selectSource(paneKey, category, subtype, fallback);
        uiInfo('List deleted.');
      }
    }
  }

  async _newList(paneKey, category, subtype, initialContent = '') {
    const name = await foundry.applications.api.DialogV2.wait({
      window: { title: 'New Named List' },
      content: `<div style="padding:8px"><label>List name (e.g. "Homebrew Fantasy", "Cyberpunk"):<br>
        <input type="text" id="dlg-nl" placeholder="My List" style="width:100%;margin-top:4px"></label></div>`,
      buttons: [
        { label: 'Create', action: 'ok', icon: 'fas fa-plus',
          callback: (ev, btn, dlg) => dlg.element.querySelector('#dlg-nl')?.value?.trim() || 'New List' },
        { label: 'Cancel', action: 'cancel', icon: 'fas fa-times' },
      ], rejectClose: false,
    });
    if (!name || name === 'cancel') return;
    const id = await createNamedList(name, category, subtype);
    if (initialContent) await saveNamedList(id, initialContent);
    this._rebuildSourcePicker(paneKey, category, subtype);
    this._selectSource(paneKey, category, subtype, id);
  }

  // ── Tab switching ────────────────────────────────────────────────────
  _switchTab(tab) {
    this._activeTab = tab;
    this.element.querySelectorAll('.h-tab').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.tab === tab));
    this.element.querySelectorAll('.h-pane[data-tab]').forEach(pane =>
      pane.style.display = pane.dataset.tab === tab ? 'block' : 'none');
  }

  _switchItemSub(sub) {
    this._activeItemSub = sub;
    this.element.querySelectorAll('.h-sub-tab').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.subtab === sub));
    this.element.querySelectorAll('.h-sub-pane').forEach(pane =>
      pane.classList.toggle('active', pane.dataset.subtab === sub));
  }

  _sizeObserver() {
    requestAnimationFrame(() => {
      const content = this.element.querySelector('.window-content');
      const header  = this.element.querySelector('.window-header');
      const inner   = this.element.querySelector('#sbi-help-root');
      if (!content || !inner) return;
      const apply = () => {
        const avail = window.innerHeight - 60 - (header?.offsetHeight ?? 40);
        content.style.setProperty('height', `${Math.max(420, avail)}px`, 'important');
        content.style.setProperty('overflow-y', 'auto', 'important');
      };
      apply();
      new ResizeObserver(apply).observe(inner);
    });
  }
}

export function openInstructions() { new InstructionsApp().render({ force: true }); }
