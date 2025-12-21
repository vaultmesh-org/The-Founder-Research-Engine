/**
 * Pack verification system
 *
 * Verifies pack integrity by:
 * 1. Re-hashing all files (as Uint8Array, Rule 6)
 * 2. Comparing against HASHES.json entries
 * 3. Rebuilding Merkle tree from hashes
 * 4. Comparing against ROOT.txt
 */

import { blake3Bytes } from './hashing.js';
import { buildMerkleTree } from './merkle.js';
import { sortPaths } from './paths.js';
import JSZip from 'jszip';

/**
 * Verification result structure
 */
function createVerificationResult() {
  return {
    valid: true,
    pack_id: null,
    file_checks: [],
    files_checked: 0,
    files_matched: 0,
    merkle_valid: false,
    root_expected: null,
    root_computed: null,
    root_match: false,
    errors: [],
    warnings: [],
    verified_at: new Date().toISOString(),
    verifier_version: '0.2.0'
  };
}

/**
 * Verify pack from ZIP file (Blob or ArrayBuffer)
 *
 * @param {Blob|ArrayBuffer} zipData - ZIP file data
 * @returns {Promise<Object>} Verification result
 */
export async function verifyPackFromZip(zipData) {
  const results = createVerificationResult();

  try {
    const zip = await JSZip.loadAsync(zipData);

    // 1. Read HASHES.json
    const hashesFile = zip.file('hashes/HASHES.json');
    if (!hashesFile) {
      results.valid = false;
      results.errors.push('Missing hashes/HASHES.json');
      return results;
    }

    const hashesContent = await hashesFile.async('string');
    const hashes = JSON.parse(hashesContent);
    results.pack_id = hashes.pack_id;

    // 2. Read ROOT.txt
    const rootFile = zip.file('ROOT.txt');
    if (!rootFile) {
      results.valid = false;
      results.errors.push('Missing ROOT.txt');
      return results;
    }
    results.root_expected = (await rootFile.async('string')).trim();

    // 3. Verify each file hash (Rule 6: use uint8array)
    for (const entry of hashes.entries) {
      const file = zip.file(entry.path);
      if (!file) {
        results.valid = false;
        results.errors.push(`Missing file: ${entry.path}`);
        results.file_checks.push({
          path: entry.path,
          expected: entry.blake3,
          computed: null,
          match: false,
          error: 'File not found'
        });
        continue;
      }

      // Hash raw bytes (Rule 6)
      const bytes = await file.async('uint8array');
      const computed = await blake3Bytes(bytes);
      const match = computed === entry.blake3;

      results.file_checks.push({
        path: entry.path,
        expected: entry.blake3,
        computed,
        match
      });

      results.files_checked++;
      if (match) {
        results.files_matched++;
      } else {
        results.valid = false;
        results.errors.push(`Hash mismatch: ${entry.path}`);
      }
    }

    // 4. Check for unexpected files (not in HASHES.json)
    const expectedPaths = new Set(hashes.entries.map(e => e.path));
    const excludedPaths = new Set(hashes.excludes || []);

    // Add ROOT.txt and MERKLE.json to excluded (they're not in entries)
    excludedPaths.add('ROOT.txt');
    excludedPaths.add('hashes/MERKLE.json');

    for (const path of Object.keys(zip.files)) {
      if (zip.files[path].dir) continue;
      if (!expectedPaths.has(path) && !excludedPaths.has(path)) {
        results.warnings.push(`Unexpected file not in HASHES.json: ${path}`);
      }
    }

    // 5. Rebuild Merkle tree (Rule 5: exclude ROOT.txt and MERKLE.json)
    const merkleEntries = results.file_checks
      .filter(c => c.match && c.path !== 'ROOT.txt' && c.path !== 'hashes/MERKLE.json')
      .map(c => ({ path: c.path, hash: c.computed }));

    // Sort by path (Rule 3: code-unit comparison)
    const sortedEntries = merkleEntries.sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0
    );

    const { root: computedRoot } = await buildMerkleTree(sortedEntries);
    results.root_computed = computedRoot;
    results.merkle_valid = true;

    // 6. Compare against ROOT.txt
    results.root_match = computedRoot === results.root_expected;

    if (!results.root_match) {
      results.valid = false;
      results.errors.push(
        `Merkle root mismatch: expected ${results.root_expected}, computed ${computedRoot}`
      );
    }

    return results;

  } catch (error) {
    results.valid = false;
    results.errors.push(`Verification failed: ${error.message}`);
    return results;
  }
}

/**
 * Verify pack from exported pack data (in-memory)
 *
 * @param {Object} packData - Pack data with files map
 * @returns {Promise<Object>} Verification result
 */
export async function verifyPack(packData) {
  const results = createVerificationResult();

  try {
    const { hashes, root, files } = packData;

    if (!hashes || !hashes.entries) {
      results.valid = false;
      results.errors.push('Missing HASHES.json data');
      return results;
    }

    results.pack_id = hashes.pack_id;
    results.root_expected = root;

    // Verify each file hash
    for (const entry of hashes.entries) {
      const content = files[entry.path];
      if (content === undefined) {
        results.valid = false;
        results.errors.push(`Missing file: ${entry.path}`);
        continue;
      }

      // Convert to bytes if string
      const bytes = typeof content === 'string'
        ? new TextEncoder().encode(content)
        : content;

      const computed = await blake3Bytes(bytes);
      const match = computed === entry.blake3;

      results.file_checks.push({
        path: entry.path,
        expected: entry.blake3,
        computed,
        match
      });

      results.files_checked++;
      if (match) {
        results.files_matched++;
      } else {
        results.valid = false;
        results.errors.push(`Hash mismatch: ${entry.path}`);
      }
    }

    // Rebuild Merkle tree
    const merkleEntries = results.file_checks
      .filter(c => c.match && c.path !== 'ROOT.txt' && c.path !== 'hashes/MERKLE.json')
      .map(c => ({ path: c.path, hash: c.computed }));

    const sortedEntries = merkleEntries.sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0
    );

    const { root: computedRoot } = await buildMerkleTree(sortedEntries);
    results.root_computed = computedRoot;
    results.merkle_valid = true;

    results.root_match = computedRoot === results.root_expected;

    if (!results.root_match) {
      results.valid = false;
      results.errors.push(
        `Merkle root mismatch: expected ${results.root_expected}, computed ${computedRoot}`
      );
    }

    return results;

  } catch (error) {
    results.valid = false;
    results.errors.push(`Verification failed: ${error.message}`);
    return results;
  }
}

/**
 * Generate verification report as artifact
 *
 * @param {Object} verifyResult - Result from verifyPackFromZip
 * @returns {Object} Verification report artifact
 */
export function generateVerifyReport(verifyResult) {
  return {
    verified_at: verifyResult.verified_at,
    pack_id: verifyResult.pack_id,
    root_expected: verifyResult.root_expected,
    root_computed: verifyResult.root_computed,
    root_match: verifyResult.root_match,
    files_checked: verifyResult.files_checked,
    files_matched: verifyResult.files_matched,
    valid: verifyResult.valid,
    errors: verifyResult.errors,
    warnings: verifyResult.warnings,
    verifier_version: verifyResult.verifier_version
  };
}
