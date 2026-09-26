// lib/ref-defaults.mjs — default reference content based on SWADE Core Rulebook v5.7

const DEFAULT_SKILLS_REF = `# SWADE Skills Reference (Core Rulebook v5.7)
# Format: Skill Name | Linked Attribute | Notes
# Core skills (★) start at d4 FREE for all player characters.
# Non-core skills must be bought starting at d4 (costs 1 point).
# Raising a skill up to its linked attribute: 1 point per die step.
# Raising a skill above its linked attribute: 2 points per die step.
# Maximum d12 at character creation (d12+1 only if race starts at d6).

## ★ Core Skills (free d4 — do not spend points to reach d4)
Athletics★     | Agility | Climbing, jumping, balancing, swimming, throwing, catching, wrestling
Common Know★   | Smarts  | General knowledge of the character's world and setting
Notice★        | Smarts  | Awareness, perception, spotting hidden things or traps
Persuasion★    | Spirit  | Convincing others, negotiation, diplomacy, social manipulation
Stealth★       | Agility | Sneaking, hiding, shadowing, moving silently

## Combat Skills
Fighting       | Agility | Armed and unarmed hand-to-hand combat
Shooting       | Agility | Precision with all ranged weapons (bows, firearms, crossbows)

## Mental & Knowledge Skills
Academics      | Smarts  | Liberal arts, social sciences, literature, history, law
Battle         | Smarts  | Strategy, tactics, military operations; key skill in Mass Battles
Electronics    | Smarts  | Operating, programming, and using electronic devices and systems
Gambling       | Smarts  | Skill and familiarity with games of chance
Hacking        | Smarts  | Coding, programming, and breaking into computer systems (SciFi/Modern)
Healing        | Smarts  | Treating and healing Wounds, diseases, and forensic evidence
Language (X)   | Smarts  | Knowledge and fluency in one specific language (name in parentheses)
Occult         | Smarts  | Knowledge of supernatural events, creatures, history, and ways
Research       | Smarts  | Finding written information from various sources (libraries, internet)
Science        | Smarts  | Biology, chemistry, geology, engineering, and other scientific fields
Survival       | Smarts  | Finding food, water, shelter; tracking in the wild
Taunt          | Smarts  | Insulting or psychologically undermining another; almost always a Test

## Social Skills
Intimidation   | Spirit  | Threatening others into compliance or submission
Performance    | Spirit  | Singing, dancing, acting, and other public expression

## Technical & Outdoors Skills
Boating        | Agility | Sailing or piloting boats, ships, and other watercraft
Driving        | Agility | Controlling and operating ground vehicles
Piloting       | Agility | Maneuvering vehicles in three dimensions (aircraft, spacecraft)
Repair         | Smarts  | Fixing mechanical and electrical devices and gadgets
Riding         | Agility | Mounting, controlling, and fighting from tamed beasts
Thievery       | Agility | Sleight of hand, pickpocketing, lockpicking, and shady feats

## Arcane Background Skills (required to activate Powers)
Faith          | Spirit  | Powers via Arcane Background (Miracles) — divine casters
Focus          | Spirit  | Powers via Arcane Background (Gifted) — innate supernatural talent
Psionics       | Smarts  | Powers via Arcane Background (Psionics) — mental powers
Spellcasting   | Smarts  | Powers via Arcane Background (Magic) — learned sorcery
Weird Science  | Smarts  | Powers via Arcane Background (Weird Science) — gadgets/inventions

## HOMEBREW / SETTING ADDITIONS
# Add setting-specific skills below:
# Skill Name | Linked Attribute | Notes`;

