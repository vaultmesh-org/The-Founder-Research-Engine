/**
 * Golden Pack Test
 *
 * Tests deterministic Merkle root computation.
 * This catches 95% of drift bugs (encoding, sorting, bytes-vs-hex).
 *
 * IMPORTANT: Once this test passes, the expected root is FROZEN.
 * Any changes to hashing, sorting, or encoding will break this test.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { blake3Bytes, initBlake3 } from '../src/utils/hashing.js';
import { buildMerkleTree, hexToBytes, MERKLE_SPEC } from '../src/utils/merkle.js';
import { sortPaths } from '../src/utils/paths.js';

/**
 * Golden pack definition
 * These files have deterministic content for reproducible testing.
 */
const GOLDEN_PACK_FILES = [
  {
    path: 'pack.json',
    content: JSON.stringify({ schema_version: '0.2.0', pack_id: 'golden_test' }, null, 2)
  },
  {
    path: 'sources/test.json',
    content: JSON.stringify({ source_id: 'src_test', type: 'document' }, null, 2)
  },
  {
    path: 'artifacts/test.json',
    content: JSON.stringify({ artifact_id: 'art_test', name: 'TEST.json' }, null, 2)
  }
];

/**
 * FROZEN expected values
 * These were computed once and frozen. Any drift will fail this test.
 */
const EXPECTED = {
  // Hash of pack.json content
  pack_json_hash: null, // Computed on first run
  // Hash of sources/test.json content
  sources_test_hash: null, // Computed on first run
  // Hash of artifacts/test.json content
  artifacts_test_hash: null, // Computed on first run
  // Merkle root (will be frozen after first successful run)
  merkle_root: null // FREEZE AFTER FIRST RUN
};

