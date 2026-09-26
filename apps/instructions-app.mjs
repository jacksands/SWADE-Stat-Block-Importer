// apps/instructions-app.mjs — InstructionsApp with named list library system
import { uiInfo, uiError, loc, injectCSS, SBI_HELP_CSS, escHtml } from '../utils.mjs';
import {
  ITEM_SUBTYPES, ITEM_SUBTYPE_LABEL, MAIN_REF_CATS,
  getDefaultContent, getCompendiumContent, getNamedListsFor, getNamedListById,
  hasDefaultContent, buildMasterList,
  createNamedList, saveNamedList, renameNamedList, deleteNamedList,
  saveCompendiumContent, loadFromCompendiums,
  getSettingRules, getActiveSettingRuleSet,
  setActiveSettingRuleSet, createSettingRuleSet, saveSettingRuleSet,
  renameSettingRuleSet, deleteSettingRuleSet,
} from '../library/store.mjs';
import { openLibraryUse } from './library-use-app.mjs';
import { EntryEditorApp } from './entry-editor-app.mjs';
import { openExport, openImport } from './export-import-app.mjs';

// Skills is always included in master copy — cannot be ignored
const ALWAYS_INCLUDED = new Set(['skills']);

const CAT_LABELS = {
  skills: '📘 Skills', edges: '✦ Edges', powers: '✦ Powers',
  abilities: '✦ Abilities', hindrances: '⚠ Hindrances', races: '🧝 Races',
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
      ['quick-start','🚀 Quick Start'], ['settings','⚙ Settings'],
      ['format','📄 Format'], ['ai','🤖 AI Creation'],
      ['setting-rules','📐 Setting Rules'],
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
  <button class="src-action" data-action="library-use" data-key="${key}" title="Choose sources for Copy All">📚 Library to Use</button>
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
    return `<div id="sbi-sr-pane">
  <h3>Setting Rules</h3>
  <p style="font-size:12px;">Define character creation rules for your campaign setting. The active rule set is included in <strong>📋 Copy All for AI</strong>.</p>

  <div id="sbi-sr-picker" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;"></div>

  <div id="sbi-sr-fields">
    <div class="fg">
      <label style="min-width:160px;">Attribute Points at Creation:</label>
      <input type="number" id="sr-attr-pts" min="1" max="20" value="5" style="width:60px;"/>
    </div>
    <div class="fg">
      <label style="min-width:160px;">Skill Points at Creation:</label>
      <input type="number" id="sr-skill-pts" min="1" max="50" value="12" style="width:60px;"/>
    </div>
    <div class="fg" style="flex-direction:column;align-items:flex-start;">
      <label style="margin-bottom:4px;">Core Skills (start at d4 free, one per line):</label>
      <textarea id="sr-core-skills" rows="5" style="width:100%;box-sizing:border-box;font-size:11px;resize:vertical;font-family:monospace;"></textarea>
    </div>
    <div class="fg" style="flex-direction:column;align-items:flex-start;">
      <label style="margin-bottom:4px;">Extra / Homebrew Instructions (freeform notes for the AI):</label>
      <textarea id="sr-notes" rows="3" style="width:100%;box-sizing:border-box;font-size:11px;resize:vertical;"
        placeholder="E.g., No Power Points rule is active. Starting funds $1000. Extra skill: Hacking (Smarts)."></textarea>
    </div>
  </div>

  <div id="sbi-sr-ro-notice" style="display:none;font-size:11px;color:var(--fg-muted);margin:4px 0 8px;">
    📖 Default rules — these values are read-only. Create a new set to customize.
  </div>

  <div id="sbi-sr-mgmt" style="display:none;display:flex;gap:6px;margin:6px 0;">
    <button type="button" id="sr-save-btn">💾 Save</button>
    <button type="button" id="sr-rename-btn">✏️ Rename</button>
    <button type="button" id="sr-delete-btn">🗑️ Delete</button>
  </div>

  <hr style="margin:12px 0;opacity:0.3;"/>
  <h4 style="margin:4px 0;">How to Use Setting Rules</h4>
  <ul style="font-size:12px;margin:4px 0;padding-left:1.4em;">
    <li>Select <strong>Default SWADE AE</strong> for standard Adventure Edition rules.</li>
    <li>Click <strong>➕ New Set</strong> to create setting-specific rules (e.g., "Modern Horror", "Sci-Fi").</li>
    <li>Edit the values and click <strong>💾 Save</strong>.</li>
    <li>The active set's values are automatically included in <strong>📋 Copy All for AI</strong>.</li>
    <li>Only one setting rule set can be active at a time.</li>
  </ul>
</div>`;
  }

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
  <div class="h-pane" data-tab="settings">${this._buildSettings()}</div>
  <div class="h-pane" data-tab="format">${this._buildFormat()}</div>
  <div class="h-pane" data-tab="ai">${this._buildAI()}</div>
  <div class="h-pane" data-tab="setting-rules">${this._buildSettingRulesPane()}</div>
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
  <span style="font-size:10px;opacity:0.6;">(copies only the workflow text below, without the lists)</span>