const DEFAULT_HINDRANCES_REF = `# SWADE Hindrances Reference (Core Rulebook v5.7)
# Format: Name | Type | Description and mechanical effects
# Hindrance Points: Major = 2 pts, Minor = 1 pt. Maximum BENEFIT is 4 points total.
# Spending points: 2 pts = raise one attribute OR gain one Edge
#                  1 pt  = gain one skill point OR double starting funds once

## Minor Hindrances
All Thumbs      | Minor       | -2 to use mechanical or electrical devices; Critical Failure breaks the device
Anemic          | Minor       | -2 to Vigor rolls made to resist Fatigue
Bad Eyes        | Minor       | -1 to any Trait roll dependent on vision; eyewear negates penalty but 50% break chance when Wounded or suffering trauma
Big Mouth       | Minor       | Cannot keep a secret; reveals plans and information at worst possible times
Can't Swim      | Minor       | -2 to Athletics (swimming) rolls; each inch in water costs 3" of Pace
Cautious        | Minor       | Plans excessively or is overly careful; rarely acts without over-thinking
Death Wish      | Minor       | Hero wants to die after completing some epic task; takes any risk to achieve it
Delusional      | Minor       | Believes something strange that causes occasional trouble (Minor version)
Doubting Thomas | Minor       | Doesn't believe in the supernatural; rationalizes supernatural events; -2 to resisting Fear from the supernatural
Driven          | Minor       | Hero's actions driven by some important goal; occasionally causes inconvenience
Enemy           | Minor       | Has a recurring nemesis (Minor version — lower threat level)
Greedy          | Minor       | Argues bitterly for more than fair share; Minor: argues over pay and spoils
Habit           | Minor       | Irritating recurring habit that annoys those around her but isn't dangerous
Hard of Hearing | Minor       | -4 to Notice rolls made to hear sounds
Hesitant        | Minor       | Draw two Action Cards in combat and act on lowest; Jokers are used normally; cannot take Quick or Level Headed
Illiterate      | Minor       | Cannot read or write in any language
Jealous         | Minor       | Insecurity leads to envy of others' accomplishments or possessions (Minor version)
Loyal           | Minor       | Risks her life for friends without hesitation; never abandons allies
Mean            | Minor       | -1 to Persuasion rolls; ill-tempered and disagreeable
Mild Mannered   | Minor       | -2 to Intimidation rolls; not threatening
Obligation      | Minor       | Responsibility consuming ~20 hours most weeks (Minor version)
Outsider        | Minor       | -2 to Persuasion rolls with those who aren't her own kind (Minor version: social only)
Overconfident   | Major       | Believes he can do anything; never wants to retreat; never turns down a challenge
Phobia          | Minor       | -1 to all Trait rolls when in the presence of the phobia
Poverty         | Minor       | Starts with half the usual setting funds; halves total funds every game week
Quirk           | Minor       | Minor foible that is usually humorous but can cause real trouble occasionally
Ruthless        | Minor       | Will do most anything to accomplish her goals (Minor: inconveniences others)
Secret          | Minor       | Has a secret she keeps to protect herself or others (Minor: not known, no severe consequences if revealed)
Shamed          | Minor       | Haunted by a tragic event; Minor: circumstances not generally known
Slow            | Minor       | Pace -1 and running die one step lower (minimum d4-1); cannot take Fleet-Footed
Small           | Minor       | Size -1 (therefore Toughness -1); cannot reduce Size below -1 but penalty remains
Stubborn        | Minor       | Always wants his way; never admits he's wrong
Suspicious      | Minor       | Paranoia causes frequent trust issues (Minor version)
Thin Skinned    | Minor       | -2 when resisting Taunt attacks
Ugly            | Minor       | -1 to Persuasion rolls (Minor version)
Vengeful        | Minor       | Seeks vengeance but does so legally; holds grudges
Vow             | Minor       | Has sworn an oath to someone or something (Minor: lower stakes)
Wanted          | Minor       | Committed a crime; Minor: local or minor offense
Young           | Minor       | 4 attribute points and 10 skill points; +1 extra Benny per session (Minor)

## Major Hindrances
All Thumbs      | Major       | Worse version; Critical Failure always breaks the device regardless of circumstances
Arrogant        | Major       | Must humiliate opponents; always looks to challenge the group's strongest/leader
Bad Eyes        | Major       | -2 to any Trait roll dependent on vision; eyewear negates penalty
Bad Luck        | Major       | One fewer Benny per game session; cannot have both Bad Luck and Luck Edge
Blind           | Major       | -6 to all physical tasks requiring vision; character gains a free Edge to compensate
Bloodthirsty    | Major       | Never takes prisoners unless under direct supervision of a superior
Clueless        | Major       | -1 to Common Knowledge and Notice rolls
Clumsy          | Major       | -2 to Athletics and Stealth rolls
Code of Honor   | Major       | Keeps his word; doesn't abuse or kill prisoners; acts like a gentleman at all times
Curious         | Major       | Always wants to know what's behind a mystery; frequently gets into trouble because of it
Delusional      | Major       | Believes something strange and dangerous; acts on it frequently
Driven          | Major       | Extreme version; hero will make major sacrifices and harm relationships to pursue goal
Elderly         | Major       | Pace -1 and -1 to running rolls (min 1); -1 penalty to Agility, Strength (including damage), and Vigor rolls but not their linked skills; 5 extra skill points for Smarts-linked skills
Enemy           | Major       | Has a powerful recurring nemesis (Major: serious ongoing threat)
Greedy          | Major       | Major: fights over anything, willing to betray allies for significant gain
Habit           | Major       | Physical or mental addiction; -1 to all Trait rolls when craving; -2 when actively suffering withdrawal
Hard of Hearing | Major       | Character is deaf; automatically fails all Notice rolls that depend on hearing
Heroic          | Major       | Always comes to the rescue of those she feels can't help themselves; never turns down someone in need
Impulsive       | Major       | Almost always leaps before he looks; rarely thinks things through before acting
Jealous         | Major       | Overly possessive; will harm or betray others out of jealousy (Major: acts on envy)
Mute            | Major       | Cannot speak; can write messages, use sign language, or visual communication
Obligation      | Major       | Responsibility consuming 40+ hours per week (Major version); severely limits free time and actions
One Arm         | Major       | Tasks requiring two hands suffer -4 modifier
One Eye         | Major       | -2 to any Trait roll dependent on vision and more than 5" (10 yards) distant
Outsider        | Major       | -2 to Persuasion; Major also means few or no legal rights in the campaign area
Overconfident   | Major       | Believes he can do most anything; never wants to retreat from a challenge
Pacifist        | Minor/Major | Minor: only fights when given no other choice; never allows killing helpless victims. Major: won't fight living characters under any circumstances
Phobia          | Major       | -2 to all Trait rolls when in the presence of the phobia (Major version)
Ruthless        | Major       | Harms anyone and everyone who gets in her way to accomplish goals
Secret          | Major       | Has a secret; Major: would cause severe problems (legal, social, or lethal) if discovered
Shamed          | Major       | Deed is well-known; enemies or rivals use it actively against the character
Slow            | Major       | Running die one step lower; Pace -2; -2 to Athletics rolls and rolls to resist Athletics
Suspicious      | Major       | Support rolls to aid the distrustful individual are made at -2; trusts no one
Thin Skinned    | Major       | -4 when resisting Taunt attacks (Major version)
Tongue-Tied     | Major       | -1 penalty to Intimidation, Performance, Persuasion, and Taunt rolls that involve speech
Ugly            | Major       | -2 to Persuasion rolls (Major version)
Vengeful        | Major       | Doesn't let anything prevent him from a reckoning; breaks laws; harms others
Vow             | Major       | Sworn oath to someone or something the hero believes in; Major: significant restrictions on behavior
Wanted          | Major       | Major crime; authorities actively seeking the character; arrest on sight
Yellow          | Major       | -2 to Fear checks and when resisting Intimidation; will avoid direct confrontation
Young           | Major       | 3 attribute points, 10 skill points; two extra Bennies per session; Small Hindrance included

## HOMEBREW / SETTING ADDITIONS
# Add setting-specific hindrances below:
# Name | Type | Description`;

