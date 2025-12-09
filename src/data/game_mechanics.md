# Naruto Arena - Complete Game Mechanics Documentation
*Extracted from https://naruto-arena.net/en/the-basics*

---

## Core Game Rules

**Game Type**: Turn-based strategy game

**Team Composition**: 
- Pick a team of **3 ninjas**
- Fight another player's team

**Victory Condition**:
- Reduce your opposition to **0 health points** to win the match

---

## Skill System

### Skill Classes

Based on scraped character data, skills are classified into:

1. **Physical** - Direct damage attacks
2. **Strategic** - Support, buffs, debuffs, protection
3. **Energy** - Chakra-based attacks
4. **Affliction** - Status effects, damage over time
5. **Action** - Special action mechanics

### Skill Execution Types

#### Control Skills
- **Require constant contact** between caster and target
- If contact is broken, the skill will end
- Control skills are **only cast once** at the start when they make contact with the target (works like instants)
- **Special behavior**: If the caster loses ALL self-effects of a control skill (including "This skill can be canceled" text), the skill starts working like an instant skill

#### Instant Skills
- Execute immediately
- Most common skill type in the game

### Special Modifiers

#### Affliction*
- The part of the skill's description followed by a ***** is what makes that skill an affliction skill **in addition to its main class**
- Example: A skill could be "Physical, Affliction*" where the affliction portion is marked with *

#### Instant*
- The part of the skill's description followed by a ***** is **not stopped** by:
  - Caster being stunned
  - Target becoming invulnerable
- This makes certain skill effects bypass normal defensive mechanics

---

## Energy System

Based on scraped character data, the game uses a **5-color energy system**:

| Energy Color | ID | Common Usage |
|--------------|----|--------------|
| **Green** | 0 | Physical skills, basic attacks |
| **Red** | 1 | Offensive/Fire skills |
| **Blue** | 2 | Energy/Chakra skills |
| **White** | 3 | Support/Strategic skills |
| **Black** | 4 | Universal (any energy type) |

### Energy Mechanics
- Skills require specific energy types to activate
- Skills can require **multiple energy** (e.g., "1 blue + 1 black")
- Some skills cost **"none"** (0 energy, free to use)
- Energy is gained each turn (exact rate TBD)

---

## Cooldown System

Skills have cooldown periods after use:

- **None**: No cooldown, can be used every turn
- **1-4 turns**: Skill cannot be reused for X turns after activation
- Cooldowns balance powerful skills (longer cooldown = more powerful)

---

## Battle Mechanics

### Status Effects

From scraped data, we observe:

**Offensive Effects:**
- **Direct Damage**: "deals X damage to one enemy"
- **Stun**: "stuns their skills for X turns" (prevents skill use)
  - Can stun specific skill types: Physical, Strategic, Energy
- **Bonus Damage**: Conditional extra damage under certain conditions

**Defensive Effects:**
- **Invulnerability**: "makes character invulnerable for X turn" (immune to damage)
  - **EXCEPTION**: Skills with Instant* modifier bypass invulnerability for certain effects
- **Damage Reduction**: "gains X points of damage reduction for Y turns"
- **Immunity**: Some skills grant immunity to stun effects

### Skill Interactions

**Breaking Contact (Control Skills):**
- Control skills end if contact between caster and target is broken
- Examples that might break contact: Death, invulnerability, displacement

**Stun Resistance:**
- Some skills provide "ignore all enemy stun effects"
- Example: Sakura's Inner Sakura

**Conditional Bonuses:**
- Skills can deal extra damage when other skills are active
- Example: Naruto's "Uzumaki Naruto Combo" deals +10 damage during "Shadow Clones"

---

## Team Building Strategy

### Energy Management
- Balance energy costs across your 3 ninjas
- Black energy is versatile but limited
- Mix low-cost spam skills with high-cost finishers

### Skill Synergies
Look for characters with:
- **Combo Chains**: Skills that boost each other's effectiveness
- **Stun Chains**: Lock down opponent skills systematically
- **Balanced Offense/Defense**: Mix damage with protection
- **Cooldown Stagger**: Avoid all characters having long cooldowns simultaneously

### Class Balance
- **Physical**: Consistent turn-by-turn damage
- **Strategic**: Team control and protection
- **Energy**: High-burst damage potential
- **Affliction**: Sustained damage and debuffs
- **Action**: Unique mechanics advantages

### Common Patterns (from scraped data)

**Starter Characters:**
- Usually have 1 Green-cost Physical attack (no cooldown)
- 1 Black-cost Strategic buff/defensive skill (4-turn cooldown)
- 1-2 signature skills with moderate costs

**Defensive Skills:**
- "Hide" skills provide 1-turn invulnerability (4-turn cooldown, 1 Black energy)
- Damage reduction buffs typically last 3-4 turns

**Ultimate Skills:**
- Usually require 2+ energy (commonly Blue + Black)
- Often have 1-turn cooldowns
- Deal 40-50 damage or powerful effects

---

## Character Progression

Based on mission data:

**Level Gates**: 1, 6, 11, 16, 21, 26, 31, 36
- Missions unlock characters at specific level requirements
- Higher level = access to more powerful characters

**Character Variants**:
- Base versions (e.g., "Uzumaki Naruto")
- Shippuden versions marked with (S) (e.g., "Uzumaki Naruto (S)")
- Special forms (e.g., "Kyuubi Naruto", "Cursed Seal Sasuke")

---

## Meta Observations

### Energy Cost Patterns
- Green (0): 70%+ of characters have a no-cooldown Green skill
- Black (4): Most common for 4-turn cooldown defensive skills
- Blue (2): Reserved for high-damage "Energy" class skills
- Multi-energy skills: Usually 2 energy, rarely 3+

### Cooldown Distribution
- **No cooldown**: Basic spam skills (usually 1 per character)
- **1 turn**: High-impact skills with quick turnaround
- **2-3 turns**: Moderate power skills
- **4 turns**: Standard for defensive/buff skills

### Skill Count Per Character
- **Average**: 4-5 skills per character
- **Minimum**: 4 skills (basic characters)
- **Maximum**: 8 skills (complex characters like Chiyo)

---

*This documentation is compiled from the official game manual at naruto-arena.net/en/the-basics and verified against scraped character/mission data.*