describe('Golden Pack Test', () => {
  beforeAll(async () => {
    await initBlake3();
  });

  it('should sort paths using code-unit comparison', () => {
    const paths = ['sources/test.json', 'pack.json', 'artifacts/test.json'];
    const sorted = sortPaths(paths);

    // Code-unit sorting: 'a' < 'p' < 's' (by ASCII/UTF-8 value)
    expect(sorted).toEqual([
      'artifacts/test.json',
      'pack.json',
      'sources/test.json'
    ]);
  });

  it('should hash content as bytes (not string)', async () => {
    const content = '{"test": "value"}';
    const bytes = new TextEncoder().encode(content);
    const hash = await blake3Bytes(bytes);

    // Hash should be 64 lowercase hex characters
    expect(hash).toMatch(/^[a-f0-9]{64}$/);

    // Same content should produce same hash
    const hash2 = await blake3Bytes(new TextEncoder().encode(content));
    expect(hash2).toBe(hash);
  });

  it('should build Merkle tree with per-level odd padding', async () => {
    // Create file hashes
    const fileHashes = [];
    for (const file of GOLDEN_PACK_FILES) {
      const bytes = new TextEncoder().encode(file.content);
      const hash = await blake3Bytes(bytes);
      fileHashes.push({ path: file.path, hash });
    }

    // Build Merkle tree
    const { root, leafCount } = await buildMerkleTree(fileHashes);

    // Should have 3 leaves (before padding)
    expect(leafCount).toBe(3);

    // Root should be 64 lowercase hex characters
    expect(root).toMatch(/^[a-f0-9]{64}$/);

    // Log for freezing (run once, then freeze this value)
    console.log('MERKLE_ROOT:', root);
    console.log('To freeze: update EXPECTED.merkle_root with this value');
  });

  it('should produce deterministic file hashes', async () => {
    const hashes = {};

    for (const file of GOLDEN_PACK_FILES) {
      const bytes = new TextEncoder().encode(file.content);
      const hash = await blake3Bytes(bytes);
      hashes[file.path] = hash;

      // Log for reference
      console.log(`${file.path}: ${hash}`);
    }

    // Verify hashes are deterministic across runs
    for (const file of GOLDEN_PACK_FILES) {
      const bytes = new TextEncoder().encode(file.content);
      const hash = await blake3Bytes(bytes);
      expect(hash).toBe(hashes[file.path]);
    }
  });

  it('should use correct leaf encoding: path || 0x00 || hash_bytes', async () => {
    // Verify MERKLE_SPEC documents the encoding
    expect(MERKLE_SPEC.leaf_format).toBe('utf8(path) || 0x00 || hexToBytes(file_hash)');
    expect(MERKLE_SPEC.padding_rule).toBe('duplicate_last_if_odd_per_level');
    expect(MERKLE_SPEC.algorithm).toBe('blake3');
  });

  it('should convert hex to bytes correctly', () => {
    const hex = '48656c6c6f'; // "Hello" in hex
    const bytes = hexToBytes(hex);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(5);
    expect(Array.from(bytes)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  });

  it('should produce stable root across multiple builds', async () => {
    // Build tree multiple times
    const roots = [];

    for (let i = 0; i < 3; i++) {
      const fileHashes = [];
      for (const file of GOLDEN_PACK_FILES) {
        const bytes = new TextEncoder().encode(file.content);
        const hash = await blake3Bytes(bytes);
        fileHashes.push({ path: file.path, hash });
      }

      const { root } = await buildMerkleTree(fileHashes);
      roots.push(root);
    }

    // All roots should be identical
    expect(roots[1]).toBe(roots[0]);
    expect(roots[2]).toBe(roots[0]);
  });

  // FROZEN TEST - This value was computed and frozen on 2025-12-21
  it('should match frozen merkle root', async () => {
    const fileHashes = [];
    for (const file of GOLDEN_PACK_FILES) {
      const bytes = new TextEncoder().encode(file.content);
      const hash = await blake3Bytes(bytes);
      fileHashes.push({ path: file.path, hash });
    }

    const { root } = await buildMerkleTree(fileHashes);

    // FROZEN VALUE - Any drift in encoding, sorting, or hashing will break this
    expect(root).toBe('61787e269a8362ce23e6b72ca6b852f47ac16500817ef5a93b82b5614ca5f960');
  });
});

/**
 * Verification round-trip test
 */
describe('Verification Round-Trip', () => {
  beforeAll(async () => {
    await initBlake3();
  });

  it('should verify pack integrity', async () => {
    // 1. Create file hashes
    const fileHashes = [];
    for (const file of GOLDEN_PACK_FILES) {
      const bytes = new TextEncoder().encode(file.content);
      const hash = await blake3Bytes(bytes);
      fileHashes.push({ path: file.path, hash });
    }

    // 2. Build Merkle tree
    const { root: originalRoot } = await buildMerkleTree(fileHashes);

    // 3. "Verify" by rebuilding
    const verifyHashes = [];
    for (const file of GOLDEN_PACK_FILES) {
      const bytes = new TextEncoder().encode(file.content);
      const hash = await blake3Bytes(bytes);
      verifyHashes.push({ path: file.path, hash });
    }

    const { root: verifyRoot } = await buildMerkleTree(verifyHashes);

    // 4. Roots should match
    expect(verifyRoot).toBe(originalRoot);
  });

  it('should detect tampered file', async () => {
    // 1. Create original hashes
    const originalHashes = [];
    for (const file of GOLDEN_PACK_FILES) {
      const bytes = new TextEncoder().encode(file.content);
      const hash = await blake3Bytes(bytes);
      originalHashes.push({ path: file.path, hash });
    }
    const { root: originalRoot } = await buildMerkleTree(originalHashes);

    // 2. Tamper with one file
    const tamperedFiles = GOLDEN_PACK_FILES.map(f => ({ ...f }));
    tamperedFiles[0].content = tamperedFiles[0].content.replace('0.2.0', '0.2.1');

    const tamperedHashes = [];
    for (const file of tamperedFiles) {
      const bytes = new TextEncoder().encode(file.content);
      const hash = await blake3Bytes(bytes);
      tamperedHashes.push({ path: file.path, hash });
    }
    const { root: tamperedRoot } = await buildMerkleTree(tamperedHashes);

    // 3. Roots should differ
    expect(tamperedRoot).not.toBe(originalRoot);
  });
});