const DEFAULT_RACES_REF = `# SWADE Races / Ancestries Reference (Core Rulebook v5.7)
# Format: Race Name (header), then each ability on its own line: Ability Name: Description
# For AI: apply ALL listed abilities to the character. Racial negatives (Hindrances, penalties) still apply.
# Note: racial abilities that duplicate Edges grant those Edge benefits without meeting requirements.

## Core Races

Android
Construct: +2 to recover from being Shaken; doesn't breathe; ignores one level of Wound modifiers; immune to poison and disease; cannot heal naturally (must be repaired with Repair skill).
Outsider (Major): -2 to Persuasion rolls with non-androids; no legal rights in most areas.
Pacifist (Major): May not injure a sapient being or allow such a being to be harmed through action or inaction.
Vow (Major): Designed with a particular purpose; acts as a Major Vow directed to that purpose/directive.

Aquarian
Aquatic: Cannot drown in water; moves at full Pace when swimming.
Dependency: Must immerse in water one hour out of every 24 or become automatically Fatigued each day until Incapacitated; perishes the day after Incapacitation from dehydration.
Low Light Vision: Ignores penalties for Dim and Dark illumination.
Toughness +1: Natural resilience grants +1 to base Toughness.

Avion
Can't Swim: -2 to Athletics (swimming) rolls; each inch moved in water costs 3" of Pace.
Flight: Fly at Pace 12 per round; use Athletics when maneuvering in flight.
Frail: -1 Toughness.
Keen Senses: Begin with d6 in Notice instead of d4; may raise to d12+1.
Reduced Pace: Walking Pace -1 and running die one step lower.

Dwarf
Low Light Vision: Ignores penalties for Dim and Dark illumination.
Reduced Pace: Pace -1 and running die one die type lower than normal.
Tough: Start with d6 Vigor instead of d4; maximum Vigor increases to d12+1.

Elf
Agile: Start with d6 Agility instead of d4; maximum Agility increases to d12+1.
All Thumbs: -2 to use mechanical or electrical devices; Critical Failure on such use breaks the device.
Low Light Vision: Ignores penalties for Dim and Dark illumination.

Half-Elf
Heritage: Choose ONE of: start with d6 Agility (max d12+1) OR begin with any free Novice Edge (must meet requirements).
Low Light Vision: Ignores penalties for Dim and Dark illumination.
Outsider (Minor): -2 to Persuasion rolls with all but other half-elves.

Half-Folk (Halfling)
Luck: Draw one additional Benny per game session.
Reduced Pace: Pace -1 and running die one die type lower.
Size -1: Size (and therefore Toughness) reduced by 1.
Spirited: Start with d6 Spirit instead of d4; maximum Spirit increases to d12+1.

Human
Adaptable: Begin play with any Novice Edge of their choosing (must meet its Requirements as usual).
Notes: Versatile. No penalties. Suitable for any setting, concept, and role.

Rakashan (Cat-Folk)
Agile: Start with d6 Agility instead of d4; maximum Agility increases to d12+1.
Bite/Claws: Natural Weapons causing Strength+d4 damage.
Bloodthirsty (Major Hindrance): Rarely takes prisoners; feels little compunction about punishing captured foes.
Can't Swim: -2 to Athletics (swimming) rolls; each inch moved in water costs 3" of Pace.
Low Light Vision: Ignores penalties for Dim and Dark illumination.
Racial Enemy: Pick a common race; -2 to Persuasion when dealing with each other; often attack on sight.

Saurian (Lizardfolk)
Armor +2: Scaly skin acts as leather armor (+2 Armor to Toughness).
Bite: Natural Weapon causing Strength+d4 damage.
Environmental Weakness (Cold): -4 penalty to resist cold environmental effects; +4 damage from cold-based attacks.
Keen Senses: Equivalent of Alertness Edge (+2 to Notice rolls).
Outsider (Minor): -2 to Persuasion rolls with all but other saurians.

## Setting-Specific Race Examples
# These are examples from the Core Rulebook for setting-specific races.
# Replace with races appropriate to your campaign setting.

Celestial (Setting Example)
All Thumbs: -2 to use mechanical or electrical devices.
Arcane Background (Miracles): Can call forth blessed miracles.
Faith: Start with d6 in Faith skill; maximum increases to d12+1.
Flight: Fly at Pace 12 per round.
Racial Enemy (Demons/Devils): -2 to Persuasion with demons and devils; often hostile.
Vow (Major — Protect Humanity): Must protect the flock; acts as a Major Vow.

Guardian (Setting Example)
Adaptable: Begin play with any Novice Edge (must meet Requirements).
Champion: +2 damage when attacking supernaturally evil (or good) creatures.
Vigorous: Start with d6 Vigor instead of d4; maximum increases to d12+1.
Vow (Major — Protect Humanity): Must protect the remaining flock on Earth.

## HOMEBREW / SETTING ADDITIONS
# Add setting-specific races below following the same format:
# Race Name
# Ability Name: Description.`;

