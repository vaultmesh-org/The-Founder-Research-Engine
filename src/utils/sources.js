/**
 * Source model for v0.2
 *
 * Implements:
 * - Source creation with provenance
 * - Trust classification
 * - Content hashing
 */

import { blake3, sha256 } from './hashing.js';

/**
 * Provenance source types
 */
export const SOURCE_TYPES = {
  REGULATOR: 'regulator',
  OPERATOR: 'operator',
  VENDOR: 'vendor',
  INTERNAL: 'internal',
  SPECULATIVE: 'speculative'
};

/**
 * Authority levels
 */
export const AUTHORITY_LEVELS = {
  BINDING: 'binding',
  ADVISORY: 'advisory',
  INFORMATIONAL: 'informational'
};

/**
 * Create source object from document
 */
export async function createSource(document, provenance) {
  const timestamp = new Date().toISOString();

  // Compute content hashes
  const content = document.content || '';
  const blake3Hash = await blake3(content);
  const sha256Hash = await sha256(content);

  const source_id = `src_${blake3Hash.slice(0, 12)}`;

  return {
    source_id,
    filename: document.name || 'Untitled',
    mime_type: document.type || 'text/plain',
    ingested_at: timestamp,

    provenance: {
      source_type: provenance.source_type || SOURCE_TYPES.INTERNAL,
      authority_level: provenance.authority_level || AUTHORITY_LEVELS.INFORMATIONAL,
      confidence_weight: provenance.confidence_weight || 0.7,
      chain_of_custody: provenance.chain_of_custody || null,
      owner: provenance.owner || null,
      origin_url: provenance.origin_url || null
    },

    hashes: {
      blake3: blake3Hash,
      sha256: sha256Hash
    },

    size_bytes: content.length,
    tags: provenance.tags || [],

    // Store actual content (not in schema but useful for processing)
    _content: content
  };
}

/**
 * Get default confidence weight for source type
 */
export function getDefaultConfidenceWeight(sourceType) {
  const weights = {
    [SOURCE_TYPES.REGULATOR]: 1.0,
    [SOURCE_TYPES.OPERATOR]: 0.9,
    [SOURCE_TYPES.INTERNAL]: 0.7,
    [SOURCE_TYPES.VENDOR]: 0.5,
    [SOURCE_TYPES.SPECULATIVE]: 0.2
  };

  return weights[sourceType] || 0.5;
}

/**
 * Get default authority level for source type
 */
export function getDefaultAuthorityLevel(sourceType) {
  const levels = {
    [SOURCE_TYPES.REGULATOR]: AUTHORITY_LEVELS.BINDING,
    [SOURCE_TYPES.OPERATOR]: AUTHORITY_LEVELS.BINDING,
    [SOURCE_TYPES.INTERNAL]: AUTHORITY_LEVELS.ADVISORY,
    [SOURCE_TYPES.VENDOR]: AUTHORITY_LEVELS.INFORMATIONAL,
    [SOURCE_TYPES.SPECULATIVE]: AUTHORITY_LEVELS.INFORMATIONAL
  };

  return levels[sourceType] || AUTHORITY_LEVELS.INFORMATIONAL;
}

/**
 * Convert v0.1 trust level to v0.2 provenance
 */
export function convertTrustLevelToProvenance(trustLevel) {
  const mapping = {
    'authoritative': {
      source_type: SOURCE_TYPES.REGULATOR,
      authority_level: AUTHORITY_LEVELS.BINDING,
      confidence_weight: 1.0
    },
    'internal': {
      source_type: SOURCE_TYPES.INTERNAL,
      authority_level: AUTHORITY_LEVELS.ADVISORY,
      confidence_weight: 0.7
    },
    'third-party': {
      source_type: SOURCE_TYPES.VENDOR,
      authority_level: AUTHORITY_LEVELS.INFORMATIONAL,
      confidence_weight: 0.5
    },
    'speculative': {
      source_type: SOURCE_TYPES.SPECULATIVE,
      authority_level: AUTHORITY_LEVELS.INFORMATIONAL,
      confidence_weight: 0.2
    }
  };

  return mapping[trustLevel] || mapping['internal'];
}

/**
 * Validate source object
 */
export function validateSource(source) {
  const errors = [];

  if (!source.source_id) errors.push('Missing source_id');
  if (!source.filename) errors.push('Missing filename');
  if (!source.mime_type) errors.push('Missing mime_type');
  if (!source.ingested_at) errors.push('Missing ingested_at');

  if (!source.provenance) {
    errors.push('Missing provenance');
  } else {
    if (!Object.values(SOURCE_TYPES).includes(source.provenance.source_type)) {
      errors.push('Invalid source_type');
    }
    if (!Object.values(AUTHORITY_LEVELS).includes(source.provenance.authority_level)) {
      errors.push('Invalid authority_level');
    }
    if (typeof source.provenance.confidence_weight !== 'number' ||
        source.provenance.confidence_weight < 0 ||
        source.provenance.confidence_weight > 1) {
      errors.push('Invalid confidence_weight (must be 0.0-1.0)');
    }
  }

  if (!source.hashes || !source.hashes.blake3) {
    errors.push('Missing blake3 hash');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
