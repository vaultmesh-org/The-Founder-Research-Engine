/**
 * Hashing utilities for v0.2 - BLAKE3-native
 *
 * Implements:
 * - BLAKE3 hashing (WASM-backed)
 * - Prompt normalization (per specs/PROMPT_NORMALIZATION.md)
 * - Content canonicalization
 * - Stable stringification
 */

/**
 * Prompt normalization spec version
 * @see specs/PROMPT_NORMALIZATION.md
 */
export const PROMPT_NORM_SPEC_VERSION = '1.0';

// Dynamic import to handle Node.js vs browser environments
let blake3Hash = null;

/**
 * Initialize BLAKE3 (WASM)
 * Handles both browser and Node.js environments
 */
export async function initBlake3() {
  if (!blake3Hash) {
    try {
      // Try browser import first (for Vite bundler)
      const mod = await import('blake3-wasm');
      blake3Hash = mod.hash;
    } catch (e) {
      // Fallback for different import patterns
      console.warn('blake3-wasm import warning:', e.message);
      throw new Error('Failed to initialize blake3-wasm');
    }
  }
  return blake3Hash;
}

/**
 * BLAKE3 hash of content (primary hash function)
 * @param {string|object} content - Content to hash
 * @returns {Promise<string>} Hex-encoded BLAKE3 hash
 */
export async function blake3(content) {
  await initBlake3();

  const text = typeof content === 'string' ? content : stableStringify(content);
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const hashResult = blake3Hash(data);
  return Array.from(hashResult)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * BLAKE3 hash of raw bytes (for Merkle tree and explicit byte operations)
 * Rule 1: Hash deterministic bytes directly
 * @param {Uint8Array} uint8array - Raw bytes to hash
 * @returns {Promise<string>} Hex-encoded BLAKE3 hash (lowercase, 64 chars)
 */
export async function blake3Bytes(uint8array) {
  await initBlake3();
  const hashResult = blake3Hash(uint8array);
  return Array.from(hashResult)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Short BLAKE3 hash (first 12 chars) for stable keys
 */
export async function blake3Short(content) {
  const fullHash = await blake3(content);
  return fullHash.slice(0, 12);
}

/**
 * SHA-256 fallback (for compatibility)
 */
export async function sha256(content) {
  const text = typeof content === 'string' ? content : stableStringify(content);
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Canonicalize JSON for deterministic hashing
 *
 * Rules:
 * - Sort object keys recursively
 * - Normalize strings (trim, newlines)
 * - Remove volatile fields
 */
export function canonicalizeJson(obj, { volatilePaths = [] } = {}) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => canonicalizeJson(item, { volatilePaths }));
  }

  if (typeof obj === 'object') {
    const canonical = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      // Skip volatile fields
      if (volatilePaths.includes(key)) continue;

      canonical[key] = canonicalizeJson(obj[key], { volatilePaths });
    }

    return canonical;
  }

  if (typeof obj === 'string') {
    return normalizeString(obj);
  }

  return obj;
}

/**
 * Normalize string for hashing
 * - Normalize newlines to \n
 * - Trim trailing whitespace per line
 * - Trim leading/trailing overall
 */
export function normalizeString(str) {
  return str
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/[ \t]+\n/g, '\n')       // Remove trailing spaces on lines
    .trim();                          // Trim overall
}

/**
 * Stable JSON stringify (deterministic key order)
 */
export function stableStringify(obj) {
  if (obj === null || obj === undefined) {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const items = obj.map(item => stableStringify(item));
    return '[' + items.join(',') + ']';
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => {
      const value = stableStringify(obj[key]);
      return `"${key}":${value}`;
    });
    return '{' + pairs.join(',') + '}';
  }

  return JSON.stringify(obj);
}

/**
 * Compute prompt hash (text-only, normalized)
 *
 * Canonical format:
 * <SYSTEM>\n{system}\n</SYSTEM>\n
 * <DEVELOPER>\n{developer}\n</DEVELOPER>\n
 * <PHASE>\n{phase}\n</PHASE>\n
 */
export async function computePromptHash(systemPrompt, phasePrompt, developerPrompt = '') {
  const canonical =
    `<SYSTEM>\n${normalizePromptText(systemPrompt)}\n</SYSTEM>\n` +
    `<DEVELOPER>\n${normalizePromptText(developerPrompt)}\n</DEVELOPER>\n` +
    `<PHASE>\n${normalizePromptText(phasePrompt)}\n</PHASE>\n`;

  return blake3(canonical);
}