const DEFAULT_EDGES_REF = `# SWADE Edges Reference (Core Rulebook v5.7)
# Format: Edge Name | Requirements | Brief mechanical effect
# Requirements listed as: Rank (Novice/Seasoned/Veteran/Heroic/Legendary), then Trait requirements.
# For AI: characters must meet ALL listed requirements before taking an Edge.

## Background Edges
Alertness          | Novice                          | +2 to Notice rolls
Ambidextrous       | Novice, Agility d8+             | Ignore -2 off-hand penalty; may stack Parry bonuses from both weapons
Arcane Background  | Novice                          | Access to one of: Gifted, Magic, Miracles, Psionics, Weird Science
Arcane Resistance  | Novice, Spirit d8+              | Arcane skills targeting hero suffer -2 penalty; magical damage reduced by 2
Improved Arcane Resistance | Novice, Arcane Resistance | Penalty -4; magical damage reduced by 4
Aristocrat         | Novice                          | +2 Persuasion with local elite/nobles; +2 Common Knowledge for upper class topics
Attractive         | Novice, Vigor d6+               | +1 to Performance and Persuasion if target is attracted to hero's type
Very Attractive    | Novice, Attractive              | +2 to Performance and Persuasion rolls
Berserk            | Novice                          | After Shaken/Wounded: Strength +1 die, Wild Attacks only, +2 Toughness, ignore 1 Wound penalty; risk of hitting allies
Brave              | Novice, Spirit d6+              | +2 to Fear checks and -2 on the Fear Effects Table
Brawny             | Novice, Strength d6+, Vigor d6+ | Size +1 (Toughness +1); Strength treated one die type higher for Encumbrance and Minimum Strength; max Size +3
Brute              | Novice, Strength d6+, Vigor d6+ | Link Athletics to Strength instead of Agility; thrown item Short Range +1 (Medium and Long double accordingly)
Charismatic        | Novice, Spirit d8+              | Free reroll when using Persuasion
Elan               | Novice, Spirit d8+              | +2 when spending a Benny to reroll a Trait roll
Fame               | Novice                          | +1 Persuasion when recognized; double normal Performance fee
Famous             | Seasoned, Fame                  | +2 Persuasion when recognized; 5× or more normal Performance fee
Fast Healer        | Novice, Vigor d8+               | +2 to natural healing Vigor rolls; check every 3 days instead of 5
Fleet-Footed       | Novice, Agility d6+             | Pace +2; increase running die one step
Linguist           | Novice, Smarts d6+              | d6 in languages equal to half Smarts die type
Luck               | Novice                          | +1 Benny at the start of each session
Great Luck         | Novice, Luck                    | +2 Bennies at the start of each session
Quick              | Novice, Agility d8+             | Discard and redraw Action Cards of 5 or lower until getting a card higher than 5
Rich               | Novice                          | 3× starting funds; $150K annual salary (if applicable)
Filthy Rich        | Novice, Rich                    | 5× starting funds; $500K average annual salary (if applicable)

## Combat Edges
Block              | Seasoned, Fighting d8+          | Parry +1; Gang Up bonus against him reduced by 1
Improved Block     | Veteran, Block                  | Parry +2; Gang Up bonus reduced by 2
Brawler            | Novice, Strength d8+, Vigor d8+ | Toughness +1; fists/feet deal Strength+d4; if already has damage die, increase by one step. Does not make fists Natural Weapons
Bruiser            | Seasoned, Brawler               | Toughness +1 additional; fist/claw damage die increases one more step
Calculating        | Novice, Smarts d8+              | When Action Card is 5 or lower, ignore up to 2 points of penalties on one action that turn
Combat Reflexes    | Seasoned                        | +2 to recover from being Shaken or Stunned
Counterattack      | Seasoned, Fighting d8+          | Once per round: free Fighting attack against one failed attack made against hero
Improved Counterattack | Veteran, Counterattack      | Free attacks against up to three failed attacks each round
Dead Shot          | Wild Card, Novice, Athletics or Shooting d8+ | When Action Card is Joker: double total damage of first successful Athletics (throwing) or Shooting roll this round
Dodge              | Seasoned, Agility d8+           | -2 to all ranged attacks against the character (unless surprised); doesn't stack with cover
Improved Dodge     | Seasoned, Dodge                 | +2 when Evading area effect attacks
Double Tap         | Seasoned, Shooting d6+          | +1 to hit and damage; costs one extra bullet; only RoF 1 weapons; cannot combine with Rapid Fire
Extraction         | Novice, Agility d8+             | When moving away from adjacent foes, one (player's choice) doesn't get a free Fighting attack
Improved Extraction | Seasoned, Extraction           | Up to three foes don't get free attacks when moving out of melee
Feint              | Novice, Fighting d8+            | When Testing with Fighting, may choose to make foe resist with Smarts instead of Agility
First Strike       | Novice, Agility d8+             | Once per round: free Fighting attack against a foe immediately after he moves into Reach
Improved First Strike | Heroic, First Strike         | May attack up to three foes each turn as they move into Reach
Free Runner        | Novice, Agility d8+, Athletics d6+ | Full Pace on Difficult Ground when obstacles available; +2 to Athletics for climbing and foot Chases
Frenzy             | Seasoned, Fighting d8+          | Roll a second Fighting die with any one Fighting attack for the turn
Improved Frenzy    | Veteran, Frenzy                 | Roll extra Fighting die with up to two Fighting attacks in the same turn
Giant Killer       | Veteran                         | +1d6 damage when attacking creatures three or more Sizes larger
Hard to Kill       | Novice, Spirit d8+              | May ignore Wound penalties on Vigor rolls to avoid Bleeding Out
Harder to Kill     | Veteran, Hard to Kill           | If "killed": odd die roll = dead; even = Incapacitated but escapes death
Improvisational Fighter | Seasoned, Smarts d6+       | Ignores -2 penalty when wielding improvised weapons
Iron Jaw           | Novice, Vigor d8+               | +2 to Soak rolls and Vigor rolls to avoid Knockout Blows
Killer Instinct    | Seasoned                        | Free reroll in any opposed Test the hero initiates
Level Headed       | Seasoned, Smarts d8+            | Draw an additional Action Card in combat; choose which to use
Improved Level Headed | Seasoned, Level Headed       | Draw two additional cards; keep the best one
Marksman           | Seasoned, Athletics d8+ or Shooting d8+ | If no movement and RoF 1 first action: +1 to roll OR ignore up to 2 points of penalties (Called Shots, Cover, Range, Scale, Speed); doesn't stack with Aim
Martial Artist     | Novice, Fighting d6+            | Fists/feet are Natural Weapons; always armed; +1 when striking; Strength+d4 damage
Martial Warrior    | Seasoned, Martial Artist        | Fighting bonus +2; damage die increases one more step
Mighty Blow        | Wild Card, Novice, Fighting d8+ | When Action Card is Joker: double damage of first successful Fighting attack this round
Nerves of Steel    | Novice, Vigor d8+               | Ignore 1 point of Wound penalties
Improved Nerves of Steel | Novice, Nerves of Steel   | Ignore 2 points of Wound penalties
No Mercy           | Seasoned                        | When spending Benny to reroll damage, add +2 to final total
Rapid Fire         | Seasoned, Shooting d6+          | Increase weapon's Rate of Fire by 1 for any one Shooting attack that turn
Improved Rapid Fire | Veteran, Rapid Fire            | May increase RoF by 1 twice in same turn (via Multi-Action)
Rock and Roll!     | Seasoned, Shooting d8+          | If doesn't move: ignores Recoil penalty when firing at RoF 2 or higher
Steady Hands       | Novice, Agility d8+             | Ignores Unstable Platform penalty; reduces running penalty from -2 to -1
Sweep              | Novice, Strength d8+, Fighting d8+ | Attack all targets in Reach with one Fighting roll at -2 (friends and foes)
Improved Sweep     | Veteran, Sweep                  | No -2 penalty; can choose to avoid friendly targets
Trademark Weapon   | Novice, chosen weapon skill d8+ | +1 to attack rolls and +1 Parry when weapon is readied; may be taken for different weapons
Improved Trademark Weapon | Seasoned, Trademark Weapon | Bonuses increase to +2
Two-Fisted         | Novice, Agility d8+             | Second attack from different hand doesn't inflict Multi-Action penalty; off-hand penalty still applies without Ambidextrous
Two-Gun Kid        | Novice, Agility d8+             | Like Two-Fisted but for ranged weapons; may also make a melee attack if has Two-Fisted

## Leadership Edges (Command Range: 5" unless noted; affects allied Extras unless Natural Leader)
Command            | Novice, Smarts d6+              | Extras in range add +1 to Spirit rolls to recover from Shaken and Vigor to recover from Stunned
Command Presence   | Seasoned, Command               | Command Range increases to 10" (20 yards)
Fervor             | Veteran, Spirit d8+, Command    | Extras in range add +1 to Fighting damage rolls
Hold the Line!     | Seasoned, Smarts d8+, Command   | +1 to Extras' Toughness in Command Range
Inspire            | Seasoned, Command               | Once per turn: roll Battle to Support one Trait type; applies to all allied Extras in Command Range
Natural Leader     | Seasoned, Spirit d8+, Command   | Leadership Edges now apply to Wild Card allies as well as Extras
Tactician          | Seasoned, Smarts d8+, Command, Battle d6+ | Extra Action Card each round of combat or chase; may give it to any one allied Extra in Command Range
Master Tactician   | Veteran, Tactician              | Two extra Action Cards to distribute each round instead of one

## Power Edges
Artificer          | Seasoned, Arcane Background (Any) | Can create Arcane Devices and give them to allies
Channeling         | Seasoned, Arcane Background (Any) | With a raise on arcane skill roll, reduces Power Point cost by 1 (can reduce to 0)
Concentration      | Seasoned, Arcane Background (Any) | Base Duration of any non-Instant power is doubled (including maintained powers)
Extra Effort       | Seasoned, AB (Gifted), Focus d6+ | Spend 1 PP for +1 to Focus total; or 3 PP for +2; cannot improve Critical Failures
Gadgeteer          | Seasoned, AB (Weird Science), Weird Science d6+ | Spend up to 3 PP to "jury rig" a device from parts; activates any power of Weird Scientist's Rank or lower (cost 3 PP or less); full turn; Weird Science -2
Holy/Unholy Warrior | Seasoned, AB (Miracles), Faith d6+ | Add +1 to Soak roll total for each PP spent, max +4
Mentalist          | Seasoned, AB (Psionics), Psionics d6+ | +2 to opposed Psionics rolls whether attacking or defending
New Powers         | Novice, Arcane Background (Any) | Learn two new powers; may add new Trapping to known power instead (stackable)
Power Points       | Novice, Arcane Background (Any) | +5 Power Points; may be taken once per Rank (at Legendary: only +2 per selection)
Power Surge        | Wild Card, Novice, AB (Any), arcane skill d8+ | Recover 10 Power Points when Action Card is Joker
Rapid Recharge     | Seasoned, Spirit d6+, AB (Any) | Recharge rate increases to 10 Power Points per hour resting
Improved Rapid Recharge | Veteran, Rapid Recharge  | Recharge 20 Power Points per hour resting
Soul Drain         | Seasoned, AB (Any), arcane skill d10+ | Take a Fatigue level to recover up to 5 PP; may take a second level (to Exhaustion) for 5 more PP; cannot render self Incapacitated; Fatigue from Soul Drain only recovers naturally
Wizard             | Seasoned, AB (Magic), Spellcasting d6+ | Spend 1 extra PP when casting to change power's Trapping on the fly

## Professional Edges
Ace                | Novice, Agility d8+             | Ignore 2 points of penalties to Boating/Driving/Piloting; may Soak vehicle damage with appropriate skill instead of Vigor
Acrobat            | Novice, Agility d8+, Athletics d8+ | Free reroll on Athletics involving balance, tumbling, or grappling (not interrupting, climbing, swimming, or throwing)
Combat Acrobat     | Seasoned, Acrobat               | Attacks against her are at -1 while aware, can move, and not suffering Encumbrance or Minimum Strength penalties
Assassin           | Novice, Agility d8+, Fighting d6+, Stealth d8+ | +2 damage when foe is Vulnerable or attacker has The Drop
Investigator       | Novice, Smarts d8+, Research d8+ | +2 to Research rolls and Notice rolls to search through documents or spot obscured items
Jack-of-All-Trades | Novice, Smarts d10+             | After observing/studying a subject: Smarts roll for d4 in relevant skill (d6 with raise); lasts until attempting a different subject
McGyver            | Novice, Smarts d6+, Notice d8+, Repair d6+ | Improvise a device with Repair roll (one full turn); creates minor explosives, one-shot weapons, etc.; raise creates better versions
Mr. Fix It         | Novice, Repair d8+              | +2 to Repair rolls; with a raise, halves time required
Scholar            | Novice, Research d8+            | Pick one skill (Academics, Battle, Occult, Science, or Smarts-based knowledge); +2 whenever used; may be taken multiple times for different skills
Soldier            | Novice, Strength d6+, Vigor d6+ | Strength treated one die type higher for Encumbrance and Minimum Strength for armor/weapons/equipment (stacks with Brawny); free reroll on Vigor to survive environmental hazards
Thief              | Novice, Agility d8+, Stealth d6+, Thievery d6+ | +1 Athletics to climb in urban areas; +1 Stealth in urban environments; +1 to all Thievery rolls
Woodsman           | Novice, Spirit d6+, Survival d8+ | +2 to Survival rolls and Stealth in the wild (not towns, ruins, or underground)

## Social Edges
Bolster            | Novice, Spirit d8+              | When successfully Testing a foe, may also remove Distracted or Vulnerable from one ally
Common Bond        | Wild Card, Novice, Spirit d8+   | May freely give Bennies to any other character she can communicate with
Connections        | Novice                          | Call on friends for favors once per session (loans, gear, fighters, transport, info, or professional skills); may be taken multiple times for different factions
Humiliate          | Novice, Taunt d8+               | Free reroll when making Taunt rolls
Menacing           | Novice, one of Bloodthirsty/Mean/Ruthless/Ugly | +2 to Intimidation rolls
Provoke            | Novice, Taunt d6+               | Once per turn: with raise on Taunt Test, target suffers -2 to affect any target besides the one who provoked her; lasts until Joker drawn, someone else Provokes, or encounter ends
Rabble-Rouser      | Seasoned, Spirit d8+            | Once per turn: social Test with Intimidation or Taunt against ALL enemies in a Medium Blast Template; each resists separately
Reliable           | Novice, Spirit d8+              | Free reroll on any Support roll
Retort             | Novice, Taunt d6+               | With a raise when resisting Intimidation or Taunt: the foe is Distracted
Streetwise         | Novice, Smarts d6+              | +2 to Intimidation or Persuasion when Networking with shady/criminal elements; +2 Common Knowledge for disreputable topics
Strong Willed      | Novice, Spirit d8+              | +2 when resisting Tests using Smarts or Spirit
Iron Will          | Seasoned, Brave, Strong Willed  | Bonus applies to resisting and recovering from powers; doesn't stack with Brave; doesn't apply to secondary rolls from powers
Work the Room      | Novice, Spirit d8+              | Once per turn: additional skill die when Supporting with Persuasion or Performance; extra die Supports any ally who can see or hear the hero
Work the Crowd     | Seasoned, Work the Room         | As Work the Room but can Support another on up to two Support actions per turn

## Weird Edges
Beast Bond         | Novice                          | May spend own Bennies for any animals under her control (mounts, pets, familiars)
Beast Master       | Novice, Spirit d8+              | Animals won't attack unless provoked; gains loyal animal (Size 0 or less) as Extra; may be taken again to add pets, increase Traits, expand Size limit, or make one pet a Wild Card (Heroic Rank)
Champion           | Novice, Spirit d8+, Fighting d6+ | +2 damage against supernaturally evil (or good) creatures; applies to area attacks, ranged, and powers
Chi                | Veteran, Martial Warrior        | At start of each combat: gain 1 Chi Point to spend on: reroll failed attack, make enemy discard attack and reroll, or add +d6 to a successful unarmed attack; unspent Chi lost at end of combat
Danger Sense       | Novice                          | +2 to Notice to act in first round of Surprise; with raise, starts on Hold; otherwise: Notice -2 (or +2 if already rolled) to detect hazards
Healer             | Novice, Spirit d8+              | +2 to all Healing rolls, magical or mundane
Liquid Courage     | Novice, Vigor d8+               | After drinking: Vigor +1 die type (Toughness too); ignore 1 Wound penalty; Smarts, Agility, and linked skills -1 for one hour; then one level of Fatigue for next four hours
Scavenger          | Novice, Luck                    | Once per encounter: find/remember/dig up a needed piece of equipment, ammunition, or useful device

## Legendary Edges
Followers          | Wild Card, Legendary            | Each time chosen: five Soldier-profile followers join and fight for the hero; Followers Advance like player characters
Professional       | Legendary, max die in Trait     | Raises chosen Trait and its limit one step (e.g., d12+1 becomes d12+2); may be selected once per Trait
Expert             | Legendary, Professional (Trait) | Raises Trait and limit one additional step beyond Professional
Master             | Wild Card, Legendary, Expert (Trait) | Wild Die increases to d10 when rolling the selected Expert Trait
Sidekick           | Wild Card, Legendary            | Gains a Novice Wild Card sidekick with two starting Bennies, complementary abilities; player controls sidekick; sidekick may Advance
Tough as Nails     | Legendary, Vigor d8+            | Can take four Wounds before Incapacitated; maximum Wound penalty is still -3
Tougher than Nails | Legendary, Tough as Nails, Vigor d12+ | Can take five Wounds before Incapacitated; maximum Wound penalty still -3
Weapon Master      | Legendary, Fighting d12+        | Parry +1; bonus damage die for Fighting rolls is d8; must be armed to gain benefits
Master of Arms     | Legendary, Weapon Master        | Parry +1 additional (total +2); Fighting bonus damage die is now d10

## HOMEBREW / SETTING ADDITIONS
# Add custom edges below in the same format:
# Edge Name | Requirements | Description`;

