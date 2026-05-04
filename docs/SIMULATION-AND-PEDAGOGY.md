# Wildloom — simulation & stealth physics literacy

**Purpose:** Expand **why** Wildloom leans on continuous mathematics—not as trivia or algebra homework—and **how** we encode calculus-flavored dynamics in a **deterministic, server-authoritative** engine players can learn from organically.

**Related:** [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) (pipeline, affinities, accumulators), [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md) §4, [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) (extended accumulators, statuses, stance coupling, biome pedagogy).

---

## 1. Design stance

### 1.1 Physics-informed intuition without encyclopedic physics

- **Goal:** Repeated play builds **correct directional intuition** (rates of change, equilibria, thresholds, coupling—thermal ↔ moisture ↔ conductivity ↔ fracture ↔ **strike modalities** concussive / piercing / slashing).
- **Non-goals:** Pretending we simulate continuum mechanics or Maxwell’s equations in full—the runtime budget is **toy physical fidelity**, deliberately analogous so tuning stays tractable.
- **Pedagogy:** “Advanced inspect” surfaces meters tied to named quantities (`heat_load`, `wetness`, `charge_buildup`). Tooltip tier explains metaphor (“stored thermal stress”), glossary tier ties metaphor to **one sentence** of real-world analogy—not exam preparation.

### 1.2 “Calculus-forward” vs linear bookkeeping

