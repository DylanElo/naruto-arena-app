# Naruto Arena - Complete Game Mechanics Documentation

*Compiled from official game manual (naruto-arena.net), verified against naruto-unison implementation, and updated with observed gameplay patterns.*

---

## Core Game Rules

**Game Type**: Turn-based strategy game

**Team Composition**: 
- Pick a team of **3 ninjas**
- Fight another player's team of 3

**Victory Condition**:
- Reduce all 3 enemy ninjas to **0 health points** to win

**Health**:
- Each ninja has **100 health points** by default
- Health cannot exceed starting maximum

---

## Chakra (Energy) System

The game uses a **5-type chakra system**, which maps to our color coding:

| Chakra Type | Color Code | Common Usage |
|-------------|------------|--------------|
| **Bloodline** (Blood) | Red | Clan techniques, Kekkei Genkai |
| **Genjutsu** (Gen) | White | Mental/illusion skills |
| **Ninjutsu** (Nin) | Blue | Chakra-based attacks |
| **Taijutsu** (Tai) | Green | Physical attacks |
| **Random** (Rand) | Black/Any | Universal, can substitute any type |

### Chakra Mechanics

- Each team gains chakra at the start of their turn
- **Chakra generation**: 1 chakra per living ninja × 3 ninjas = 3 chakra per turn (normally)
- **Random chakra** can substitute for any specific type when paying costs
- Some skills **steal** or **absorb** enemy chakra
- Some skills **grant** additional chakra to allies

### Chakra Cost Examples
- `[Tai]` = 1 Taijutsu chakra
- `[Nin, Rand]` = 1 Ninjutsu + 1 Random chakra
- `[Blood, Blood]` = 2 Bloodline chakra
- `[Gen, Gen, Rand]` = 2 Genjutsu + 1 Random chakra

---

## Skill System

### Skill Classes (Primary)

These define the *kind* of skill:

| Class | Description |
|-------|-------------|
| **Physical** | Direct melee combat, bodyweight attacks |
| **Chakra** | Chakra-based energy attacks |
| **Mental** | Psychological effects, genjutsu |
| **Summon** | Summoning jutsu |

### Skill Range

| Range | Description |
|-------|-------------|
| **Melee** | Close-range, can be blocked by Physical invulnerability |
| **Ranged** | Long-range, cannot be avoided by close-range defenses |

### Special Skill Modifiers

| Modifier | Description |
|----------|-------------|
| **Bypassing** | Ignores invulnerability (but not damage reduction) |
| **Invisible** | Effect is hidden from the enemy until triggered |
| **Soulbound** | Effect ends if the caster dies |
| **Nonstacking** | Multiple uses don't stack, just refresh duration |
| **Extending** | Adds duration instead of refreshing |
| **Uncounterable** | Cannot be countered |
| **Unreflectable** | Cannot be reflected |
| **Unremovable** | Cannot be removed/cleansed |

### Skill Duration Types

| Type | Behavior |
|------|----------|
| **Instant** | Executes immediately, one-time effect |
| **Action** | Repeats each turn for the duration |
| **Control** | Requires maintaining "contact" with target; breaks if interrupted |

---

## Damage System

### Damage Types

| Type | Blocked By | Notes |
|------|------------|-------|
| **Normal Damage** | Defense, Invulnerability, Damage Reduction | Standard attacks |
| **Piercing Damage** | Defense only (ignores DR) | Bypasses damage reduction |
| **Affliction Damage** | Nothing (ignores both) | Cannot be reduced or blocked |

### Damage Formula

```
Final Damage = Base × (1 + Strengthen% - Weaken%) + Strengthen_Flat - Weaken_Flat
             → then modified by target's Reduce/Bleed effects
             → then absorbed by Defense (destructible)
             → finally applied to Health
```

**Special Cases**:
- **Piercing**: Skips the Reduce step (but not Defense)
- **Affliction**: Skips both Reduce AND Defense; applies directly to Health
- **Threshold**: If base damage ≤ threshold, damage is nullified entirely

### Defense Types

| Type | Description |
|------|-------------|
| **Destructible Defense** | HP-like shield that absorbs damage before health |
| **Damage Reduction (DR)** | Flat amount subtracted from incoming damage |
| **Invulnerability** | Complete immunity to certain skill classes |
| **Barrier** | Defense on the *caster* that absorbs outgoing damage |

---

## Status Effects (Complete Taxonomy)

### Helpful Effects (Buffs)

| Effect | Description |
|--------|-------------|
| **Absorb** | Gain chakra when targeted by enemy skills |
| **AntiChannel** | Ignore damage from ongoing channel effects |
| **AntiCounter** | Skills cannot be countered or reflected |
| **Bless** | Adds bonus to healing skills |
| **Boost** | Multiplies effects received from allies |
| **Build** | Adds to destructible defense skills |
| **Bypass** | All skills ignore invulnerability |
| **DamageToDefense** | Convert incoming damage to defense |
| **Duel** | Invulnerable to everyone except one target |
| **Endure** | Health cannot drop below 1 |
| **Enrage** | Ignore harmful status effects |
| **Focus** | Immune to stuns and disabling effects |
| **Heal** | Restore health each turn |
| **Invulnerable** | Immune to certain skill classes |
| **Limit** | Cap maximum damage received |
| **Nullify** | Ignore enemy skills (but still targetable) |
| **Pierce** | All damage becomes piercing |
| **Redirect** | Redirect incoming skills to another target |
| **Reduce** | Reduce damage received (flat or %) |
| **Reflect** | Reflect the first harmful skill back |
| **ReflectAll** | Continuously reflect a class of skills |
| **Strengthen** | Deal additional damage |
| **Threshold** | Nullify damage below a certain amount |

