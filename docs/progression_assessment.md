# Analysis Engine Progression Assessment

## Snapshot of previous verification rounds
- **V2 evidence detection** correctly captured anti-tank and punisher tags and surfaced an anti-synergy warning for Ino (S) + Shikamaru, but the approach was mostly raw attribute counting with little rationale. 【F:v2_verification_results.txt†L1-L37】
- **V3 evidence-based outputs** improved interpretability by grounding strengths and strategies in specific skills (crowd control and trap & punish sources) yet remained narrow in scope. 【F:v3_verification_results.txt†L1-L16】
- **V4 energy-aware scoring** added energy economy insights and archetype detection but failed to flag the expected red flags for expensive or rigid teams and produced an inflated synergy score with no warnings. 【F:v4_verification_results.txt†L3-L27】

## Concerns with the current analysis module
1. **Negative-signal blind spot**: Test Case 2 (Expensive/Rigid Team) returns no warnings and a neutral score (50) instead of highlighting high-cost bottlenecks, undermining trust in risk detection. 【F:v4_verification_results.txt†L13-L18】
2. **Downside weighting is too light**: The same case’s score sits far above a penalized baseline despite zero strengths or mitigation traits, suggesting the scoring model lacks asymmetry for risk. 【F:v4_verification_results.txt†L13-L18】
3. **Explanations are incomplete**: While V3 added evidence strings, the current version doesn’t attach explanations to strengths or missing warnings, making outputs harder to audit or debug. 【F:v3_verification_results.txt†L1-L16】【F:v4_verification_results.txt†L3-L27】
4. **Energy-risk heuristics are shallow**: V4 recognizes low-cost flexibility but doesn’t track burst costs, color locks, or cooldown clustering that typically define expensive/rigid lineups. 【F:v4_verification_results.txt†L13-L18】

## Actionable remediation plan
- **Introduce asymmetric scoring penalties**
  - Penalize average cost thresholds, single-color reliance, and missing mitigation (refunds, generation, shared costs) before granting neutral scores.
  - Add floor scores for “no strengths + no mitigation” cases to avoid false-neutral outputs.
- **Expand negative-signal detection**
  - Detect burst turns that exceed available energy, multi-turn color locks, and overlapping long cooldowns.
  - Emit explicit warnings naming the contributing skills and their costs to restore V3-style evidence strings.
- **Enrich rationale logging**
  - Attach per-skill evidence to both strengths and warnings, including energy math (e.g., total cost per turn) and cooldown timing that triggered the flag.
  - Persist these rationales in the verification outputs to make regression debugging faster.
- **Broaden archetype coverage and safeguards**
  - Add checks for setup/achievement chains that require uninterrupted turns and flag when protection (invulnerability/immunity) is absent.
  - Note when transformations or stateful skills create hard locks that worsen energy rigidity.

## Verification and success criteria
- **Automated checks**: Add targeted test cases for expensive/rigid teams that assert the presence of “High Energy Requirements” and “Energy Bottleneck” warnings along with a reduced score (<30). 【F:v4_verification_results.txt†L13-L18】
- **Evidence requirements**: Treat any warning or strength as invalid if it lacks at least one cited skill name or effect string, mirroring V3’s evidence format. 【F:v3_verification_results.txt†L1-L16】
- **Regression guardrails**: Require that energy-efficient teams maintain high scores and no false warnings to ensure new penalties don’t overcorrect. 【F:v4_verification_results.txt†L4-L12】
