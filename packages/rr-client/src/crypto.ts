/**
 * Cryptographic utilities for client SDK
 */

import * as ed25519 from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Ed25519KeyPair } from './types.js';

/**
 * Generate ephemeral Ed25519 keypair for agent session
 */
export async function generateAgentKey(): Promise<Ed25519KeyPair> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKey(privateKey);

  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
  };
}

/**
 * Sign receipt message
 */
export async function signReceiptMessage(
  targetId: string,
  grade: number,
  timestamp: string,
  privateKey: string
): Promise<string> {
  const message = `${targetId}:${grade}:${timestamp}`;
  const messageHash = sha256(new TextEncoder().encode(message));
  const signature = await ed25519.sign(messageHash, hexToBytes(privateKey));
  return `ed25519:${bytesToHex(signature)}`;
}