### Harmful Effects (Debuffs)

| Effect | Description |
|--------|-------------|
| **Afflict** | Take affliction damage each turn |
| **Alone** | Cannot be targeted by allies |
| **Bleed** | Take additional damage from attacks |
| **Block** | Treats a target as invulnerable to you |
| **BlockAllies** | Cannot affect allies |
| **BlockEnemies** | Cannot affect enemies |
| **Disable** | Prevents applying certain effects |
| **Exhaust** | Skills cost 1 additional random chakra |
| **Expose** | Cannot reduce damage or become invulnerable |
| **NoIgnore** | Cannot ignore harmful effects (counters Enrage) |
| **Plague** | Cannot be healed or cured |
| **Restrict** | AoE attacks must target a single enemy |
| **Reveal** | Invisible effects become visible to enemies |
| **Seal** | Ignore helpful status effects |
| **Share** | Damage received is also dealt to an ally |
| **Silence** | Cannot cause non-damage effects |
| **Snare** | Increase skill cooldowns |
| **Stun** | Disable skills of a certain class |
| **Swap** | Skills target opposite team |
| **Taunt** | Can only affect one target |
| **Throttle** | Applied effects last fewer turns |
| **Uncounter** | Cannot use counters or reflects |
| **Undefend** | Cannot benefit from destructible defense |
| **Unreduce** | Reduce effectiveness of damage reduction |
| **Weaken** | Deal less damage |

### Stun Types

Stuns can target specific skill classes:

| Stun Type | Disables |
|-----------|----------|
| **Stun All** | All skills |
| **Stun Physical** | Physical skills only |
| **Stun Mental** | Mental skills only |
| **Stun Chakra** | Chakra skills only |
| **Stun NonMental** | All except mental skills |
| **Stun NonPhysical** | All except physical skills |

---

## Cooldown System

| Cooldown | Description |
|----------|-------------|
| **None (0)** | Usable every turn |
| **1 turn** | Usable every other turn |
| **2-3 turns** | Moderate cooldown |
| **4+ turns** | Long cooldown (usually powerful skills) |

### Cooldown Modifiers
- **Snare**: Increases cooldowns by X turns
- **Cooldown Reduction**: Some skills reduce their own cooldown

---

## Advanced Mechanics

### Trigger System

Certain effects trigger on specific events:

| Trigger | When It Fires |
|---------|---------------|
| **OnDamage** | When the ninja deals damage |
| **OnDamaged** | When the ninja takes damage |
| **OnHarm** | When using any harmful skill |
| **OnCounter** | When countered |
| **OnReflect** | When reflected |
| **OnDeath** | When dying (can trigger resurrection) |
| **OnRes** | When resurrecting |

### Bombs

Some effects have "bombs" - actions that trigger when the effect expires:

| Bomb Type | When It Fires |
|-----------|---------------|
| **Remove** | When effect is removed early |
| **Expire** | When effect naturally ends |
| **Done** | When turn processing completes |

### Control Skills

Control skills maintain "contact" between caster and target:
- If contact is broken (caster dies, target becomes invulnerable), the skill ends
- Control skills only apply their effect once at the start
- Breaking a control skill removes its ongoing effects

---

## Team Building Strategy

### Energy Management
- Balance chakra costs across your 3 ninjas
- Random chakra is versatile but less specific
- Mix low-cost spam skills with high-cost finishers
- Consider chakra stealing/denial for disruption

### Role Composition

| Role | Contribution |
|------|--------------|
| **DPS** | Consistent or burst damage output |
| **Tank** | Defense, DR, destructible defense |
| **Support** | Healing, cleansing, ally buffs |
| **Control** | Stuns, energy denial, cooldown manipulation |

### Synergy Types

| Synergy | Example |
|---------|---------|
| **Combo Skills** | Skills that deal bonus damage during other skills |
| **Mark + Payoff** | Apply debuff, then exploit it for damage |
| **Stun Chain** | Combine stuns to lock enemies |
| **Sustain** | Healing + damage reduction for survivability |
| **Burst** | Stack damage buffs for one-turn kills |

---

## Meta Observations

### Common Patterns

**Standard Kit (4 skills)**:
1. **Basic Attack**: Low/no cooldown, moderate damage
2. **Signature Move**: Higher damage, 1-2 turn cooldown
3. **Utility Skill**: Buff, debuff, or control effect
4. **Defense/Invuln**: 1-turn invulnerability, 4-turn cooldown

### Energy Cost Distribution
- `[Tai]`: Most common for basic attacks
- `[Nin, Rand]` or `[Gen, Rand]`: Common for signature moves
- `[Rand]` alone: Common for utility/buffs
- 3+ chakra: Reserved for powerful ultimates

### Damage Benchmarks
- **15-20**: Basic attacks
- **25-35**: Standard damage skills
- **40-50**: High damage / ultimate skills
- **60+**: Rare, usually conditional or high cost

---

*This documentation is compiled from the official game manual, the naruto-unison Haskell implementation, and verified against live gameplay observations.*
