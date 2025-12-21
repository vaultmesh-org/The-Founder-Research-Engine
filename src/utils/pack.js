/**
 * Pack model for v0.2
 *
 * Implements:
 * - Research pack creation
 * - HASHES.json manifest
 * - Pack export structure
 */

import { blake3 } from './hashing.js';

/**
 * Phase definitions (matches constants/phases.js)
 */
export const PACK_PHASES = [
  {
    phase_id: 'intake',
    name: 'Containment',
    expected_artifacts: ['DOCUMENT_INDEX.json'],
    skip_consequence: 'If you skip this phase, you will process noise as signal.'
  },
  {
    phase_id: 'extraction',
    name: 'Ground Truth',
    expected_artifacts: ['FACTS_ASSUMPTIONS_SPLIT.json', 'TRUTH_GRAPH.json'],
    skip_consequence: 'If you skip this phase, you will build on assumptions.'
  },
  {
    phase_id: 'reality',
    name: 'Reality Check',
    expected_artifacts: ['ACTOR_IMPACT_MATRIX.md', 'IRREVERSIBLE_DECISIONS.md'],
    skip_consequence: 'If you skip this phase, you will miss who is actually liable.'
  },
  {
    phase_id: 'leverage',
    name: 'VaultMesh Leverage',
    expected_artifacts: ['MISSING_PROOF_SURFACES.md', 'PROOF_COLLAPSE_MAP.md'],
    skip_consequence: 'If you skip this phase, you will hallucinate leverage.'
  },
  {
    phase_id: 'synthesis',
    name: 'Synthesis',
    expected_artifacts: ['FOUNDER_RESEARCH_REPORT.md'],
    skip_consequence: 'If you skip this phase, you will have data without meaning.'
  },
  {
    phase_id: 'decision',
    name: 'Decision',
    expected_artifacts: ['FOUNDER_DECISIONS.md'],
    skip_consequence: 'If you skip this phase, you will never actually decide.'
  }
];

/**
 * Create research pack
 */
export function createPack(options = {}) {
  const timestamp = new Date().toISOString();
  const pack_id = `pack_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    schema_version: '0.2.0',
    pack_id,
    created_at: timestamp,

    phases: PACK_PHASES,

    entrypoints: {
      sources_path: 'sources/sources.json',
      runs_path: 'runs/',
      artifacts_path: 'artifacts/',
      hashes_path: 'hashes/HASHES.json'
    },

    notes: options.notes || null
  };
}

/**
 * Create HASHES.json manifest
 *
 * Note: In v0.2, the exporter computes hashes and Merkle root directly.
 * This function is kept for compatibility but the real root is in ROOT.txt.
 */
export async function createHashesManifest(pack_id, entries) {
  const timestamp = new Date().toISOString();

  // Compute hashes for all entries
  const hashedEntries = await Promise.all(
    entries.map(async (entry) => ({
      kind: entry.kind,
      id: entry.id,
      path: entry.path,
      blake3: entry.blake3 || await blake3(entry.content || '')
    }))
  );

  return {
    pack_id,
    created_at: timestamp,
    entries: hashedEntries
    // Note: Merkle root is now in ROOT.txt, computed by exporter
  };
}

/**
 * Add entry to hashes manifest
 */
export function addHashEntry(kind, id, path, blake3Hash) {
  return {
    kind,
    id,
    path,
    blake3: blake3Hash
  };
}

/**
 * Generate pack export structure
 */
export function generatePackStructure(pack, sources, runs, artifacts) {
  return {
    'pack.json': pack,
    'sources/sources.json': { sources },
    'sources/blobs/': {}, // Optional blob storage
    'runs/': runs.reduce((acc, run) => {
      acc[`${run.run_id}.json`] = run;
      return acc;
    }, {}),
    'artifacts/': artifacts.reduce((acc, artifact) => {
      const filename = `artifact_${artifact.name.replace('.', '_')}_v${artifact.version}.json`;
      acc[filename] = {
        ...artifact,
        content: artifact._content
      };
      return acc;
    }, {}),
    'hashes/': {}
  };
}

/**
 * Validate pack object
 */
export function validatePack(pack) {
  const errors = [];

  if (!pack.schema_version) errors.push('Missing schema_version');
  if (pack.schema_version !== '0.2.0') errors.push('Invalid schema_version (expected 0.2.0)');
  if (!pack.pack_id) errors.push('Missing pack_id');
  if (!pack.created_at) errors.push('Missing created_at');
  if (!pack.phases) errors.push('Missing phases');
  if (!pack.entrypoints) errors.push('Missing entrypoints');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get phase by ID
 */
export function getPhase(phaseId) {
  return PACK_PHASES.find(p => p.phase_id === phaseId);
}

/**
 * Get next phase
 */
export function getNextPhase(currentPhaseId) {
  const currentIndex = PACK_PHASES.findIndex(p => p.phase_id === currentPhaseId);
  if (currentIndex === -1 || currentIndex === PACK_PHASES.length - 1) {
    return null;
  }
  return PACK_PHASES[currentIndex + 1];
}

/**
 * Check if phase is complete (all artifacts exist)
 */
export function isPhaseComplete(phaseId, artifacts) {
  const phase = getPhase(phaseId);
  if (!phase) return false;

  return phase.expected_artifacts.every(name =>
    artifacts.some(a => a.name === name)
  );
}
