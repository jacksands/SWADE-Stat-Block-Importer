# SWADE Stat Block Importer

**A Foundry VTT module for Savage Worlds Adventure Edition (SWADE v6+)**

Import stat blocks directly into your world as fully populated SWADE actors. Supports multiple formats, AI-assisted character creation, and a built-in reference library for Edges, Powers, Skills, Hindrances, and Races.

---

## Features

### Import
- Paste any supported stat block format and click **Analyze** to preview detected fields, then **Import** to create the actor.
- Supported formats (auto-detected):
  - **Pinnacle (PEG) standard** — official format from all SWADE publications
  - **Savaged.us plain text** — copy the Statblock section from savaged.us (with or without the Analyzer header)
  - **Savaged.us Markdown** — the Markdown export from the savaged.us character builder
  - **Savaged.us JSON** — paste the raw JSON export; image URL is auto-detected and fills the image field
- Imports: attributes, skills, edges, hindrances, powers, weapons, armor, shields, gear, special abilities, cyberware, languages, and currency
- Wild Card detection from the `[WC]` prefix
- Actor image: drop a local file (uploaded to Foundry's file system), browse with Foundry's file picker, or paste a URL / Foundry path
- Actor type: NPC, Character, or Vehicle

### Vehicle Import
- Detects vehicle stat blocks automatically (via `Acc/Top Speed:` / `Handling:` / `Crew:` labels)
- Maps vehicle-specific fields: handling, top speed, toughness, crew, driver skill, mods, cargo, and cost
- Weapons and special abilities on vehicles are also imported

### Export
- Export any existing SWADE actor back to a Pinnacle-format stat block for sharing, editing, or feeding back to an AI

### Instructions & Reference Window
Full in-app reference with:
- **Quick Start** — step-by-step guide and accepted format list
- **AI Creation** — step-by-step workflow for using an external AI to generate characters
- **Setting Rules** — save named rule sets for different campaign settings (attribute points, skill points, core skills, homebrew notes)
- **Skills / Edges / Powers / Abilities / Hindrances / Races / Items** — editable reference lists with defaults based on SWADE Core Rulebook v5.7
- **Library to Use** — choose which sources (Default, Compendium, Named Lists) are included in each Copy for AI action
- **📋 Copy All for AI** — single button that assembles setting rules + format instructions + all reference lists into one clipboard paste for your AI

---

## Installation

### Method 1: Foundry Module Manager (recommended)
1. In Foundry, go to **Add-on Modules → Install Module**
2. Paste the manifest URL:
   ```
   https://raw.githubusercontent.com/jacksands/SWADE-Stat-Block-Importer/refs/heads/main/module.json
   ```
3. Click **Install**, then enable the module in your world

### Method 2: Manual
1. Download the [latest release](https://github.com/jacksands/SWADE-Stat-Block-Importer/archive/refs/heads/main.zip)
2. Extract to your Foundry `Data/modules/` folder as `swade-stat-block-importer`
3. Restart Foundry and enable in Game Settings → Manage Modules

---

## Usage

### Importing a Stat Block

1. Open the importer from the **Actors sidebar** (the import icon) or a macro calling `openImporterDialog()`
2. Set Actor Type (NPC / Character / Vehicle) and Wild Card if needed
3. Optionally add an image: drop a file onto the image zone, click 📁 to browse, or paste a URL
4. Paste the stat block into the text area
5. Click **🔍 Analyze** — check the summary for format detection and any warnings
6. Click **⬇ Import** — the actor is created in your world

### AI-Assisted Character Creation

1. Open **📖 Help** → **AI Creation** tab for the full workflow
2. Configure your **Setting Rules** tab (attribute points, skill points, core skills for your campaign)
3. Review reference lists in **Skills**, **Edges**, **Powers**, **Hindrances**, **Races** tabs — use **Library to Use** to select sources
4. Mark tabs you don't need as **Excluded from Copy All** (e.g., Powers for a non-magical campaign)
5. Click **📋 Copy All for AI** — paste into your AI assistant (ChatGPT, Claude, etc.)
6. Describe the character you want; ask for SWADE Pinnacle format output
7. Paste the result back into the importer

### Compendiums to Search

In **Game Settings → SWADE Stat Block Importer → Compendiums to Search**:
- Select which compendiums are searched when matching item names during import
- Compendiums are grouped by module with collapse/expand and cascade selection
- Without configured compendiums, items are created blank (no artwork or descriptions)
- Recommended: enable `swade-core-rules` and any companion modules you use

---

## Settings

| Setting | Description |
|---|---|
| Compendiums to Search | Which compendiums to search for item matching during import |
| Default Token Settings | Prototype token defaults (disposition, display, vision) applied to all imports |
| Default Actor Type | Whether new imports default to NPC or Character |
| Default Wild Card | Whether Wild Card is pre-checked |
| Auto-calculate Toughness | Recalculate Toughness from Vigor + armor |
| Auto-set token size | Set token size based on creature Size special ability |
| Actor Image Upload Path | Folder in Foundry's file system where dropped images are uploaded (browse with 📁) |
| Additional stat labels | Extra labels to detect in stat blocks (comma-separated, must be followed by `:`) |

---

## Supported Input Formats

### Pinnacle (PEG) Standard
```
[WC] Character Name
Optional biography.

Attributes: Agility d6, Smarts d8, Spirit d6, Strength d6, Vigor d8
Skills: Athletics d6, Fighting d8, Notice d6, Shooting d6
Pace: 6; Parry: 6; Toughness: 7 (2)
Hindrances: Overconfident
Edges: Combat Reflexes, Level Headed
Weapons: Knife (Range Melee, Damage Str+d4); Pistol (Range 12/24/48, Damage 2d6, RoF 1, AP 1)
Armor: Leather Vest (Armor 2)
Gear: Rope; Flashlight
Special Abilities:
• Fearless: Immune to Fear and Intimidation.
• Armor +2: Thick hide.
```

### Savaged.us JSON
Paste the raw JSON export from the savaged.us character builder. Image URL is auto-detected.

### Savaged.us Markdown
Paste the Markdown export. Bold labels (`**Attributes**:`) and headers (`## Section`) are normalized automatically.

### Savaged.us Plain Text
Paste the full page export. The analyzer header and "Analysis" section are stripped automatically.

### Vehicle Format
```
Compact Car
Acc/Top Speed: 20/50; Handling: +1; Toughness: 10 (2); Crew: 1+3
Driver Skill: Driving; Mods: 2; Cost: $15,000
Notes: Standard four-door automobile.
```

---

## Reference Library

The module includes built-in reference lists based on **SWADE Core Rulebook v5.7**:

- **Skills** — all core and non-core skills with linked attributes
- **Edges** — complete list (Background, Combat, Leadership, Power, Professional, Social, Weird, Legendary)
- **Powers** — all core powers with Rank, PP cost, Range, and Duration
- **Special Abilities** — common creature abilities with mechanical effects
- **Hindrances** — complete Minor and Major list with mechanical effects
- **Races** — core races: Android, Aquarian, Avion, Dwarf, Elf, Half-Elf, Half-Folk, Human, Rakashan, Saurian, and setting examples

All lists are editable. Add named lists for your setting, load from compendiums, or import/export as JSON.

---

## Compatibility

| Requirement | Version |
|---|---|
| Foundry VTT | V14 (minimum 14) |
| SWADE System | 6.0.0+ |

---

## Author

**Jack_Sands (Erich)**
Discord: `jack_sands`

Repository: [github.com/jacksands/SWADE-Stat-Block-Importer](https://github.com/jacksands/SWADE-Stat-Block-Importer)

---

## License

This module is provided as-is for personal and community use with Foundry VTT and the Savage Worlds Adventure Edition system.

*Savage Worlds and SWADE are products of Pinnacle Entertainment Group. This module is not affiliated with or endorsed by Pinnacle Entertainment Group.*
