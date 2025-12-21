/**
 * Delta computation for v0.2
 *
 * Implements:
 * - JSON deep diff with stable keyed arrays
 * - Markdown section-level diff
 * - Delta confidence scoring
 *
 * v0.2: Uses declared delta rules from constants/delta_rules.js
 */

import { blake3Short, canonicalizeJson, stripVolatile, normalizeString } from './hashing.js';
import { getKeyedArrayPaths, getKeyFields } from '../constants/delta_rules.js';

/**
 * Generate stable key for an item based on declared key fields
 *
 * @param {Object} item - The item to generate a key for
 * @param {string|string[]} keyFields - Field name(s) to use for key
 * @returns {Promise<string>} Stable key
 */
async function generateStableKey(item, keyFields) {
  const fields = Array.isArray(keyFields) ? keyFields : [keyFields];
  const keyData = {};

  for (const field of fields) {
    const value = item[field];
    keyData[field] = typeof value === 'string' ? value.trim() : value || '';
  }

  return 'KEY:' + await blake3Short(keyData);
}

/**
 * Transform array to keyed map using stable keys
 *
 * @param {Array} array - Array to transform
 * @param {string} path - Full JSON path (e.g., "/verifiableFacts")
 * @param {string} artifactName - Artifact filename for rule lookup
 */
async function arrayToKeyedMap(array, path, artifactName) {
  const keyFields = getKeyFields(artifactName, path);

  if (!keyFields) {
    // Fallback: hash entire item
    const map = {};
    for (const item of array) {
      const key = 'ITEM:' + await blake3Short(item);
      map[key] = item;
    }
    return map;
  }

  const map = {};
  for (const item of array) {
    const key = await generateStableKey(item, keyFields);
    map[key] = item;
  }
  return map;
}

/**
 * Check if path should use keyed-array transform
 *
 * @param {string} path - JSON path to check
 * @param {string} artifactName - Artifact filename for rule lookup
 */
function isKeyedArrayPath(path, artifactName) {
  const keyedPaths = getKeyedArrayPaths(artifactName);
  return keyedPaths.some(kp => path.startsWith(kp) || path === kp);
}

/**
 * Deep diff algorithm (recursive)
 *
 * @param {*} prev - Previous value
 * @param {*} next - Next value
 * @param {string} path - Current JSON path
 * @param {Object} diffs - Diff accumulator
 * @param {string} artifactName - Artifact filename for rule lookup
 */
async function deepDiff(prev, next, path, diffs, artifactName) {
  // Type mismatch
  if (typeof prev !== typeof next) {
    diffs.changed.push(path || '/');
    return;
  }

  // Primitives
  if (typeof prev !== 'object' || prev === null || next === null) {
    if (prev !== next) {
      diffs.changed.push(path || '/');
    }
    return;
  }

  // Arrays
  if (Array.isArray(prev) && Array.isArray(next)) {
    await diffArrays(prev, next, path, diffs, artifactName);
    return;
  }

  // Objects
  if (!Array.isArray(prev) && !Array.isArray(next)) {
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

    for (const key of allKeys) {
      const newPath = path ? `${path}/${key}` : `/${key}`;
      const prevHas = key in prev;
      const nextHas = key in next;

      if (!prevHas && nextHas) {
        diffs.added.push(newPath);
      } else if (prevHas && !nextHas) {
        diffs.removed.push(newPath);
      } else {
        await deepDiff(prev[key], next[key], newPath, diffs, artifactName);
      }
    }
    return;
  }

  // Type mismatch (array vs object)
  diffs.changed.push(path || '/');
}

/**
 * Diff arrays (with keyed-array support)
 *
 * @param {Array} prev - Previous array
 * @param {Array} next - Next array
 * @param {string} path - Current JSON path
 * @param {Object} diffs - Diff accumulator
 * @param {string} artifactName - Artifact filename for rule lookup
 */
