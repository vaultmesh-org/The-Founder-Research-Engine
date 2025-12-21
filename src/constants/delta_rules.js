/**
 * Declared delta rules per artifact type
 *
 * These rules are exported to pack.json and used by the delta engine.
 * They define which arrays use stable keyed-identity for diffing.
 *
 * Rule 4: Schema allows string OR array for keyed arrays
 * - string: single property name (e.g., "id")
 * - array: composite key from multiple properties (e.g., ["fact", "source"])
 */

export const ARTIFACT_DELTA_RULES = {
  'DOCUMENT_INDEX.json': {
    keyed_arrays: {
      '/documents': ['id', 'type']
    }
  },

  'FACTS_ASSUMPTIONS_SPLIT.json': {
    keyed_arrays: {
      '/verifiableFacts': ['fact', 'source'],
      '/assumptions': ['assumption', 'source'],
      '/claimsRequiringProof': ['claim'],
      '/missingInformation': ['gap'],
      '/contradictions': ['item1', 'item2']
    }
  },

  'TRUTH_GRAPH.json': {
    keyed_arrays: {
      '/mergedFacts': ['fact'],
      '/contradictions': ['item1', 'item2']
    }
  },

  'ACTOR_IMPACT_MATRIX.md': {
    // Markdown artifacts use section-based diffing
    keyed_arrays: {}
  },

  'IRREVERSIBLE_DECISIONS.md': {
    keyed_arrays: {}
  },

  'MISSING_PROOF_SURFACES.md': {
    keyed_arrays: {}
  },

  'PROOF_COLLAPSE_MAP.md': {
    keyed_arrays: {}
  },

  'FOUNDER_RESEARCH_REPORT.md': {
    keyed_arrays: {}
  },

  'FOUNDER_DECISIONS.md': {
    keyed_arrays: {}
  }
};

/**
 * Get delta rules for an artifact
 *
 * @param {string} artifactName - Artifact filename
 * @returns {Object} Delta rules for this artifact
 */
export function getDeltaRules(artifactName) {
  return ARTIFACT_DELTA_RULES[artifactName] || { keyed_arrays: {} };
}

/**
 * Get keyed array paths for an artifact
 *
 * @param {string} artifactName - Artifact filename
 * @returns {string[]} Array of JSON paths that use keyed-array diffing
 */
export function getKeyedArrayPaths(artifactName) {
  const rules = getDeltaRules(artifactName);
  return Object.keys(rules.keyed_arrays || {});
}

/**
 * Get key fields for a path
 *
 * @param {string} artifactName - Artifact filename
 * @param {string} path - JSON path (e.g., "/verifiableFacts")
 * @returns {string|string[]|null} Key field(s) or null if not keyed
 */
export function getKeyFields(artifactName, path) {
  const rules = getDeltaRules(artifactName);
  return rules.keyed_arrays?.[path] || null;
}
