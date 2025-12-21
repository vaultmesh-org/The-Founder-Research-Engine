/**
 * Artifact model for v0.2
 *
 * Implements:
 * - Artifact creation with versioning
 * - Lineage tracking
 * - Delta computation
 */

import { computeContentHash, computePromptHash, computeInputsHash } from './hashing.js';
import { deltaJson, deltaMarkdown } from './deltas.js';

/**
 * Content types
 */
export const CONTENT_TYPES = {
  JSON: 'json',
  MARKDOWN: 'markdown',
  TEXT: 'text'
};

/**
 * Create artifact object
 */
export async function createArtifact({
  pack_id,
  name,
  phase_id,
  version,
  produced_by_run_id,
  content,
  content_type,
  prompt_hash,
  inputs_hash,
  parent_artifact = null
}) {
  const timestamp = new Date().toISOString();
  const content_hash = await computeContentHash(content);
  const artifact_id = `art_${name}_v${version}_${content_hash.slice(0, 12)}`;

  const artifact = {
    artifact_id,
    pack_id,
    name,
    phase_id,
    version,
    created_at: timestamp,
    produced_by_run_id,

    content_type,
    content_path: null, // Will be set on export

    hashes: {
      content_hash,
      prompt_hash,
      inputs_hash
    },

    lineage: {
      parent_artifact_id: parent_artifact?.artifact_id || null,
      supersedes: parent_artifact ? [parent_artifact.artifact_id] : [],
      delta: null
    },

    trust_summary: null,

    // Store content (not in export schema)
    _content: content
  };

  // Compute delta if there's a parent
  if (parent_artifact) {
    artifact.lineage.delta = await computeDelta(
      parent_artifact._content,
      content,
      content_type
    );
  }

  return artifact;
}

/**
 * Compute delta between parent and current artifact
 */
async function computeDelta(prevContent, nextContent, contentType) {
  if (contentType === CONTENT_TYPES.MARKDOWN) {
    return await deltaMarkdown(prevContent, nextContent);
  }

  if (contentType === CONTENT_TYPES.JSON) {
    return await deltaJson(prevContent, nextContent);
  }

  // Text - simple diff placeholder
  return {
    summary: 'Content changed',
    added: [],
    removed: [],
    changed: ['/content'],
    stats: { addedCount: 0, removedCount: 0, changedCount: 1 },
    confidence: 'low'
  };
}

/**
 * Compute trust summary for artifact based on source weights
 */
export function computeTrustSummary(sources) {
  if (!sources || sources.length === 0) {
    return null;
  }

  const weights = sources.map(s => s.provenance?.confidence_weight || 0.5);
  const avgConfidence = weights.reduce((a, b) => a + b, 0) / weights.length;

  // Find dominant source types
  const typeCounts = sources.reduce((acc, s) => {
    const type = s.provenance?.source_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const dominantSources = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type, count]) => `${type} (${count})`);

  return {
    dominant_sources: dominantSources,
    confidence_score: Math.round(avgConfidence * 100) / 100,
    notes: avgConfidence < 0.5
      ? 'Low confidence - primarily speculative/vendor sources'
      : avgConfidence > 0.8
      ? 'High confidence - primarily authoritative sources'
      : 'Medium confidence - mixed source types'
  };
}

/**
 * Get artifact name for phase output
 */
export function getArtifactName(phaseId, outputIndex = 0) {
  const outputs = {
    intake: ['DOCUMENT_INDEX.json'],
    extraction: ['FACTS_ASSUMPTIONS_SPLIT.json', 'TRUTH_GRAPH.json'],
    reality: ['ACTOR_IMPACT_MATRIX.md', 'IRREVERSIBLE_DECISIONS.md'],
    leverage: ['MISSING_PROOF_SURFACES.md', 'PROOF_COLLAPSE_MAP.md'],
    synthesis: ['FOUNDER_RESEARCH_REPORT.md'],
    decision: ['FOUNDER_DECISIONS.md']
  };

  return outputs[phaseId]?.[outputIndex] || `UNKNOWN_${phaseId}.json`;
}

/**
 * Get content type from artifact name
 */
export function getContentType(artifactName) {
  if (artifactName.endsWith('.json')) return CONTENT_TYPES.JSON;
  if (artifactName.endsWith('.md')) return CONTENT_TYPES.MARKDOWN;
  return CONTENT_TYPES.TEXT;
}

/**
 * Find latest version of artifact by name
 */
export function findLatestArtifact(artifacts, name) {
  const matching = artifacts.filter(a => a.name === name);
  if (matching.length === 0) return null;

  return matching.reduce((latest, current) =>
    current.version > latest.version ? current : latest
  );
}

/**
 * Get artifact lineage chain
 */
export function getArtifactLineage(artifact, allArtifacts) {
  const chain = [artifact];
  let current = artifact;

  while (current.lineage?.parent_artifact_id) {
    const parent = allArtifacts.find(a => a.artifact_id === current.lineage.parent_artifact_id);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }

  return chain;
}

/**
 * Validate artifact object
 */
export function validateArtifact(artifact) {
  const errors = [];

  if (!artifact.artifact_id) errors.push('Missing artifact_id');
  if (!artifact.pack_id) errors.push('Missing pack_id');
  if (!artifact.name) errors.push('Missing name');
  if (!artifact.phase_id) errors.push('Missing phase_id');
  if (!artifact.version) errors.push('Missing version');
  if (!artifact.created_at) errors.push('Missing created_at');
  if (!artifact.produced_by_run_id) errors.push('Missing produced_by_run_id');

  if (!artifact.hashes) {
    errors.push('Missing hashes');
  } else {
    if (!artifact.hashes.content_hash) errors.push('Missing content_hash');
    if (!artifact.hashes.prompt_hash) errors.push('Missing prompt_hash');
    if (!artifact.hashes.inputs_hash) errors.push('Missing inputs_hash');
  }

  if (!artifact.lineage) {
    errors.push('Missing lineage');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
