/**
 * Deterministic Wildloom species catalog — 100 lines × 3 stages.
 * Run: node scripts/gen-species-catalog.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'species', 'catalog.json');

const AFFINITIES = [
  'thermal',
  'cryo',
  'aqueous',
  'galvanic',
  'mineral',
  'flora',
  'aero',
  'luminous',
  'void',
  'sonic',
  'corrosive',
  'plasmic',
];

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function slugify(...parts) {
  return parts
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** 10×10 grid → 100 unique two-word zenith titles */
const ZENITH_A = [
  'ash',
  'tide',
  'storm',
  'rime',
  'lux',
  'void',
  'root',
  'ore',
  'arc',
  'gale',
];
const ZENITH_B = [
  'mantle',
  'glass',
  'rift',
  'loom',
  'crest',
  'fold',
  'mesh',
  'vault',
  'wake',
  'spire',
];

const PREFIX = {
  thermal: ['ember', 'cinder', 'magma', 'scald', 'tinder', 'pyre', 'ash', 'crucible', 'smelt', 'bloomheat'],
  cryo: ['rime', 'frost', 'glaci', 'shard', 'hoar', 'borea', 'cryo', 'sleet', 'perma', 'chill'],
  aqueous: ['brine', 'tide', 'kelp', 'ripple', 'abyss', 'lagoon', 'spray', 'murk', 'reef', 'plank'],
  galvanic: ['arc', 'volta', 'spark', 'relay', 'charge', 'galv', 'storm', 'pulse', 'amp', 'ion'],
  mineral: ['grani', 'ore', 'shardrock', 'basalt', 'feld', 'talc', 'silica', 'lime', 'karst', 'agate'],
  flora: ['spore', 'moss', 'bloom', 'root', 'verd', 'mycel', 'thorn', 'petal', 'canopy', 'vine'],
  aero: ['gale', 'strato', 'zephyr', 'vortex', 'nimbus', 'shear', 'cycl', 'draft', 'alto', 'vent'],
  luminous: ['lux', 'helio', 'prism', 'gleam', 'radi', 'phos', 'aether', 'beam', 'uv', 'corona'],
  void: ['umbral', 'sink', 'null', 'gravit', 'vacuum', 'eclipse', 'abyssal', 'fold', 'singul', 'deep'],
  sonic: ['echo', 'reson', 'chord', 'timbre', 'wavefront', 'harmonic', 'cavity', 'pulseband', 'phonon', 'clang'],
  corrosive: ['caust', 'vitri', 'etch', 'chelate', 'lye', 'acid', 'oxid', 'ionate', 'strip', 'fluxbite'],
  plasmic: ['nova', 'chromo', 'sheath', 'afterflare', 'torchveil', 'ionwake', 'fusor', 'arcjet', 'corbel', 'flare'],
};

const SUFFIX_S1 = ['ling', 'mite', 'let', 'pod', 'wisp', 'cub', 'nymph', 'seed', 'mite', 'sprite'];
const MID_S2 = ['thorn', 'gleam', 'quill', 'mantle', 'ridge', 'loom', 'shard', 'wing', 'crest', 'wake'];

const HABITATS = [
  'volcanic shelves',
  'tundra talus',
  'deep trenches',
  'salt flats',
  'thunderhead fronts',
  'crystalline caverns',
  'ancient rainforest',
  'near-vacuum ridges',
  'prismatic dunes',
  'neutral mesas',
  'urban runoff zones',
  'karst sinks',
  'magma chambers',
  'coastal surge pools',
];

function emphasis(primary, secondary, rng) {
  const e = {};
  e[primary] = 0.42 + rng() * 0.28;
  if (secondary) {
    e[secondary] = 0.22 + rng() * 0.22;
  }
  const others = AFFINITIES.filter((a) => a !== primary && a !== secondary);
  let rest = 1 - Object.values(e).reduce((s, v) => s + v, 0);
  while (rest > 0.001 && others.length) {
    const a = pick(rng, others);
    const add = Math.min(rest * (0.25 + rng() * 0.55), rest);
    e[a] = (e[a] ?? 0) + add;
    rest -= add;
  }
  const sum = Object.values(e).reduce((s, v) => s + v, 0);
  for (const k of Object.keys(e)) e[k] = Math.round((e[k] / sum) * 1000) / 1000;
  return e;
}

function blurb(primary, habitat, rng) {
  const verbs = ['Channels', 'Stores', 'Dissipates', 'Amplifies', 'Harvests', 'Routes', 'Shields', 'Bleeds off'];
  const nouns = {
    thermal: 'thermal stress',
    cryo: 'latent cold',
    aqueous: 'osmotic gradients',
    galvanic: 'charge shells',
    mineral: 'lattice strain',
    flora: 'metabolic surplus',
    aero: 'pressure seams',
    luminous: 'photon coherence',
    void: 'vacuum folds',
    sonic: 'standing waves',
    corrosive: 'redox fronts',
    plasmic: 'sheath turbulence',
  };
  return `${pick(rng, verbs)} ${nouns[primary]} across ${habitat}; each instance rolls unique stats and materials at spawn.`;
}

function generate() {
  const rng = mulberry32(0x57696c646c6f6f6d);
  const species = [];
  const usedSlugs = new Set();

  for (let n = 1; n <= 100; n++) {
    const i = n - 1;
    const row = Math.floor(i / 10);
    const col = i % 10;
    const zenithName = `${cap(ZENITH_A[row])} ${cap(ZENITH_B[col])}`;
    let slug = slugify(ZENITH_A[row], ZENITH_B[col]);
    let dup = 0;
    while (usedSlugs.has(slug)) {
      dup++;
      slug = `${slug}_${dup}`;
    }
    usedSlugs.add(slug);

    const primary = AFFINITIES[i % AFFINITIES.length];
    let secondary = AFFINITIES[(i + 3) % AFFINITIES.length];
    if (secondary === primary) secondary = AFFINITIES[(i + 5) % AFFINITIES.length];
    const secondaryOrNull = i % 7 === 0 ? null : secondary;

    const pre = pick(rng, PREFIX[primary]);
    const s1 = `${cap(pre)}${pick(rng, SUFFIX_S1)}`.replace(/([a-z])([A-Z])/g, '$1$2');
    const s2 = `${cap(pre)}${pick(rng, MID_S2)}`;

    const habitat = pick(rng, HABITATS);
    const emph = emphasis(primary, secondaryOrNull, rng);

    species.push({
      id: slug,
      catalog_number: n,
      name: zenithName,
      stages: [
        { stage: 1, code: 'morph', name: s1 },
        { stage: 2, code: 'ascension', name: s2 },
        { stage: 3, code: 'zenith', name: zenithName },
      ],
      primary_affinity: primary,
      secondary_affinity: secondaryOrNull,
      affinity_emphasis_hint: emph,
      habitat,
      blurb: blurb(primary, habitat, rng),
      species_tags: [],
    });
  }

  return {
    $schema: './species.schema.json',
    schema_version: '1.0.0',
    content_note:
      'One hundred species lines (Wildloom). Identity/names/stages only — combat stats and affinity_emphasis roll per instance (TECHNICAL-DESIGN §1). affinity_emphasis_hint and primary/secondary are dex/UI seeds, not authoritative builds.',
    species_count: species.length,
    species,
  };
}

mkdirSync(dirname(OUT), { recursive: true });
const catalog = generate();
writeFileSync(OUT, JSON.stringify(catalog, null, 2), 'utf8');
console.log(`Wrote ${catalog.species_count} species → ${OUT}`);