</div>

<h3>How It Works</h3>
<p>This tool helps you use an external AI (ChatGPT, Claude, etc.) to generate SWADE characters and NPCs in the correct format for import. <strong>Important: the AI is a helper, not a replacement for the GM or player. Always review all results before using them in play.</strong></p>

<h3>Workflow</h3>
<ol style="padding-left:1.4em;line-height:1.8;">
  <li><strong>Define Setting Rules</strong> — go to the <span class="tag">📐 Setting Rules</span> tab. Select the default SWADE AE rules or create a custom rule set for your campaign (modern, sci-fi, fantasy variant, etc.). Only one setting is active at a time.</li>
  <li><strong>Configure Reference Lists</strong> — use the <span class="tag">📘 Skills</span>, <span class="tag">✦ Edges</span>, <span class="tag">✦ Powers</span>, <span class="tag">✦ Abilities</span>, <span class="tag">⚠ Hindrances</span>, <span class="tag">🧝 Races</span>, and <span class="tag">📦 Items</span> tabs to define what is available in your campaign. Use the Library button to pull from compendiums or your own saved lists. In each tab you can click <strong>📋 Copy for AI</strong> to copy just that list with a preface the AI will understand.</li>
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
    this._setupSettingRulesPane();
    for (const key of MAIN_REF_CATS) this._setupRefPane(key);
    for (const sub of ITEM_SUBTYPES)  this._setupRefPane(sub);
    this._switchTab(this._activeTab);
    this._sizeObserver();
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
        await setActiveSettingRuleSet(btn.dataset.srid);
        this._rebuildSRPicker();
        this._loadSRFields();
      }));
    this._loadSRFields();
  }

  _loadSRFields() {
    const active  = getActiveSettingRuleSet();
    const isDefault = active.id === 'default';
    const el = k => this.element.querySelector(k);
    const attrPts = el('#sr-attr-pts');
    const skillPts = el('#sr-skill-pts');
    const coreSkills = el('#sr-core-skills');
    const notes = el('#sr-notes');
    if (attrPts)   { attrPts.value = active.attrPoints; attrPts.readOnly = isDefault; }
    if (skillPts)  { skillPts.value = active.skillPoints; skillPts.readOnly = isDefault; }
    if (coreSkills){ coreSkills.value = active.coreSkills; coreSkills.readOnly = isDefault; }
    if (notes)     { notes.value = active.notes ?? ''; notes.readOnly = isDefault; }
    const roNotice = el('#sbi-sr-ro-notice');
    if (roNotice) roNotice.style.display = isDefault ? 'block' : 'none';
    const mgmt = el('#sbi-sr-mgmt');
    if (mgmt) mgmt.style.display = isDefault ? 'none' : 'flex';
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
    const data = {
      attrPoints:  parseInt(el('#sr-attr-pts')?.value  ?? '5'),
      skillPoints: parseInt(el('#sr-skill-pts')?.value ?? '12'),
      coreSkills:  el('#sr-core-skills')?.value ?? '',
      notes:       el('#sr-notes')?.value ?? '',
    };
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
    lines.push(`Attribute Points at Creation: ${active.attrPoints}`);
    lines.push(`Skill Points at Creation: ${active.skillPoints}`);
    if (active.coreSkills?.trim()) {
      lines.push(`Core Skills (start at d4 free):\n${active.coreSkills.trim()}`);
    }
    if (active.notes?.trim()) {
      lines.push(`Extra Instructions / Homebrew:\n${active.notes.trim()}`);
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
      const text = (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
      try { await navigator.clipboard.writeText(text); uiInfo('AI instructions copied!'); }
      catch { uiError('Copy failed — select all and copy manually.'); }
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

    } else if (action === 'library-use') {
      openLibraryUse();

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
