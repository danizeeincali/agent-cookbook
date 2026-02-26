/**
 * Content-addressed hashing utilities using @noble/hashes
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Generate SHA-256 content hash with 'sha256:' prefix
 */
export function contentHash(content: string): string {
  const hash = sha256(new TextEncoder().encode(content));
  return `sha256:${bytesToHex(hash)}`;
}

/**
 * Hash recipe content to generate recipe ID
 */
export function hashRecipe(recipe: {
  title: string;
  description: string;
  version: string;
  steps: Array<{
    index: number;
    title: string;
    spec: string;
    inputs: string[];
    outputs: string[];
  }>;
}): string {
  const content = JSON.stringify({
    title: recipe.title,
    description: recipe.description,
    version: recipe.version,
    steps: recipe.steps.map(s => ({
      index: s.index,
      title: s.title,
      spec: s.spec,
      inputs: s.inputs,
      outputs: s.outputs,
    })),
  });
  return contentHash(content);
}

/**
 * Hash step content to generate step ID
 */
export function hashStep(step: {
  index: number;
  title: string;
  spec: string;
  inputs: string[];
  outputs: string[];
}): string {
  const content = JSON.stringify({
    index: step.index,
    title: step.title,
    spec: step.spec,
    inputs: step.inputs,
    outputs: step.outputs,
  });
  return contentHash(content);
}
