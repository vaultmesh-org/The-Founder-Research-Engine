/**
 * Cryptographic utilities for artifact integrity and reproducibility
 */

export async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(typeof content === 'string' ? content : JSON.stringify(content));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateArtifactSignature(artifactName, content, metadata) {
  const timestamp = new Date().toISOString();
  return {
    artifactName,
    timestamp,
    contentHash: null, // Will be populated async
    metadata: {
      model: metadata.model || 'claude-sonnet-4-20250514',
      promptVersion: metadata.promptVersion || '1.0',
      phaseId: metadata.phaseId,
      iterationNumber: metadata.iterationNumber || 1,
      ...metadata
    }
  };
}

export async function signArtifact(artifactName, content, metadata) {
  const signature = generateArtifactSignature(artifactName, content, metadata);
  signature.contentHash = await hashContent(content);
  return signature;
}

export function verifyArtifactIntegrity(artifact, expectedHash) {
  return hashContent(artifact.content).then(hash => hash === expectedHash);
}
