/**
 * Receipt validation logic
 */

import { Receipt, ValidationError } from './types.js';
import { verifyReceiptSignature } from './crypto.js';

/**
 * Validate receipt structure and content
 */
export function validateReceiptStructure(receipt: Partial<Receipt>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate target_id
  if (!receipt.target_id || !/^sha256:[a-f0-9]{64}$/.test(receipt.target_id)) {
    errors.push({
      field: 'target_id',
      message: 'Must be a valid sha256: prefixed hash',
    });
  }

  // Validate target_type
  if (!receipt.target_type || !['step', 'recipe'].includes(receipt.target_type)) {
    errors.push({
      field: 'target_type',
      message: 'Must be either "step" or "recipe"',
    });
  }

  // Validate grade
  if (typeof receipt.grade !== 'number' || receipt.grade < 0 || receipt.grade > 1) {
    errors.push({
      field: 'grade',
      message: 'Must be a number between 0.0 and 1.0',
    });
  }

  // Validate grade_components if present
  if (receipt.grade_components) {
    for (const [key, value] of Object.entries(receipt.grade_components)) {
      if (typeof value !== 'number' || value < 0 || value > 1) {
        errors.push({
          field: `grade_components.${key}`,
          message: 'Must be a number between 0.0 and 1.0',
        });
      }
    }
  }

  // Validate timestamp
  if (!receipt.timestamp) {
    errors.push({
      field: 'timestamp',
      message: 'Timestamp is required',
    });
  } else {
    const timestamp = new Date(receipt.timestamp);
    const now = new Date();
    const diff = Math.abs(now.getTime() - timestamp.getTime());

    // Must be within 5 minutes of server time (anti-replay)
    if (diff > 5 * 60 * 1000) {
      errors.push({
        field: 'timestamp',
        message: 'Timestamp must be within 5 minutes of current time',
      });
    }
  }

  // Validate signature format
  if (!receipt.agent_signature || !/^ed25519:[a-f0-9]+$/.test(receipt.agent_signature)) {
    errors.push({
      field: 'agent_signature',
      message: 'Must be in format "ed25519:<hex>"',
    });
  }

  // Validate public key format
  if (!receipt.agent_public_key || !/^[a-f0-9]{64}$/.test(receipt.agent_public_key)) {
    errors.push({
      field: 'agent_public_key',
      message: 'Must be a 64-character hex string',
    });
  }

  return errors;
}

/**
 * Verify cryptographic signature
 */
export async function validateReceiptSignature(receipt: Receipt): Promise<boolean> {
  return verifyReceiptSignature(
    receipt.target_id,
    receipt.grade,
    receipt.timestamp,
    receipt.agent_signature,
    receipt.agent_public_key
  );
}

/**
 * Calculate grade from components (weighted average)
 */
export function calculateGrade(components: {
  correctness?: number;
  performance?: number;
  security_scan?: number;
  test_coverage?: number;
}): number {
  const weights = {
    correctness: 0.4,
    performance: 0.2,
    security_scan: 0.2,
    test_coverage: 0.2,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, value] of Object.entries(components)) {
    if (value !== undefined && value !== null) {
      const weight = weights[key as keyof typeof weights] || 0;
      weightedSum += value * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
