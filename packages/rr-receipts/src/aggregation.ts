/**
 * Grade aggregation using exponential moving average
 */

import { ReceiptSummary } from '@agent-cookbook/store';

/**
 * Aggregate new receipt into existing summary using EMA
 * Alpha = 0.1 (gives more weight to historical data)
 */
export function aggregateReceipt(
  existing: ReceiptSummary | undefined,
  newGrade: number,
  timestamp: string
): ReceiptSummary {
  const alpha = 0.1;

  if (!existing) {
    // First receipt
    return {
      total_runs: 1,
      grade_avg: newGrade,
      last_verified: timestamp,
    };
  }

  // EMA: new_avg = α * new_grade + (1 - α) * existing_avg
  const newAvg = alpha * newGrade + (1 - alpha) * existing.grade_avg;

  return {
    total_runs: existing.total_runs + 1,
    grade_avg: newAvg,
    grade_p10: existing.grade_p10, // TODO: Implement percentile tracking
    last_verified: timestamp,
  };
}
