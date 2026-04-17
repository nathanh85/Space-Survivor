// ============================================================
// Portrait manifest + character mapping (v0.7.d.1)
// Key format: {character_id}__{expression_key}
// Fallback expression: neutral_2 (every character has it)
// ============================================================
//
// This file is the single source of truth for:
//   1. PORTRAIT_MANIFEST — what PNGs exist on disk
//   2. CHARACTER_MAP     — which portrait actor plays each named character
//
// Tint fields in CHARACTER_MAP are METADATA ONLY in v0.7.d.1 — the
// renderer does not apply them yet. Tint application is deferred to
// a later patch once cutscene scripts are migrated off legacy keys.
// ============================================================

// --- Portrait asset manifest -------------------------------------------------
// Array of { id, expressions, size? } built from the 173 __-format PNGs.
// `size` is only declared when the art departs from the default square.
export const PORTRAIT_MANIFEST = [
  { id: 'demon_female_1', expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'demon_female_2', expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smile_2', 'smirk_2'] },
  { id: 'demon_female_3', expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smirk_2'] }, // missing smile_2
  { id: 'demon_male_1',   expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smile_2', 'smirk_2'] },
  { id: 'demon_male_2',   expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'elf_female_1',   expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'elf_female_2',   expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smile_2', 'smirk_2'] },
  { id: 'elf_female_3',   expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'elf_male_1',     expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smile_2', 'smirk_2'] },
  { id: 'elf_male_2',     expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'human_female_1', expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'human_female_2', expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'human_female_3', expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'human_female_4', expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'human_male_1',   expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'human_male_2',   expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'human_male_3',   expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smile_2', 'smirk_2'] },
  { id: 'human_male_4',   expressions: ['angry', 'neutral_1', 'neutral_2', 'sad', 'shock', 'smile_1', 'smile_2', 'smirk_1', 'smirk_2'] },
  { id: 'human_male_5',   expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smile_2', 'smirk_2'] },
  { id: 'samurai_female_1', expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smile_2', 'smirk_2'] },
  { id: 'viking_3',       expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smile_2', 'smirk_2'] },
  { id: 'viking_female_1', expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smile_2', 'smirk_2'] },
  { id: 'viking_female_2', expressions: ['angry', 'neutral_2', 'sad', 'shock', 'smile_2', 'smirk_2'] },
];

// Internal lookup: id → expressions[]
const _MANIFEST_INDEX = Object.fromEntries(
  PORTRAIT_MANIFEST.map(e => [e.id, e.expressions])
);

export const DEFAULT_EXPRESSION = 'neutral_2';
export const PORTRAIT_PATH = 'assets/portraits/';

// --- Character → portrait actor mapping --------------------------------------
// Named characters in the story point at a portrait `portraitId`. Multiple
// characters can share a portrait actor (e.g. family members) — `tint`
// differentiates them once tinting is wired up.
//
// `unknown` is the fallback entry. Any lookup for a name not in this map
// logs a warning and resolves to `unknown` instead of throwing.
export const CHARACTER_MAP = {
  // --- Leads ----------------------------------------------------------------
  pax:      { portraitId: 'human_male_1',   defaultExpr: 'neutral_2', tint: null },
  pepper:   { portraitId: 'human_female_1', defaultExpr: 'neutral_2', tint: null },

  // --- Family ---------------------------------------------------------------
  mother:   { portraitId: 'human_female_3', defaultExpr: 'neutral_2', tint: null },
  father:   { portraitId: 'human_male_2',   defaultExpr: 'neutral_2', tint: null },

  // --- Law & order ----------------------------------------------------------
  marshal:  { portraitId: 'human_male_4',   defaultExpr: 'neutral_2', tint: null },
  judge:    { portraitId: 'human_male_3',   defaultExpr: 'neutral_2', tint: null },
  commander:{ portraitId: 'human_male_5',   defaultExpr: 'neutral_2', tint: null },

  // --- Frontier cast --------------------------------------------------------
  grix:     { portraitId: 'demon_male_2',   defaultExpr: 'smirk_2',   tint: null },
  vera:     { portraitId: 'elf_female_1',   defaultExpr: 'neutral_2', tint: null },
  informant:{ portraitId: 'elf_male_2',     defaultExpr: 'smirk_1',   tint: null },
  miner:    { portraitId: 'viking_3',       defaultExpr: 'neutral_2', tint: null },
  smuggler: { portraitId: 'human_male_2',   defaultExpr: 'smirk_2',   tint: 0xd9c48c }, // share actor w/ father, differentiated by tint later
  mechanic: { portraitId: 'human_female_2', defaultExpr: 'neutral_2', tint: null },

  // --- Rift / antagonists ---------------------------------------------------
  demon_matron: { portraitId: 'demon_female_1', defaultExpr: 'smirk_2', tint: null },
  ronin:    { portraitId: 'samurai_female_1', defaultExpr: 'neutral_2', tint: null },

  // --- Fallback -------------------------------------------------------------
  unknown:  { portraitId: 'human_male_1',   defaultExpr: 'neutral_2', tint: null },
};

// --- Public API --------------------------------------------------------------

/** Get all portrait actor IDs in the manifest. */
export function getCharacterIds() {
  return PORTRAIT_MANIFEST.map(e => e.id);
}

/** Get available expressions for a portrait actor. */
export function getExpressions(portraitId) {
  return _MANIFEST_INDEX[portraitId] || [];
}

/**
 * Resolve a portrait actor + expression into a Phaser texture key.
 * Falls back to neutral_2 if the requested expression doesn't exist.
 * Returns null if the portraitId itself is unknown.
 */
export function portraitKey(portraitId, expression) {
  const exprs = _MANIFEST_INDEX[portraitId];
  if (!exprs) return null;
  const expr = exprs.includes(expression) ? expression : DEFAULT_EXPRESSION;
  return `${portraitId}__${expr}`;
}

/** Back-compat alias — old code calls this. */
export function getPortraitKey(portraitId, expression) {
  return portraitKey(portraitId, expression);
}

/**
 * Resolve a named character + expression into a Phaser texture key.
 * Logs a warning and returns the `unknown` fallback if the character
 * is not in CHARACTER_MAP — typos surface loudly instead of silently
 * rendering nothing.
 */
export function characterPortraitKey(characterName, expression) {
  let entry = CHARACTER_MAP[characterName];
  if (!entry) {
    console.warn(`[PORTRAIT] Unknown character "${characterName}" — falling back to "unknown"`);
    entry = CHARACTER_MAP.unknown;
  }
  const expr = expression || entry.defaultExpr;
  return portraitKey(entry.portraitId, expr);
}

/**
 * Load every portrait PNG listed in the manifest into a Phaser scene.
 * Call from PreloadScene's preload().
 */
export function loadPortraits(scene) {
  let count = 0;
  for (const { id, expressions } of PORTRAIT_MANIFEST) {
    for (const expr of expressions) {
      const key = `${id}__${expr}`;
      scene.load.image(key, `${PORTRAIT_PATH}${key}.png`);
      count++;
    }
  }
  console.log(`[PORTRAIT] Queued ${count} portraits for ${PORTRAIT_MANIFEST.length} actors`);
}
