/**
 * IndexedDB storage via Dexie
 *
 * Schema for v0.2:
 * - packs
 * - sources
 * - runs
 * - artifacts
 * - hashes
 */

import Dexie from 'dexie';

/**
 * Database instance
 */
export const db = new Dexie('FounderResearchEngine');

/**
 * Define schema
 */
db.version(2).stores({
  packs: 'pack_id, created_at',
  sources: 'source_id, pack_id, filename, ingested_at',
  runs: 'run_id, pack_id, phase_id, iteration, started_at',
  artifacts: 'artifact_id, pack_id, name, phase_id, version, created_at',
  hashes: '++id, pack_id, kind, [kind+pack_id]'
});

/**
 * Initialize database
 */
export async function initDatabase() {
  await db.open();
  return db;
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearDatabase() {
  await db.packs.clear();
  await db.sources.clear();
  await db.runs.clear();
  await db.artifacts.clear();
  await db.hashes.clear();
}

/**
 * Get or create current pack
 */
export async function getCurrentPack() {
  const packs = await db.packs.toArray();

  if (packs.length === 0) {
    // Create new pack
    const { createPack } = await import('../utils/pack.js');
    const pack = createPack();
    await db.packs.add(pack);
    return pack;
  }

  // Return most recent pack
  return packs.sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  )[0];
}

/**
 * Save source
 */
export async function saveSource(source) {
  await db.sources.put(source);
  return source;
}

/**
 * Get all sources for pack
 */
export async function getSourcesByPack(pack_id) {
  return await db.sources.where('pack_id').equals(pack_id).toArray();
}

/**
 * Save run
 */
export async function saveRun(run) {
  await db.runs.put(run);
  return run;
}

/**
 * Get runs by phase
 */
export async function getRunsByPhase(pack_id, phase_id) {
  return await db.runs
    .where('[pack_id+phase_id]')
    .equals([pack_id, phase_id])
    .toArray();
}

/**
 * Get all runs for pack
 */
export async function getRunsByPack(pack_id) {
  return await db.runs.where('pack_id').equals(pack_id).toArray();
}

/**
 * Save artifact
 */
export async function saveArtifact(artifact) {
  await db.artifacts.put(artifact);
  return artifact;
}

/**
 * Get artifacts by name
 */
export async function getArtifactsByName(pack_id, name) {
  return await db.artifacts
    .where('[pack_id+name]')
    .equals([pack_id, name])
    .toArray();
}

/**
 * Get all artifacts for pack
 */
export async function getArtifactsByPack(pack_id) {
  return await db.artifacts.where('pack_id').equals(pack_id).toArray();
}

/**
 * Get latest artifact version by name
 */
export async function getLatestArtifact(pack_id, name) {
  const artifacts = await getArtifactsByName(pack_id, name);
  if (artifacts.length === 0) return null;

  return artifacts.reduce((latest, current) =>
    current.version > latest.version ? current : latest
  );
}

/**
 * Save hash entry
 */
export async function saveHashEntry(entry) {
  await db.hashes.add(entry);
  return entry;
}

/**
 * Get all hashes for pack
 */
export async function getHashesByPack(pack_id) {
  return await db.hashes.where('pack_id').equals(pack_id).toArray();
}

/**
 * Export all data for pack
 */
export async function exportPackData(pack_id) {
  const pack = await db.packs.get(pack_id);
  const sources = await getSourcesByPack(pack_id);
  const runs = await getRunsByPack(pack_id);
  const artifacts = await getArtifactsByPack(pack_id);
  const hashes = await getHashesByPack(pack_id);

  return {
    pack,
    sources,
    runs,
    artifacts,
    hashes
  };
}