/**
 * Normalize prompt text (whitespace + unicode)
 *
 * Rules:
 * 1. Normalize newlines: \r\n → \n
 * 2. Trim leading/trailing whitespace
 * 3. Collapse trailing spaces on each line
 * 4. Collapse 4+ consecutive newlines to 3
 * 5. Unicode NFC normalization
 */
export function normalizePromptText(text) {
  if (!text) return '';

  return text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/[ \t]+\n/g, '\n')       // Remove trailing spaces
    .replace(/\n{4,}/g, '\n\n\n')     // Collapse 4+ newlines to 3
    .trim()                           // Trim leading/trailing
    .normalize('NFC');                // Unicode normalization
}

/**
 * Compute inputs hash from CONTENT HASHES (not IDs)
 *
 * Rule 1: Hash deterministic bytes (stableStringify → UTF-8 → blake3)
 * Rule 3: Code-unit sorting (not localeCompare)
 *
 * @param {Array} sources - Full source objects with source_id and hashes.blake3
 * @param {Array} artifacts - Full artifact objects with artifact_id and hashes.content_hash
 * @returns {Promise<string>} Hex-encoded BLAKE3 hash
 */
export async function computeInputsHash(sources, artifacts) {
  // Build canonical payload with content hashes (not just IDs)
  const canonical = {
    sources: (sources || [])
      .map(s => ({ source_id: s.source_id, hash: s.hashes?.blake3 || '' }))
      .sort((a, b) => (a.source_id < b.source_id ? -1 : a.source_id > b.source_id ? 1 : 0)),
    artifacts: (artifacts || [])
      .map(a => ({ artifact_id: a.artifact_id, hash: a.hashes?.content_hash || '' }))
      .sort((a, b) => (a.artifact_id < b.artifact_id ? -1 : a.artifact_id > b.artifact_id ? 1 : 0))
  };

  // Rule 1: stableStringify → UTF-8 bytes → blake3
  const json = stableStringify(canonical);
  const bytes = new TextEncoder().encode(json);
  return blake3Bytes(bytes);
}

/**
 * Compute run hash (includes execution context)
 *
 * Includes:
 * - schema_version
 * - pack_id, phase_id, iteration
 * - engine params (model, temperature, max_tokens)
 * - prompt_hash
 * - inputs_hash
 */
export async function computeRunHash(runData) {
  const payload = {
    schema_version: '0.2.0',
    pack_id: runData.pack_id,
    phase_id: runData.phase_id,
    iteration: runData.iteration,
    engine: {
      provider: runData.engine.provider,
      model: runData.engine.model,
      temperature: runData.engine.temperature,
      max_tokens: runData.engine.max_tokens
    },
    hashes: {
      inputs_hash: runData.hashes.inputs_hash,
      prompt_hash: runData.hashes.prompt_hash
    },
    input_ids: {
      source_ids: [...runData.inputs.source_ids].sort(),
      artifact_ids: [...runData.inputs.artifact_ids].sort()
    }
  };

  return blake3(payload);
}

/**
 * Compute content hash for artifact
 */
export async function computeContentHash(content) {
  return blake3(content);
}

/**
 * Strip volatile fields from object before diffing
 */
export function stripVolatile(obj, volatilePaths = []) {
  if (!obj || typeof obj !== 'object') return obj;

  const cleaned = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (volatilePaths.includes(key)) continue;

    if (Array.isArray(obj)) {
      cleaned.push(stripVolatile(obj[key], volatilePaths));
    } else {
      cleaned[key] = stripVolatile(obj[key], volatilePaths);
    }
  }

  return cleaned;
}

/**
 * Default volatile paths per artifact type
 */
export const VOLATILE_PATHS = {
  DOCUMENT_INDEX: ['processingNotes', 'timestamp'],
  FACTS_ASSUMPTIONS_SPLIT: ['generated_at'],
  TRUTH_GRAPH: ['generated_at'],
  ACTOR_IMPACT_MATRIX: [],
  IRREVERSIBLE_DECISIONS: [],
  MISSING_PROOF_SURFACES: [],
  PROOF_COLLAPSE_MAP: [],
  FOUNDER_RESEARCH_REPORT: [],
  FOUNDER_DECISIONS: []
};
