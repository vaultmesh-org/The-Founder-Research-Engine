/**
 * Merkle tree construction for v0.2
 *
 * Implements:
 * - Deterministic leaf encoding: utf8(path) || 0x00 || hexToBytes(file_hash)
 * - Per-level odd padding (duplicate last if odd)
 * - Bytes-based operations (not hex strings)
 * - Code-unit path sorting
 *
 * @see specs/MERKLE_SPEC.md (v0.3)
 */

import { blake3Bytes } from './hashing.js';

/**
 * Convert hex string to bytes
 * Rule 2: Merkle tree operates on bytes, not hex strings
 *
 * @param {string} hex - 64-char lowercase hex string
 * @returns {Uint8Array} 32-byte array
 */
export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes to hex string
 *
 * @param {Uint8Array} bytes - Byte array
 * @returns {string} Lowercase hex string
 */
export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Concatenate Uint8Arrays
 *
 * @param {...Uint8Array} arrays - Arrays to concatenate
 * @returns {Uint8Array} Concatenated array
 */
export function concat(...arrays) {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Build Merkle tree from file entries
 *
 * Rule 2: Operate on bytes, not hex
 * Rule 3: Code-unit path sorting
 * Rule 5: Entries from HASHES.json minus ROOT.txt/MERKLE.json
 *
 * Leaf encoding: BLAKE3(utf8(path) || 0x00 || hexToBytes(file_hash))
 * Padding: duplicate_last_if_odd_per_level
 *
 * @param {Array<{path: string, hash: string}>} entries - path + 64-char hex hash
 * @returns {Promise<{root: string, leafCount: number}>}
 */
export async function buildMerkleTree(entries) {
  if (!entries || entries.length === 0) {
    // Empty tree: return null hash
    return {
      root: '0'.repeat(64),
      leafCount: 0
    };
  }

  // Rule 3: Sort by code-unit comparison (not localeCompare)
  const sorted = [...entries].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0
  );

  // Compute leaves (Rule 2: bytes, not hex)
  const leafDigests = await Promise.all(sorted.map(async ({ path, hash }) => {
    // Leaf = BLAKE3(utf8(path) || 0x00 || hexToBytes(file_hash))
    const pathBytes = new TextEncoder().encode(path);
    const separator = new Uint8Array([0x00]);
    const hashBytes = hexToBytes(hash);  // 32 bytes from 64 hex chars
    const leafInput = concat(pathBytes, separator, hashBytes);
    const leafHash = await blake3Bytes(leafInput);
    return hexToBytes(leafHash);  // Return as 32 bytes for parent computation
  }));

  // Build tree bottom-up (per-level odd padding, NOT power-of-two)
  let level = leafDigests;
  while (level.length > 1) {
    const nextLevel = [];

    // Per-level: if odd, duplicate last element at this level
    if (level.length % 2 === 1) {
      level.push(level[level.length - 1]);
    }

    // Hash pairs
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1];
      const parentInput = concat(left, right);  // 64 bytes
      const parentHash = await blake3Bytes(parentInput);
      nextLevel.push(hexToBytes(parentHash));
    }

    level = nextLevel;
  }

  // Root as lowercase hex
  const rootHex = bytesToHex(level[0]);

  return {
    root: rootHex,
    leafCount: sorted.length  // Original count, before any padding
  };
}

/**
 * Merkle tree spec for MERKLE.json
 */
export const MERKLE_SPEC = {
  spec_version: '1.0',
  algorithm: 'blake3',
  leaf_format: 'utf8(path) || 0x00 || hexToBytes(file_hash)',
  padding_rule: 'duplicate_last_if_odd_per_level',
  leaf_set_excludes: ['ROOT.txt', 'hashes/MERKLE.json']
};