const DEFAULT_POWERS_REF = `# SWADE Powers Reference (Core Rulebook v5.7)
# Format: Power Name | Rank | PP Cost | Range | Duration | Summary
# PP = Power Points required; Range in inches (1"=2 yards); Duration in rounds (unless noted)
# Arcane Backgrounds: Gifted (Focus/Spirit), Magic (Spellcasting/Smarts), Miracles (Faith/Spirit), Psionics (Psionics/Smarts), Weird Science (Weird Science/Smarts)
# Starting PP: Gifted=15, Magic=10, Miracles=10, Psionics=10, Weird Science=15
# Starting Powers: Gifted=1, Magic=3, Miracles=3, Psionics=3, Weird Science=2

## SWADE Core Powers
Arcane Protection | Novice    | PP: 1    | Range: Smarts        | Dur: 5     | Enemy arcane skills targeting hero suffer -2 (-4 with raise); reduces magical damage by like amount
Banish            | Veteran   | PP: 3    | Range: Smarts        | Dur: Instant | Opposed roll vs Spirit to banish extraplanar entities back to their home plane
Barrier           | Seasoned  | PP: 2    | Range: Smarts        | Dur: 5     | Creates a wall 5" long, 1" tall, Hardness 10
Beast Friend      | Novice    | PP: Spec | Range: Smarts        | Dur: 10 min | Controls animals; PP cost depends on animal's size/power
Blast             | Seasoned  | PP: 3    | Range: Smarts×2      | Dur: Instant | 2d6 damage in Medium Blast Template (raise: 3d6)
Blind             | Novice    | PP: 2    | Range: Smarts        | Dur: Instant | -2 (-4 with raise) to all actions for target requiring sight
Bolt              | Novice    | PP: 1    | Range: Smarts×2      | Dur: Instant | 2d6 ranged attack; may cast up to 3 bolts at 1 PP each
Boost/Lower Trait | Novice    | PP: 2    | Range: Smarts        | Dur: 5/Inst | Boost: raise skill or attribute one die type (raise: two); Lower: opposite effect (Instant duration)
Burrow            | Novice    | PP: 2    | Range: Smarts        | Dur: 5     | Target tunnels through earth; may emerge anywhere in range for a free attack
Burst             | Novice    | PP: 2    | Range: Cone          | Dur: Instant | Cone attack deals 2d6 damage (raise: 3d6); Agility roll to avoid
Confusion         | Novice    | PP: 1    | Range: Smarts        | Dur: Instant | Target is Distracted and Vulnerable on failed resist
Damage Field      | Seasoned  | PP: 4    | Range: Smarts        | Dur: 5     | Aura around target causes 2d4 damage to anyone touching her
Darksight         | Novice    | PP: 1    | Range: Smarts        | Dur: 1 hr  | Ignore up to 4 points of illumination penalties (raise: 6 points; effectively darkvision)
Deflection        | Novice    | PP: 3    | Range: Smarts        | Dur: 5     | -2 to all attacks against target (-4 with raise)
Detect/Conceal Arcana | Novice | PP: 2  | Range: Smarts        | Dur: 5/1hr | Detect: reveals all magical auras (Duration 5); Conceal: hides target from detection (Duration 1 hour)
Disguise          | Seasoned  | PP: 2    | Range: Smarts        | Dur: 10 min | Target appears to be a specific person of similar build; observers get opposed Notice vs arcane roll
Dispel            | Seasoned  | PP: 1    | Range: Smarts        | Dur: Instant | Opposed arcane skill roll to negate one ongoing magical effect
Divination        | Heroic    | PP: 5    | Range: Self          | Dur: 5 min | Caster contacts an otherworldly entity and may ask questions; answers may be cryptic
Drain Power Points | Veteran  | PP: 2    | Range: Smarts        | Dur: Instant | Opposed arcane skill roll; success drains d6 PP from target (raise: 2d6)
Elemental Manipulation | Novice | PP: 1  | Range: Smarts        | Dur: 5     | Minor control over one basic element (air/earth/fire/water); small effects only
Empathy           | Novice    | PP: 1    | Range: Smarts        | Dur: 5     | Read target's current emotions; success adds +2 to caster's social rolls vs target for Duration
Entangle          | Novice    | PP: 2    | Range: Smarts        | Dur: Instant | Binds or Entangles target; Strength roll to escape (raise: target is Bound)
Environmental Protection | Novice | PP: 2 | Range: Smarts       | Dur: 1 hr  | Protects target from one hazardous environment (cold, heat, vacuum, pressure, etc.)
Farsight          | Seasoned  | PP: 2    | Range: Smarts        | Dur: 5     | See detail at great distance; halves Range penalties (raise: negates Range penalties entirely)
Fear              | Novice    | PP: 2    | Range: Smarts        | Dur: Instant | Target must make a Fear check; raise adds -2 penalty to the check
Fly               | Veteran   | PP: 3    | Range: Smarts        | Dur: 5     | Target flies at Pace 12" (raise: Pace 24")
Growth/Shrink     | Seasoned  | PP: 2    | Range: Smarts        | Dur: 5     | Changes target's Size by 1 step (raise: 2 steps); affects Strength, Toughness, and chances to hit
Havoc             | Novice    | PP: 2    | Range: Smarts        | Dur: Instant | Targets in Medium Blast Template or Cone are Distracted and may be thrown 1d6" from point of origin
Healing           | Novice    | PP: 3    | Range: Touch         | Dur: Instant | Removes one Wound from target (raise: two Wounds); only works on Wounds less than one hour old
Illusion          | Novice    | PP: 3    | Range: Smarts        | Dur: 5     | Creates imaginary sights and sounds; those who believe it exists react as if it's real
Intangibility     | Heroic    | PP: 5    | Range: Smarts        | Dur: 5     | Target becomes incorporeal; immune to physical attacks; cannot attack physically
Invisibility      | Seasoned  | PP: 5    | Range: Smarts        | Dur: 5     | Target is invisible; -4 to Notice and attack rolls to affect target (-6 with raise)
Light/Darkness    | Novice    | PP: 2    | Range: Smarts        | Dur: 10 min | Creates bright illumination in LBT or extinguishes all light in MBT (raise: one size larger)
Mind Link         | Novice    | PP: 1    | Range: Smarts        | Dur: 30 min | Telepathic mental link within 1 mile (raise: 5 miles); communicate silently
Mind Reading      | Novice    | PP: 2    | Range: Smarts        | Dur: Instant | Opposed arcane skill vs Smarts; success: read surface thoughts; raise: deeper secrets
Mind Wipe         | Veteran   | PP: 3    | Range: Smarts        | Dur: Instant | Opposed arcane skill vs Smarts; success: remove or alter specific memories; raise: larger scope
Object Reading    | Seasoned  | PP: 2    | Range: Touch         | Dur: Special | Vision of last 5 years of object's history (raise: 100 years); takes about 5 minutes
Protection        | Novice    | PP: 1    | Range: Smarts        | Dur: 5     | +2 Armor to target (raise: +4 Armor)
Puppet            | Veteran   | PP: 3    | Range: Smarts        | Dur: 5     | Opposed arcane skill vs Spirit; control target's actions entirely on success
Relief            | Novice    | PP: 1    | Range: Smarts        | Dur: Instant | Remove one of: Fatigue, Shaken, Stunned (raise: also remove Distracted or Vulnerable)
Resurrection      | Heroic    | PP: 30   | Range: Touch         | Dur: Instant | Return the recently dead to life; requires success on arcane skill with -4 penalty
Shape Change      | Novice    | PP: Spec | Range: Self          | Dur: 5     | Caster transforms into another creature; PP cost based on target creature's power/size
Sloth/Speed       | Seasoned  | PP: 2    | Range: Smarts        | Dur: 5/Inst | Speed: double target's Pace for Duration; Sloth: halve target's Pace (Instant effect)
Slumber           | Seasoned  | PP: 2    | Range: Smarts        | Dur: 1 hr  | Opposed arcane skill vs Vigor; success: target falls asleep; raise: deeper sleep, harder to wake
Smite             | Novice    | PP: 2    | Range: Smarts        | Dur: 5     | +2 to weapon damage for Duration (raise: +4); can add elemental Trapping
Sound/Silence     | Novice    | PP: 1    | Range: Smarts×5/Smarts | Dur: 1/5 | Sound: creates sounds at chosen location (Duration 1); Silence: mutes all sound in MBT (Duration 5)
Speak Language    | Novice    | PP: 1    | Range: Smarts        | Dur: 10 min | Target speaks, reads, and writes any one chosen language for Duration
Stun              | Novice    | PP: 2    | Range: Smarts        | Dur: Instant | Target is Stunned on failed resist (cannot act for one round; raise: also Vulnerable)
Summon Ally       | Novice    | PP: Spec | Range: Smarts        | Dur: 5     | Conjures an ally of various types; PP cost based on ally's power level
Telekinesis       | Seasoned  | PP: 5    | Range: Smarts×2      | Dur: 5     | Move objects/people with mind; effective Strength d10 (raise: d12) for manipulation
Teleport          | Seasoned  | PP: 2    | Range: Smarts        | Dur: Instant | Teleport up to 12" distant; raise: 24"; additional targets cost extra PP
Wall Walker       | Novice    | PP: 2    | Range: Smarts        | Dur: 5     | Target can walk on walls and ceilings at half Pace (raise: full Pace)
Warrior's Gift    | Seasoned  | PP: 4    | Range: Smarts        | Dur: 5     | Grant target one Combat Edge they don't have (must meet all requirements)
Zombie            | Veteran   | PP: 3+   | Range: Smarts        | Dur: 1 hr  | Animate and control a corpse; PP cost based on corpse's Size; raise: longer duration

## HOMEBREW / SETTING ADDITIONS
# Add setting-specific powers below in the same format:
# Power Name | Rank | PP: X | Range: Y | Dur: Z | Summary`;

