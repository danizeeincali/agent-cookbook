/**
 * Ed25519 signature verification using @noble/ed25519
 */

import * as ed25519 from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/**
 * Create message to sign for receipt
 */
export function createReceiptMessage(
  targetId: string,
  grade: number,
  timestamp: string
): Uint8Array {
  const message = `${targetId}:${grade}:${timestamp}`;
  return sha256(new TextEncoder().encode(message));
}

/**
 * Verify Ed25519 signature on receipt
 */
export async function verifyReceiptSignature(
  targetId: string,
  grade: number,
  timestamp: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    // Remove 'ed25519:' prefix if present
    const sigHex = signature.startsWith('ed25519:')
      ? signature.slice(8)
      : signature;

    const message = createReceiptMessage(targetId, grade, timestamp);
    const isValid = await ed25519.verifyAsync(
      hexToBytes(sigHex),
      message,
      hexToBytes(publicKey)
    );

    return isValid;
  } catch (err) {
    return false;
  }
}

/**
 * Generate ephemeral Ed25519 keypair for agents
 */
export async function generateKeyPair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);

  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
  };
}

/**
 * Sign receipt message
 */
export async function signReceipt(
  targetId: string,
  grade: number,
  timestamp: string,
  privateKey: string
): Promise<string> {
  const message = createReceiptMessage(targetId, grade, timestamp);
  const signature = await ed25519.signAsync(message, hexToBytes(privateKey));
  return `ed25519:${bytesToHex(signature)}`;
}
