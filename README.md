<div align="center">

# 📋 SWADE Stat Block Importer

**Import · Export · AI-assisted creation — for Savage Worlds Adventure Edition**

![Stars](https://img.shields.io/github/stars/jacksands/SWADE-Stat-Block-Importer)
![Issues](https://img.shields.io/github/issues/jacksands/SWADE-Stat-Block-Importer)
![Último commit](https://img.shields.io/github/last-commit/jacksands/SWADE-Stat-Block-Importer)
![Licença](https://img.shields.io/github/license/jacksands/SWADE-Stat-Block-Importer)

[![Foundry VTT](https://img.shields.io/badge/Foundry-V14-8b5cf6?style=flat-square)](https://foundryvtt.com)
[![SWADE](https://img.shields.io/badge/SWADE-6.0.0%2B-c0392b?style=flat-square)](https://peginc.com)
[![Version](https://img.shields.io/badge/version-2.1.0-d4a574?style=flat-square)](#)

Turn a pasted stat block into a fully populated SWADE actor — or hand your campaign rules to an AI and get one back.

</div>

---

## ✨ What it does

The module has two main parts, plus a third possibility that’s a bonus.

- **Basic part:** it imports characters using the most standard statblocks, like Pinnacle/SavagedUS, etc.

- **Part 2:** there’s an area that lets you take the material you already have + your setting instructions (standard or not) and put it all together into a “big text block.” This big text block teaches the AI how to build a SWADE character in your setting and using your sources. Then you just paste the big text block into the AI and write something like:
  - “Create a player character who is an elf barbarian, half-drunk but honorable, level 1.” or
  - “Build a veteran NPC, cyberpunk, German, with PTSD.”

  The AI will try to build it already in the format the importer knows, using the information you gave it.

- **And the third:** if you feed the AI the information and give it a screenshot or paste in text from an NPC or PC — like a photo of a character sheet or a screenshot of a monster you found online — it’s quite likely it can turn that into a statblock importable by the module, and then you just use it.

The idea is to help create characters quickly, especially disposable NPCs, without having to build everything from scratch. And, of course, you can also use the statblock to import ready-made characters from sources that sometimes aren’t compatible.

It does not replace the GM/player building the character!!   You should always check the result!!!




| | |
|---|---|
| ⬇ **Import** | Paste a SWADE stat block (Pinnacle, Savaged.us plain/Markdown/JSON) → **Analyze** → **Import**. Creates actors with attributes, skills, edges, hindrances, powers, weapons, armor, gear, special abilities and more. Vehicles too. |
| ⬆ **Export** | Turn any existing SWADE actor back into a Pinnacle-format stat block for sharing or AI editing. |
| 🤖 **AI Creation** | Build a complete prompt from your rules + reference lists (**📋 Copy All for AI**), paste it into any AI, and import the result. |
| 🎛️ **Library Sources** | Choose which sources feed each category — *Default*, *Compendium*, or *Named Lists* — and save them as reusable **usage profiles**. |
| 📐 **Setting Rules** | Official SWADE setting rules (Born a Hero, No Power Points, …) plus creation parameters and freeform homebrew. Link a rule set to a usage profile for one-click campaign switching. |
| 📤 **Export / Import config** | Back up or transfer the whole module configuration — settings, profiles, rule sets, library data. Per-category export/import supported. |
| 📚 **Reference Library** | Built-in, editable lists based on the **SWADE Core Rulebook v5.7**. |

---

## 🚀 Install

**Module Manager (recommended)**

Foundry → **Add-on Modules → Install Module** → paste:

```
https://raw.githubusercontent.com/jacksands/SWADE-Stat-Block-Importer/refs/heads/main/module.json
```

**Manual** — download the [latest release](https://github.com/jacksands/SWADE-Stat-Block-Importer/archive/refs/heads/main.zip), extract to `Data/modules/swade-stat-block-importer`, restart Foundry and enable it.

> Requires **Foundry VTT v14** and the **SWADE system 6.0.0+**.

---

## 🕹️ Quick start

1. **Import a stat block** — open the importer from the **Actors sidebar**, paste a stat block, click **🔍 Analyze**, then **⬇ Import**. Pick actor type (NPC / Character / Vehicle) and Wild Card as needed. *Selecting “Character” pre-checks Wild Card.*
2. **Set up compendiums** — *Game Settings → SWADE Stat Block Importer → **Compendiums to Search***. Without this, items are created without descriptions or artwork.
3. **Create with AI** — open **📖 Help**, pick your sources in **🎛️ Library Sources**, set your **📐 Setting Rules**, then hit **📋 Copy All for AI** and paste into your AI, ending with a Pinnacle-format stat block.

---

## 🧭 The Help window

Everything lives in one place (**📖 Help**):

| Tab | Purpose |
|---|---|
| 🎛️ **Library Sources** | Usage profiles: pick Default / Compendium / Named Lists per category, save & load profiles, link a Setting Rule Set. |
| 🚀 **Quick Start** | Step-by-step guide and accepted formats. |
| ⚙️ **Settings** | Explains every module setting. |
| 📄 **Format** | Stat-block format reference with examples. |
| 🤖 **AI Creation** | AI workflow, rank scale, quick math, example prompts. |
| 📐 **Setting Rules** | Core / Setting-specific / Optional SWADE rules + creation parameters + homebrew. |
| 📤 **Export / Import** | Backup and transfer of settings, profiles, rule sets and library data. |
| 📘✦✦⚠🧝📦 **Skills / Edges / Powers / Abilities / Hindrances / Races / Items** | Editable reference lists with defaults from the core rulebook. |

---

## 📥 Supported input

<details>
<summary><b>Pinnacle (PEG) standard</b></summary>

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
</details>

<details>
<summary><b>Savaged.us</b> — plain text, Markdown, and JSON</summary>

Paste the export as-is; the importer normalizes headers and strips analyzer noise. The JSON export auto-fills the actor image.
</details>

<details>
<summary><b>Vehicle stat block</b></summary>

```
Compact Car
Acc/Top Speed: 20/50; Handling: +1; Toughness: 10 (2); Crew: 1+3
Driver Skill: Driving; Mods: 2; Cost: $15,000
Notes: Standard four-door automobile.
```
</details>

---

## ⚙️ Settings

| Setting | Description |
|---|---|
| **Compendiums to Search** | Which compendiums are searched to match items (edges, skills, powers, gear). |
| **Export / Import Settings** | Backup / restore module configuration (GM only). |
| **Default Token Settings** | Prototype token defaults for every import. |
| **Default Actor Type** | NPC or Character by default. |
| **Default: Wild Card** | Whether Wild Card is pre-checked for NPCs. |
| **NPC Wild Card Bennies** | Starting Bennies for NPC Wild Cards (player characters always start with 3). |
| **Auto-calculate Toughness** | Recalculate from Vigor + armor. |
| **Auto-set token size** | From the creature’s Size ability. |
| **Auto-set Ignored / Extra Wounds** | For Undead/Construct/Elemental and Size/Resilient. |
| **Special Ability bullet icon(s)** | Bullets the parser splits on (default `•|■`). |
| **@ notation** | Force item types in Special Abilities (`@w`, `@a`, `@e`, `@h`, `@sa`). |
| **Additional stat labels** | Extra labels to detect (e.g. `Sanity:, Strain:`). |
| **Actor Image Upload Path** | Foundry folder for dropped images. |

---

## 🔁 Configuration backup

**Export / Import** (in Module Settings or the Help window) transfers everything **except actor data and images**, which the module creates but does not own:

- **Full Backup** · **Settings only** · **Usage Profiles only** · **Per category**
- Import as **Merge**, **Replace**, or **Selective** (per category), optionally applied to a profile.
- Files are **validated first**: you’ll be warned about missing modules/compendiums and informed about new libraries found locally.

---

## 📚 Reference library

Built-in, fully editable lists from from free to use sources compatible with **SWADE Core Rulebook v5.7** rules:

**Skills** · **Edges** · **Powers** · **Special Abilities** · **Hindrances** · **Races**

Add your own named lists, load from compendiums, or import/export as JSON.

---

<div align="center">

**Author:** Jack_Sands (Erich) · Discord `jack_sands`
[github.com/jacksands/SWADE-Stat-Block-Importer](https://github.com/jacksands/SWADE-Stat-Block-Importer)

Savage Worlds and SWADE are products of Pinnacle Entertainment Group.
This module is not affiliated with or endorsed by Pinnacle Entertainment Group.

</div>
