/**
 * Vector embedding generation using @xenova/transformers
 */

import { pipeline, env } from '@xenova/transformers';

// Disable local model loading for server environments
env.allowLocalModels = false;

let embedder: any = null;

/**
 * Initialize the embedding model (AllMiniLmL6V2 - 384 dimensions)
 */
export async function initEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

/**
 * Generate embedding vector for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await initEmbedder();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Generate embedding for a recipe (concatenate title, description, and step specs)
 */
export async function generateRecipeEmbedding(recipe: {
  title: string;
  description: string;
  steps: Array<{ spec: string }>;
}): Promise<number[]> {
  const text = [
    recipe.title,
    recipe.description,
    ...recipe.steps.map(s => s.spec),
  ].join('\n');

  return generateEmbedding(text);
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
