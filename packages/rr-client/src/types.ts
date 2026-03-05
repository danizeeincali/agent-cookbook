/**
 * Client SDK types
 */

export interface Recipe {
  id: string;
  title: string;
  description: string;
  tags: string[];
  version: string;
  steps: RecipeStep[];
  receipt_summary?: ReceiptSummary;
  created_at: string;
  forked_from?: string;
  fork_count?: number;
}

export interface RecipeStep {
  step_id: string;
  index: number;
  title: string;
  spec: string;
  inputs: string[];
  outputs: string[];
  receipt_summary?: ReceiptSummary;
}

export interface ReceiptSummary {
  total_runs: number;
  grade_avg: number;
  grade_p10?: number;
  last_verified: string;
}

export interface RecipeResult {
  recipe_id: string;
  title: string;
  score: number;
  grade_avg?: number;
  total_runs?: number;
  step_count: number;
  fetch_url: string;
  forked_from?: string;
  fork_count?: number;
}

export interface Ed25519KeyPair {
  privateKey: string;
  publicKey: string;
}

export interface GradeComponents {
  correctness?: number;
  performance?: number;
  security_scan?: number;
  test_coverage?: number;
}

export interface SubmitReceiptOptions {
  targetId: string;
  targetType: 'recipe' | 'step';
  gradeComponents: GradeComponents;
  agentKeyPair: Ed25519KeyPair;
}

export interface RRClientConfig {
  baseUrl: string;
  timeout?: number;
}
