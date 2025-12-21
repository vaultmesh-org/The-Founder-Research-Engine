/**
 * Pack exporter - generates ZIP file with full pack structure
 *
 * v0.2: Adds Merkle root commitment (ROOT.txt, MERKLE.json)
 */

import JSZip from 'jszip';
import { exportPackData } from './db.js';
import { buildMerkleTree, MERKLE_SPEC } from '../utils/merkle.js';
import { blake3Bytes } from '../utils/hashing.js';
import { sortPaths } from '../utils/paths.js';
import { ARTIFACT_DELTA_RULES } from '../constants/delta_rules.js';

/**
 * Export pack as ZIP file
 */
export async function exportPackAsZip(pack_id) {
  const { pack, sources, runs, artifacts, hashes } = await exportPackData(pack_id);

  const zip = new JSZip();

  // Add pack.json (including delta_rules for reproducibility)
  const packWithRules = {
    ...pack,
    delta_rules: ARTIFACT_DELTA_RULES
  };
  zip.file('pack.json', JSON.stringify(packWithRules, null, 2));

  // Add sources
  const sourcesData = { sources: sources.map(removeInternalFields) };
  zip.file('sources/sources.json', JSON.stringify(sourcesData, null, 2));

  // Add runs
  const runsFolder = zip.folder('runs');
  for (const run of runs) {
    runsFolder.file(`${run.run_id}.json`, JSON.stringify(removeInternalFields(run), null, 2));
  }

  // Add artifacts
  const artifactsFolder = zip.folder('artifacts');
  for (const artifact of artifacts) {
    const filename = `artifact_${artifact.name.replace(/\./g, '_')}_v${artifact.version}.json`;
    const exportData = {
      ...removeInternalFields(artifact),
      content: artifact._content
    };
    artifactsFolder.file(filename, JSON.stringify(exportData, null, 2));
  }

  // Add schemas
  const schemasFolder = zip.folder('schemas');
  const schemas = await getSchemas();
  for (const [name, schema] of Object.entries(schemas)) {
    schemasFolder.file(name, JSON.stringify(schema, null, 2));
  }

  // === MERKLE ROOT COMPUTATION ===
  // Implementation Note A: Sort paths before processing (don't rely on Object.entries order)

  // 1. Collect all file paths (excluding directories)
  const allPaths = sortPaths(
    Object.keys(zip.files).filter(path => !zip.files[path].dir)
  );

  // 2. Hash all files in sorted order (Rule 6: use uint8array)
  const fileHashes = [];
  for (const path of allPaths) {
    const bytes = await zip.files[path].async('uint8array');
    const hash = await blake3Bytes(bytes);
    fileHashes.push({ path, hash });
  }

  // 3. Create HASHES.json manifest
  // Rule 5: HASHES.json excludes itself (manifest self-exclusion)
  const hashesManifest = {
    pack_id,
    created_at: new Date().toISOString(),
    excludes: ['hashes/HASHES.json', 'ROOT.txt', 'hashes/MERKLE.json'],
    entries: fileHashes.map(f => ({
      kind: inferKind(f.path),
      id: f.path,
      path: f.path,
      blake3: f.hash
    }))
  };
  zip.file('hashes/HASHES.json', JSON.stringify(hashesManifest, null, 2));

  // 4. Build Merkle tree (Rule 5: exclude ROOT.txt and MERKLE.json from leaf set)
  const merkleEntries = fileHashes.filter(f =>
    f.path !== 'ROOT.txt' && f.path !== 'hashes/MERKLE.json'
  );
  const { root, leafCount } = await buildMerkleTree(merkleEntries);

  // 5. Write ROOT.txt (just the hash, nothing else)
  zip.file('ROOT.txt', root);

  // 6. Write MERKLE.json with spec version and padding rule
  zip.file('hashes/MERKLE.json', JSON.stringify({
    ...MERKLE_SPEC,
    root,
    leaf_count: leafCount,
    created_at: new Date().toISOString()
  }, null, 2));

  // Generate ZIP
  const blob = await zip.generateAsync({ type: 'blob' });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `research_pack_${pack.pack_id}_${new Date().toISOString().split('T')[0]}.zip`;
  a.click();
  URL.revokeObjectURL(url);

  return blob;
}

/**
 * Remove internal fields (fields starting with _)
 */
function removeInternalFields(obj) {
  const cleaned = {};
  for (const key in obj) {
    if (!key.startsWith('_')) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

/**
 * Infer kind from file path
 */
function inferKind(path) {
  if (path.startsWith('sources/')) return 'source';
  if (path.startsWith('runs/')) return 'run';
  if (path.startsWith('artifacts/')) return 'artifact';
  if (path.startsWith('schemas/')) return 'schema';
  if (path.startsWith('hashes/')) return 'hash';
  if (path === 'pack.json') return 'pack';
  return 'file';
}

/**
 * Get JSON schemas (bundled)
 */
async function getSchemas() {
  // Import schemas
  const pack = await import('../../schemas/pack.schema.json');
  const source = await import('../../schemas/source.schema.json');
  const run = await import('../../schemas/run.schema.json');
  const artifact = await import('../../schemas/artifact.schema.json');
  const hashesSchema = await import('../../schemas/hashes.schema.json');

  return {
    'pack.schema.json': pack.default,
    'source.schema.json': source.default,
    'run.schema.json': run.default,
    'artifact.schema.json': artifact.default,
    'hashes.schema.json': hashesSchema.default
  };
}

/**
 * Export single artifact
 */
export function downloadArtifact(artifact) {
  const content = typeof artifact._content === 'string'
    ? artifact._content
    : JSON.stringify(artifact._content, null, 2);

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = artifact.name;
  a.click();
  URL.revokeObjectURL(url);
}