Layer 1 in **full simulation** is a **smooth function** of matchup priors + creature vectors (see [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5.5); **novice HUD** may still show a **single collapsed multiplier** (“sharp / neutral / weak”) computed from the same resolver output—algebraic **lookup-only** charts are a teaching shortcut, not the authority boundary.

- **Accumulators** evolve over subticks as flows (sources − sinks ± coupling).
- **Damage saturation** is a smooth nonlinear map (already in COMBAT-MODEL §5.4).
- **Multi-hit exposure** behaves like integrating an intensity curve against posture.

That stack rewards thinking in **derivatives and elasticities** (“If I push wetness 10% higher, does galvanic spike **endurance loss** rise linearly or bend?”) without forcing symbolic manipulation.

### 1.3 Endurance-first combat (why not “HP”?)

Real organisms usually stop fighting because **they cannot sustain effort**—shock, blood loss, overheating, and neuro-fatigue integrate over time. Wildloom mirrors that in systems language:

- **`stamina`** (stat) fixes how large the battle pool can be; **current endurance** \(S(t)\) is what discrete hits and DoTs erode.
- **Defeat** at \(S \le 0\) is **incapacity** (collapse / cannot continue), which reads more honestly than a detached “HP fatality” bar—lore can still describe lethality without making “hit points” the headline metaphor.
- Teaching payoff: players reason about **rates** (\(\mathrm{d}S/\mathrm{d}t\)) and **impulses** (\(\Delta S\) from a connected strike) the same way physics problems separate continuous flows from sudden kicks.

Full coupled equations and integration contract: [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §6, [`SIMULATION-AND-PEDAGOGY.md`](./SIMULATION-AND-PEDAGOGY.md) §2–§4.

---

## 2. Battle state as a dynamical system

Let \(S_i(t)\) be combatant \(i\)'s **current endurance** (depleted by hits and DoTs; capped by **`stamina`**). Pack Layer 3 scalars into \(\mathbf{u}_i \in \mathbb{R}^k\) (e.g. `fracture`, `heat_load`, `wetness`, `charge_buildup`, `concussion`, `laceration`, …). Pack field scalars into \(\mathbf{f}\).

Between discrete player actions, advance \(S_i\) and \(\mathbf{u}_i\) on the **same** subtick grid ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §6): integrate \(\mathrm{d}S_i/\mathrm{d}t\) alongside \(\mathrm{d}\mathbf{u}_i/\mathrm{d}t\).

\[
\frac{d\mathbf{u}_i}{dt} = \mathbf{g}_i(\mathbf{u}_1,\ldots,\mathbf{u}_n,\mathbf{f},\text{materials},\text{terrain})
\]

\[
\frac{d S_i}{dt} = -\sum_k \mathrm{potency}_{i,k}(\mathbf{u}_i,\ldots) + \mathrm{recovery}_i(S_i,\mathbf{u}_i)
\]

Discrete moves inject **impulses** \(\Delta \mathbf{u}_i\) and \(\Delta S_i\) (from resolved move potency — [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5.9), plus discrete rule firings at Layer 2. Conceptually:

\[
\mathbf{u}_i(t^+) = \mathbf{u}_i(t^-) + \Delta \mathbf{u}_i[\text{hit}] + \int_{t^-}^{t^+} \mathbf{g}_i\, dt,\qquad
S_i(t^+) = S_i(t^-) + \Delta S_i[\text{hit}] + \int_{t^-}^{t^+} \frac{d S_i}{dt}\, dt
\]

**Implementation contract:** Fixed subtick \(\Delta t\) (e.g. `turn_substeps = 10`), **explicit integration** by default for determinism:

\[
\mathbf{u}_i^{n+1} = \mathbf{u}_i^n + \Delta t \cdot \mathbf{g}_i(\mathbf{u}^n,\ldots)
\]

Optional **semi-implicit** or **RK2/RK4** steps live behind a feature flag only if regression tests prove identical seeds across platforms—otherwise stick to explicit Euler for replay fidelity.

---

## 3. Canonical toy flows (author as data, tune coefficients)

These are **templates**—exact coefficients ship from balance JSON.

### 3.1 Thermal storage / Newton-like cooling toward ambient

Let \(H\) be `heat_load`, \(T_a\) ambient normalized temperature, \(\tau\) time scale modulated by `thermal_mass`:

\[
\frac{dH}{dt} = \underbrace{\alpha(\text{Thermal intensity})}_{\text{sources}} - \underbrace{\frac{H - T_a}{\tau(H)}}_{\text{relaxation}}
\]

**Literacy hook:** Hot bodies cool toward environment; large thermal mass slows **both** heating and cooling—players feel “lag” instead of binary burn.

### 3.2 Wetness exchange with humidity & porosity

Let \(W\) be surface wetness, \(h\) field humidity, \(P\) porosity:

\[
\frac{dW}{dt} = \beta_1\, h\, P - \beta_2\, W\, (1 - h) - \beta_3\, \phi(\text{Aero wind})
\]

**Literacy hook:** Moisture doesn’t toggle “on/off”; it **equilibrates** with environment—supports steam / galvanic coupling honestly.

### 3.3 Charge buildup / leaky capacitor analogy

Let \(Q\) be `charge_buildup`, leakage \(\rho\), drive from Galvanic tags:

\[
\frac{dQ}{dt} = \gamma_{\text{in}}(\text{Galvanic flux}) - \rho(\text{conductivity}, W)\, Q
\]

**Literacy hook:** Stored charge bleeds faster when pathways conduct (wetness, terrain)—without claiming real RC networks.

### 3.4 Fracture accumulation & anelastic relaxation

Let \(F\) be `fracture`, strike impulse \(I_{\text{strike}}\), rigidity \(R\):

\[
\frac{dF}{dt} = \eta\, I_{\text{strike}}\, \psi(R) - \lambda\, F
\]

High rigidity raises \(\psi\) (brittle channels crack stress). Relaxation \(\lambda\) models micro-healing / stance recovery—keeps fights from permanent irrelevance.

### 3.5 Concussion / impulse residue (concussive modality hook)

Let \(C\) track neurologically flavored impairment meters (**game abstraction**, not medical realism):

\[
\frac{dC}{dt} = \zeta_{\text{in}}\,\omega_{\mathrm{con}}\!\cdot J_{\mathrm{hit}} - \frac{C}{\tau_C(\text{stamina},\mathrm{initiative})}
\]

\(J_{\mathrm{hit}}\) is proportional to resolved concussive channel potency **before** optional stance shields—authors clamp \(\omega_{\mathrm{con}}\) coupling via Layer 2 to prevent initiative-lock exploits.

**Literacy hook:** Impulses accumulate and **decay**; mitigation stacks damp \(\zeta_{\text{in}}\)—players learn “inertial insult ≠ one-shot abstract HP”; it lingers and couples into **endurance** drain rates.

### 3.6 Laceration / shear bleed driver (slashing modality hook)

Let \(L\) represent opened shear-band severity coupling into existing DoT math (`COMBAT-MODEL` §6):

\[
\frac{dL}{dt} = \xi_{\text{in}}\,\omega_{\mathrm{slas}}\!\cdot \phi(W,P)\, J_{\mathrm{hit}} - \gamma_{\text{clot}}\bigl(M,L\bigr)\, L
\]

\(\phi\) bumps bleed susceptibility when `wetness` \(W\) or `porosity` \(P\) is high—honesty bar: cartoon hemorrhage analog only.

---

## 4. Events, thresholds, and Layer 2 coupling

Continuous flows produce **crossings** (“\(H\) drops below \(H^\*\) while \(W > W^\*\)”). Feed those into Layer 2 predicates **after** subtick integration so ordering is defined:

1. Integrate \(\mathbf{u}\) for \(\Delta t_{\text{sub}}\).
2. Evaluate threshold queues (stable ordering by rule priority).
3. Apply instantaneous rule effects (multipliers, flat damage, impulses).

This avoids ambiguous “same-frame” races between continuous decay and discrete triggers.

---

## 5. Damage pipeline coupling (where calculus meets hits)

Per COMBAT-MODEL §5.7, accumulators **reshape effective stats** inside the saturation path (e.g. fracture reduces effective **physical mitigation** smoothly via \(\tanh\)). More generally:

\[
D_{\text{eff}} = D_{\text{base}} \cdot \prod_j \phi_j(u_j), \quad \phi_j \text{ smooth and bounded}
\]

**Why:** Partial derivatives \(\partial \sigma / \partial D\) and \(\partial D_{\text{eff}} / \partial F\) exist almost everywhere—balance tooling can estimate **local elasticities** (§7).

---

## 6. Multi-hit as discrete sampling of an exposure integral

For hits \(i = 1,\ldots,N\) with exposure \(E(t)\):

\[
\text{bonus}_i \approx 1 + \eta \tanh(E_i), \quad E_{i+1} = E_i + \Delta E(\text{hit}_i, \mathbf{u})
\]

Interpret \(\sum_i \text{damage}_i\) as a **Riemann-like sum** of per-hit intensities modulated by posture—communicates “combo ramps smoothly” without exposing integral notation to players.

---

## 7. Balance tooling: sensitivities & Jacobians (offline)

For scalar KPI \(J\) (expected damage, win-rate surrogate):

\[
\frac{\partial J}{\partial \theta} \approx \text{finite difference or adjoint-lite Monte Carlo}
\]

Where \(\theta\) includes \(\kappa\), pierce \(\lambda_p\), relaxation \(\tau\), chart entries. Surfaces **which knobs bend the curve**—aligned with [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) accessibility-vs-depth goals. Single-hit **elasticities** of the saturation core and **mean damage before floor** (§5.8 in [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md)) complement turn-scale Monte Carlo when you build balance tooling.

---

## 8. UI tiers (must ship alongside complexity)

| Tier | Player sees | Hidden machinery |
|------|-------------|------------------|
| Novice | Chart multiplier + strike/surge chips | Flows run silently |
| Competitor | Tag-trigger callouts + simplified meters | Subtick integration |
| Analyst | Numerical meter values + impulse logs | Full \(\mathbf{g}_i\) contributions split |

Formal calculus courses **never** required; curiosity unlocks depth.

---

## 9. Honesty bar (engineering)

Ship internal docs stating fidelity tier:

- **Tier A:** Smooth nonlinear maps + coupled ODE-like flows + impulses (Wildloom target).
- **Tier B:** Multiphysics FEM / CFD—explicitly out of scope.

Marketing avoids implying laboratory-grade simulation.

---

## Document changelog

| Date | Change |
|------|--------|
| 2026-05-03 | Initial pass: dynamical systems framing, toy flows, integration contract, pedagogy |
| 2026-05-03 | §3.5 concussion flow; §3.6 laceration/bleed driver — ties to strike modalities ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5.4b) |
| 2026-05-03 | Related [`DESIGN-SUPPLEMENT.md`](./DESIGN-SUPPLEMENT.md) for extended accumulators / statuses / biome pedagogy |
| 2026-05-03 | §1.2 Layer 1 described as dynamic \(m_1\) + collapsed UI; aligns with [`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5.5 |
| 2026-05-03 | §7: expectation / elasticity helpers — implement alongside resolver tests when build starts ([`GAMEPLAY-MASTER.md`](./GAMEPLAY-MASTER.md) §5.0 / §5.8). |
