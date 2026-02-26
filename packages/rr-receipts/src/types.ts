/**
 * Types for receipt system
 */

export interface GradeComponents {
  correctness?: number;
  performance?: number;
  security_scan?: number;
  test_coverage?: number;
}

export interface Receipt {
  receipt_id: string;
  target_id: string;
  target_type: 'step' | 'recipe';
  grade: number;
  grade_components?: GradeComponents;
  agent_signature: string;
  agent_public_key: string;
  timestamp: string;
}

export interface SubmitReceiptInput {
  target_id: string;
  target_type: 'step' | 'recipe';
  grade: number;  // Client must send the grade they signed
  grade_components: GradeComponents;
  agent_signature: string;
  agent_public_key: string;
  timestamp: string;  // Client must send the timestamp they signed
}

export interface ValidationError {
  field: string;
  message: string;
}