const DEFAULT_ABILITIES_REF = `# SWADE Special Abilities & Monstrous Abilities Reference
# Format: Name | Description (include mechanical effects)
# For AI: each ability goes on its own bullet line under Special Abilities:
#   • Ability Name: Description.
# These apply to creatures and NPCs, not usually to player characters.

## Standard Creature Abilities
Aquatic | Creature cannot drown; swims at full Pace.
Armor +N | Natural armor adds +N to Toughness (write value: "Armor +2: thick scales").
Burrowing (N") | Can tunnel through earth and emerge up to N" away as a free action.
Claws/Bite: Str+dN | Natural weapon dealing Str+dN damage.
Construct | +2 to recover from Shaken; no extra from Called Shots; immune to disease/poison; Wild Cards ignore Wound penalties.
Elemental | No extra damage from Called Shots; Fearless; immune to disease/poison; Wild Cards ignore Wound penalties.
Ethereal | Cannot be harmed by physical attacks; only affected by magic, fire, electricity, or specific Weakness.
Fear | All who see the creature make a Fear check at -N (specify penalty, or 0 for standard check).
Fearless | Immune to Fear and cannot be Intimidated.
Flight: Pace N | Flies at Pace N (specify Climb rating if different from Pace).
Hardy | A second Shaken result does not cause a Wound.
Heavy Armor | Attacks must be Heavy Weapons to cause damage.
Immune (Type) | Immune to a specific damage or effect type.
Infravision | Halves attack penalties for darkness vs warm targets.
Invulnerability | Can be Shaken but never Wounded except by specific Weakness.
Low Light Vision | Ignores Dim and Dark illumination penalties.
Natural Weapon | Creature attacks count as Natural Weapons (not Unarmed).
Night Vision | Ignores ALL illumination penalties including Pitch Darkness.
Paralysis | Victim Shaken/Wounded must make Vigor roll or be paralyzed for 2d6 rounds.
Poison (Type) | Victim Shaken/Wounded makes Vigor roll vs: Knockout=unconscious, Mild=-2 Trait rolls 1hr, Lethal=death.
Reach N | Melee attacks extend N" beyond normal range.
Regeneration (Fast) | Vigor roll each round to heal 1 Wound (raise: 2 Wounds); usually requires a Weakness.
Regeneration (Slow) | Natural healing roll once per day instead of once per 5 days.
Resilient | Can suffer 1 additional Wound before Incapacitation.
Very Resilient | Can suffer 2 additional Wounds before Incapacitation.
Size N | +N to base Toughness from creature's scale. Negative Size = smaller, more evasive.
Undead | +2 Toughness; +2 to recover from Shaken; no extra from Called Shots; immune to disease/poison.
Vulnerability (Type) | Takes +4 damage from specific attack type or has additional penalty on exposure.
Wall Walker | Can move on walls and ceilings at full Pace.
Weakness (Type) | Specific attacks deal extra damage (usually +d6 or forces additional effects; specify).

## Size Reference
Size -4 to -1 | Tiny to Small; -1 Toughness per -1 Size; harder to hit (attackers -1 or more)
Size 0-1 | Human scale; no modifier
Size 2-3 | Large (bear, horse); +2 to +3 Toughness; attackers +1 to hit
Size 4-7 | Very Large (elephant, dragon); +4 to +7 Toughness; attackers +2 to hit; Heavy Armor
Size 8-11 | Huge (giant, whale); attackers +4 to hit; Heavy Armor; usually Fearsome
Size 12+ | Gargantuan; all attacks count as Heavy Weapons; -4 to attack smaller targets

## HOMEBREW / SETTING ADDITIONS
# Add custom creature abilities:
# Ability Name | Description`;