async function diffArrays(prev, next, path, diffs, artifactName) {
  // Use keyed-array transform if applicable
  if (isKeyedArrayPath(path, artifactName)) {
    const prevMap = await arrayToKeyedMap(prev, path, artifactName);
    const nextMap = await arrayToKeyedMap(next, path, artifactName);

    await deepDiff(prevMap, nextMap, path, diffs, artifactName);
    return;
  }

  // Array of primitives - multiset diff
  if (prev.every(x => typeof x !== 'object') && next.every(x => typeof x !== 'object')) {
    const prevSet = new Set(prev);
    const nextSet = new Set(next);

    for (const item of next) {
      if (!prevSet.has(item)) {
        diffs.added.push(`${path}/${item}`);
      }
    }

    for (const item of prev) {
      if (!nextSet.has(item)) {
        diffs.removed.push(`${path}/${item}`);
      }
    }

    return;
  }

  // Array of objects without stable key - hash-based multiset diff
  const prevHashes = new Map();
  const nextHashes = new Map();

  for (let i = 0; i < prev.length; i++) {
    const hash = await blake3Short(prev[i]);
    prevHashes.set(hash, prev[i]);
  }

  for (let i = 0; i < next.length; i++) {
    const hash = await blake3Short(next[i]);
    nextHashes.set(hash, next[i]);
  }

  for (const [hash, item] of nextHashes) {
    if (!prevHashes.has(hash)) {
      diffs.added.push(`${path}/HASH:${hash}`);
    }
  }

  for (const [hash, item] of prevHashes) {
    if (!nextHashes.has(hash)) {
      diffs.removed.push(`${path}/HASH:${hash}`);
    }
  }

  console.warn('UNKEYED_ARRAY_DIFF_APPROX', path);
}

/**
 * JSON delta (primary export)
 *
 * @param {Object} prev - Previous JSON object
 * @param {Object} next - Next JSON object
 * @param {Object} options - Options
 * @param {string} options.artifactName - Artifact filename for rule lookup
 * @param {string[]} options.volatilePaths - Paths to exclude from diff
 */
export async function deltaJson(prev, next, { artifactName = '', volatilePaths = [] } = {}) {
  const p = canonicalizeJson(stripVolatile(prev, volatilePaths));
  const n = canonicalizeJson(stripVolatile(next, volatilePaths));

  const diffs = { added: [], removed: [], changed: [] };
  await deepDiff(p, n, '', diffs, artifactName);

  return finalizeDelta(diffs, 'json', { prev: p, next: n });
}

/**
 * Parse markdown into sections
 */
function parseSections(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }

      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      const anchor_id = `h${level}::${slugify(title)}`;

      currentSection = {
        anchor_id,
        level,
        title,
        body: [],
        body_hash: null
      };
    } else if (currentSection) {
      currentSection.body.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections.push(currentSection);
  }

  // Compute body hashes
  return Promise.all(sections.map(async (section) => {
    const bodyText = section.body.join('\n').trim();
    section.body_text = bodyText;
    section.body_hash = bodyText ? await blake3Short(normalizeString(bodyText)) : '';

    // Extract bullets (optional)
    section.bullets = extractBullets(bodyText);

    return section;
  }));
}

/**
 * Slugify title for stable anchor IDs
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract bullet points from markdown body
 */
function extractBullets(text) {
  const bullets = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const bulletMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
    const numberedMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);

    if (bulletMatch) {
      bullets.push(bulletMatch[1].trim());
    } else if (numberedMatch) {
      bullets.push(numberedMatch[1].trim());
    }
  }

  return bullets;
}

/**
 * Markdown delta (section-level)
 */
export async function deltaMarkdown(prevMd, nextMd) {
  const prev = await parseSections(prevMd || '');
  const next = await parseSections(nextMd || '');

  const prevMap = new Map(prev.map(s => [s.anchor_id, s]));
  const nextMap = new Map(next.map(s => [s.anchor_id, s]));

  const diffs = { added: [], removed: [], changed: [] };

  // Added sections
  for (const [id, section] of nextMap) {
    if (!prevMap.has(id)) {
      diffs.added.push(`section:${id}`);
    }
  }

  // Removed sections
  for (const [id, section] of prevMap) {
    if (!nextMap.has(id)) {
      diffs.removed.push(`section:${id}`);
    }
  }

  // Changed sections
  for (const [id, nextSection] of nextMap) {
    const prevSection = prevMap.get(id);
    if (prevSection && prevSection.body_hash !== nextSection.body_hash) {
      diffs.changed.push(`section:${id}`);

      // Optional: bullet-level diff
      const bulletDiff = diffBullets(prevSection.bullets, nextSection.bullets, id);
      diffs.added.push(...bulletDiff.added);
      diffs.removed.push(...bulletDiff.removed);
    }
  }

  return finalizeDelta(diffs, 'markdown', { prev, next });
}

