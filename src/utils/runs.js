/**
 * Run model for v0.2
 *
 * Implements:
 * - Run creation
 * - Input/prompt hashing
 * - Warning management
 */

import { computePromptHash, computeInputsHash, computeRunHash } from './hashing.js';

/**
 * Warning codes (machine-actionable)
 */
export const WARNING_CODES = {
  SKIP_GROUND_TRUTH: 'SKIP_GROUND_TRUTH',
  SKIP_REALITY_CHECK: 'SKIP_REALITY_CHECK',
  SKIP_LEVERAGE: 'SKIP_LEVERAGE',
  LOW_SOURCE_CONFIDENCE: 'LOW_SOURCE_CONFIDENCE',
  REPLAY_REQUIRED: 'REPLAY_REQUIRED',
  UNKEYED_ARRAY_DIFF: 'UNKEYED_ARRAY_DIFF',
  MISSING_INPUTS: 'MISSING_INPUTS'
};

/**
 * Warning consequences
 */
export const WARNING_CONSEQUENCES = {
  [WARNING_CODES.SKIP_GROUND_TRUTH]: 'Operating on narrative; contradictions and leverage likely hallucinated.',
  [WARNING_CODES.SKIP_REALITY_CHECK]: 'Accountability missing; liability blind spot introduced.',
  [WARNING_CODES.SKIP_LEVERAGE]: 'Proof surfaces not enumerated; you will underbuild defensibility.',
  [WARNING_CODES.LOW_SOURCE_CONFIDENCE]: 'Dominant inputs are speculative/vendor; regulator defensibility weak.',
  [WARNING_CODES.REPLAY_REQUIRED]: 'New evidence discovered; earlier phases must be rerun.',
  [WARNING_CODES.UNKEYED_ARRAY_DIFF]: 'Array diff approximated by hash; ordering changes may be missed.',
  [WARNING_CODES.MISSING_INPUTS]: 'Required inputs from previous phases are missing.'
};

/**
 * Create run object
 *
 * Note: sources and artifacts are FULL OBJECTS (not just IDs) to enable
 * content-based inputs_hash computation per v0.2 spec.
 */
export async function createRun({
  pack_id,
  phase_id,
  iteration,
  sources,      // Full source objects (with source_id, hashes.blake3)
  artifacts,    // Full artifact objects (with artifact_id, hashes.content_hash)
  engine,
  prompt_refs,
  warnings = []
}) {
  const timestamp = new Date().toISOString();
  const run_id = `run_${Date.now()}_${phase_id}_${iteration}`;

  // Extract IDs for storage (sorted by code-unit comparison)
  const source_ids = (sources || [])
    .map(s => s.source_id)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const artifact_ids = (artifacts || [])
    .map(a => a.artifact_id)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  // Compute hashes - now uses full objects for content-based hashing
  const inputs_hash = await computeInputsHash(sources || [], artifacts || []);
  const prompt_hash = await computePromptHash(
    prompt_refs.system_prompt,
    prompt_refs.phase_prompt,
    prompt_refs.developer_prompt || ''
  );

  const runData = {
    run_id,
    pack_id,
    phase_id,
    iteration,
    started_at: timestamp,
    ended_at: null, // Set when run completes

    inputs: {
      source_ids,
      artifact_ids
    },

    engine: {
      provider: engine.provider || 'anthropic',
      model: engine.model,
      max_tokens: engine.max_tokens,
      temperature: engine.temperature || null
    },

    prompt_refs: {
      system_prompt: prompt_refs.system_prompt,
      phase_prompt: prompt_refs.phase_prompt,
      developer_prompt: prompt_refs.developer_prompt || null
    },

    outputs: {
      artifact_ids: []
    },

    warnings: warnings.map(w => ({
      code: w.code,
      message: w.message,
      severity: w.severity || 'warn',
      consequence: WARNING_CONSEQUENCES[w.code] || w.consequence || '',
      related_phase_id: w.related_phase_id || null
    })),

    hashes: {
      inputs_hash,
      prompt_hash,
      run_hash: null // Computed after run completes
    },

    parent_run_id: null
  };

  return runData;
}

/**
 * Complete run (set end time, compute run_hash, add outputs)
 */
export async function completeRun(run, artifactIds) {
  run.ended_at = new Date().toISOString();
  run.outputs.artifact_ids = artifactIds;

  // Compute final run_hash
  run.hashes.run_hash = await computeRunHash(run);

  return run;
}

/**
 * Create warning object
 */
export function createWarning(code, options = {}) {
  return {
    code,
    message: options.message || `Warning: ${code}`,
    severity: options.severity || 'warn',
    consequence: WARNING_CONSEQUENCES[code] || options.consequence || '',
    related_phase_id: options.related_phase_id || null
  };
}

/**
 * Check for missing phase dependencies
 */
export function checkPhaseDependencies(phaseId, availablePhases) {
  const dependencies = {
    extraction: ['intake'],
    reality: ['intake', 'extraction'],
    leverage: ['intake', 'extraction', 'reality'],
    synthesis: ['intake', 'extraction', 'reality', 'leverage'],
    decision: ['intake', 'extraction', 'reality', 'leverage', 'synthesis']
  };

  const required = dependencies[phaseId] || [];
  const missing = required.filter(p => !availablePhases.includes(p));

  if (missing.length > 0) {
    return createWarning(WARNING_CODES.MISSING_INPUTS, {
      message: `Missing required phases: ${missing.join(', ')}`,
      severity: 'block',
      consequence: `Cannot proceed with ${phaseId} until ${missing.join(', ')} complete.`
    });
  }

  return null;
}

/**
 * Assess source confidence and generate warning if needed
 */
export function assessSourceConfidence(sources) {
  if (!sources || sources.length === 0) {
    return null;
  }

  const avgConfidence = sources.reduce((sum, s) =>
    sum + (s.provenance?.confidence_weight || 0.5), 0) / sources.length;

  if (avgConfidence < 0.5) {
    return createWarning(WARNING_CODES.LOW_SOURCE_CONFIDENCE, {
      message: `Average source confidence: ${avgConfidence.toFixed(2)} (below 0.5 threshold)`,
      severity: 'warn'
    });
  }

  return null;
}

/**
 * Validate run object
 */
export function validateRun(run) {
  const errors = [];

  if (!run.run_id) errors.push('Missing run_id');
  if (!run.pack_id) errors.push('Missing pack_id');
  if (!run.phase_id) errors.push('Missing phase_id');
  if (!run.started_at) errors.push('Missing started_at');
  if (!run.inputs) errors.push('Missing inputs');
  if (!run.engine) errors.push('Missing engine');
  if (!run.hashes) errors.push('Missing hashes');

  return {
    valid: errors.length === 0,
    errors
  };
}