// Default format strings per item type (no built-in data — format guidance only)
export const DEFAULT_ITEMS_FORMAT = {
  weapon:   '# Weapons — Format: Name | Dmg: Str+dX | Range: S/M/L | RoF: N | AP: N | Notes:\n# Example:\nLongsword | Dmg: Str+d8 | Range: — | RoF: 1 | AP: 0 | Notes: Versatile melee weapon.',
  armor:    '# Armor — Format: Name | Armor: N | Min Str: dX | Notes:\n# Example:\nChainmail Shirt | Armor: 3 | Min Str: d8 | Notes: Common infantry torso armor.',
  shield:   '# Shields — Format: Name | Parry: +N | Cover: -N | Min Str: dX | Notes:\n# Example:\nMedium Shield | Parry: +2 | Cover: -2 | Min Str: d6 | Notes: Standard infantry shield.',
  gear:     '# Gear — Format: Name | Weight: N | Cost: N | Notes:\n# Example:\nRope (50ft) | Weight: 5 | Cost: 10 | Notes: Hemp rope, useful for climbing.',
  hindrance:'# Hindrances (Items) — Format: Name | Type: Major/Minor | Description:\n# Example:\nGreedy | Type: Minor | Always seeks personal profit above the group.',
  vehmod:   '# Vehicle Modifications — Format: Name | Cost: N | Notes:\n# Example:\nArmor Plating | Cost: 500 | Notes: +2 Armor to the vehicle total Toughness.',
};

export { DEFAULT_EDGES_REF, DEFAULT_POWERS_REF, DEFAULT_ABILITIES_REF, DEFAULT_SKILLS_REF, DEFAULT_HINDRANCES_REF, DEFAULT_RACES_REF };