/**
 * Diff bullets within a section
 */
function diffBullets(prevBullets, nextBullets, sectionId) {
  const prevSet = new Set(prevBullets.map(normalizeString));
  const nextSet = new Set(nextBullets.map(normalizeString));

  const added = [];
  const removed = [];

  for (const bullet of nextSet) {
    if (!prevSet.has(bullet)) {
      added.push(`bullet:${sectionId}#${bullet.slice(0, 20)}`);
    }
  }

  for (const bullet of prevSet) {
    if (!nextSet.has(bullet)) {
      removed.push(`bullet:${sectionId}#${bullet.slice(0, 20)}`);
    }
  }

  return { added, removed };
}

/**
 * Finalize delta object with summary and stats
 */
function finalizeDelta(diffs, type, context = {}) {
  const stats = {
    addedCount: diffs.added.length,
    removedCount: diffs.removed.length,
    changedCount: diffs.changed.length
  };

  const summary = generateSummary(stats, type);
  const confidence = determineConfidence(diffs, type);

  return {
    summary,
    added: diffs.added,
    removed: diffs.removed,
    changed: diffs.changed,
    stats,
    confidence
  };
}

/**
 * Generate human-readable summary
 */
function generateSummary(stats, type) {
  const { addedCount, removedCount, changedCount } = stats;

  if (type === 'markdown') {
    if (addedCount > 0 || removedCount > 0) {
      return `Added ${addedCount} section${addedCount !== 1 ? 's' : ''}, removed ${removedCount}, changed ${changedCount} section${changedCount !== 1 ? 's' : ''}.`;
    }
    return `Changed ${changedCount} section${changedCount !== 1 ? 's' : ''} (no structural changes).`;
  }

  // JSON summary
  const total = addedCount + removedCount + changedCount;
  if (total === 0) return 'No changes.';

  const parts = [];
  if (addedCount > 0) parts.push(`added ${addedCount}`);
  if (removedCount > 0) parts.push(`removed ${removedCount}`);
  if (changedCount > 0) parts.push(`changed ${changedCount}`);

  return parts.join(', ') + ' items.';
}

/**
 * Determine diff confidence level
 */
function determineConfidence(diffs, type) {
  if (type === 'markdown') return 'high';

  // Check if any paths indicate unkeyed array approximation
  const hasApproximation = diffs.added.some(p => p.includes('/HASH:')) ||
    diffs.removed.some(p => p.includes('/HASH:'));

  if (hasApproximation) return 'low';

  // Check if all paths are keyed
  const allKeyed = [...diffs.added, ...diffs.removed, ...diffs.changed].every(p =>
    p.includes('FACT:') || p.includes('ASM:') || p.includes('CLM:') ||
    p.includes('GAP:') || p.includes('CTR:') || p.includes('DOC:') ||
    p.includes('ACT:') || p.includes('DEC:') || p.includes('PRF:') ||
    p.includes('COL:')
  );

  return allKeyed ? 'high' : 'medium';
}

/**
 * Artifact-specific semantic wording for summaries
 */
export const ARTIFACT_SEMANTIC_LABELS = {
  DOCUMENT_INDEX: 'documents',
  FACTS_ASSUMPTIONS_SPLIT: 'facts/assumptions/claims/gaps',
  TRUTH_GRAPH: 'contradictions/merged facts',
  ACTOR_IMPACT_MATRIX: 'actor mappings',
  IRREVERSIBLE_DECISIONS: 'irreversible decisions',
  MISSING_PROOF_SURFACES: 'proof surfaces',
  PROOF_COLLAPSE_MAP: 'collapse mappings',
  FOUNDER_RESEARCH_REPORT: 'sections',
  FOUNDER_DECISIONS: 'sections'
};
