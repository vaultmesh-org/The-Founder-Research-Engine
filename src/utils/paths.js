/**
 * Path normalization utilities for v0.2
 *
 * Implementation Note B: Normalize paths at creation, not export
 *
 * Rules:
 * - Forward slashes only
 * - No leading slash
 * - No ./
 * - No //
 * - Unicode NFC normalization
 */

/**
 * Normalize a file path for deterministic hashing
 *
 * @param {string} path - Raw path
 * @returns {string} Normalized path
 */
export function normalizePath(path) {
  if (!path) return '';

  return path
    .replace(/\\/g, '/')           // Backslash to forward slash
    .replace(/^\.\//, '')           // Remove leading ./
    .replace(/^\//, '')             // Remove leading /
    .replace(/\/+/g, '/')           // Collapse multiple slashes
    .replace(/\/$/, '')             // Remove trailing slash
    .normalize('NFC');              // Unicode normalization
}

/**
 * Validate that a path is already normalized
 *
 * @param {string} path - Path to validate
 * @returns {{valid: boolean, issues: string[]}}
 */
export function validatePath(path) {
  const issues = [];

  if (path.includes('\\')) {
    issues.push('Contains backslash');
  }
  if (path.startsWith('/')) {
    issues.push('Starts with /');
  }
  if (path.startsWith('./')) {
    issues.push('Starts with ./');
  }
  if (path.includes('//')) {
    issues.push('Contains //');
  }
  if (path.endsWith('/')) {
    issues.push('Ends with /');
  }
  if (path !== path.normalize('NFC')) {
    issues.push('Not NFC normalized');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Sort paths by code-unit comparison (not localeCompare)
 * Rule 3: Path sorting is code-unit, not locale
 *
 * @param {string[]} paths - Array of paths
 * @returns {string[]} Sorted paths
 */
export function sortPaths(paths) {
  return [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
