/**
 * Adds status_payloads, accumulator_impulses, passive_hooks to each attack template.
 * Idempotent — safe to re-run (overwrites those three customization keys).
 * Usage: node scripts/augment-attack-catalog-effect-bands.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const catalogPath = path.join(root, 'data/moves/attack_templates.catalog.json');

const br = (min, max, defaultVal = 0, step = 1) => ({
  min,
  max,
  default: defaultVal,
  step,
});

function accum(onHit) {
  return {
    help:
      'Layer-3 impulse budgets per successful hit (resolver clamps vs defender caps). Keys align with GAMEPLAY-SYSTEMS §2.1.',
    on_hit: onHit,
  };
}

const ACC_OFF = accum({
  heat_load: br(0, 22),
  wetness: br(0, 18),
  fracture: br(0, 14),
  corrosion: br(0, 12),
  concussion: br(0, 16),
  laceration: br(0, 18),
  charge_buildup: br(0, 10),
});

const ACC_FIELD = accum({
  heat_load: br(0, 26),
  wetness: br(0, 24),
  fracture: br(0, 9),
  corrosion: br(0, 14),
  concussion: br(0, 12),
  laceration: br(0, 10),
  charge_buildup: br(0, 14),
});

const ACC_REACTIVE = accum({
  heat_load: br(0, 13),
  wetness: br(0, 11),
  fracture: br(0, 9),
  corrosion: br(0, 7),
  concussion: br(0, 10),
  laceration: br(0, 11),
  charge_buildup: br(0, 6),
});

const STATUS_OFF = {
  max_attachments: 2,
  potency: br(0, 1, 0.35, 0.05),
  duration_subticks: br(0, 96, 24, 4),
  proc_chance: br(0, 1, 0.3, 0.05),
  allowed_proc_lanes: ['on_hit', 'on_crit', 'self', 'target'],
  help:
    'Attach status_catalog effects within bands; competes with power/pierce/infusion under loadout budget.',
};

const STATUS_FIELD = {
  max_attachments: 3,
  potency: br(0, 1, 0.28, 0.05),
  duration_subticks: br(0, 180, 48, 6),
  proc_chance: br(0, 1, 0.35, 0.05),
  allowed_proc_lanes: ['on_hit', 'channel_tick', 'self', 'target'],
  help:
    'Field/channel shells emphasize sustained ticks — longer durations; channel_tick lane enabled.',
};

const STATUS_REACTIVE = {
  max_attachments: 2,
  potency: br(0, 1, 0.32, 0.05),
  duration_subticks: br(0, 72, 20, 4),
  proc_chance: br(0, 1, 0.42, 0.05),
  allowed_proc_lanes: ['on_hit', 'on_crit', 'target'],
  help:
    'Reactive timing favors decisive proc windows — resolver binds lanes to counter phase when implemented.',
};

const PASSIVE = {
  allow_slot_passive: true,
  emphasis_tail_budget: br(0, 0.18, 0, 0.02),
  help:
    'Optional passive affinity ε allocated to this slot’s shell — normalized with move emphasis (GAMEPLAY-SYSTEMS §1.3).',
};

const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

data.schema_version = '1.1.0';
data.content_note =
  'Composable attack frames — see docs/ATTACK-CATALOG.md. Templates expose affinity/power/modality bands plus status_payloads, accumulator_impulses, passive_hooks (COMBAT-MODEL §3). Surge frames use delivery_modalities ω; cooldown_scaling derives cooldown_turns from base_power.';

for (const t of data.templates) {
  const cat = t.category;
  if (cat === 'field' || cat === 'channel') {
    t.customization.status_payloads = structuredClone(STATUS_FIELD);
    t.customization.accumulator_impulses = structuredClone(ACC_FIELD);
  } else if (cat === 'reactive') {
    t.customization.status_payloads = structuredClone(STATUS_REACTIVE);
    t.customization.accumulator_impulses = structuredClone(ACC_REACTIVE);
  } else {
    t.customization.status_payloads = structuredClone(STATUS_OFF);
    t.customization.accumulator_impulses = structuredClone(ACC_OFF);
  }
  t.customization.passive_hooks = structuredClone(PASSIVE);
}

fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('Updated', data.templates.length, 'templates; schema_version', data.schema_version);
