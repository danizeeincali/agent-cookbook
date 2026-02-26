/**
 * Types for discovery API
 */

export interface SearchResult {
  recipe_id: string;
  title: string;
  score: number;
  grade_avg?: number;
  total_runs?: number;
  step_count: number;
  fetch_url: string;
}

export interface SearchQuery {
  query?: string;
  tags?: string[];
  topK?: number;
}

export interface StepSearchResult {
  recipe_id: string;
  step_id: string;
  recipe_title: string;
  step_title: string;
  score: number;
  grade_avg?: number;
  total_runs?: number;
  fetch_url: string;
}
