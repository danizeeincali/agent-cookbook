/**
 * Tests for Ed25519 signature verification
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateKeyPair, signReceipt, verifyReceiptSignature, createReceiptMessage } from './crypto.js';

test('generateKeyPair creates valid keypair', async () => {
  const keys = await generateKeyPair();

  assert.ok(keys.privateKey, 'Private key should exist');
  assert.ok(keys.publicKey, 'Public key should exist');
  assert.equal(keys.privateKey.length, 64, 'Private key should be 64 hex chars');
  assert.equal(keys.publicKey.length, 64, 'Public key should be 64 hex chars');
});

test('sign and verify receipt signature', async () => {
  const keys = await generateKeyPair();
  const targetId = 'sha256:abc123';
  const grade = 0.95;
  const timestamp = new Date().toISOString();

  // Sign the receipt
  const signature = await signReceipt(targetId, grade, timestamp, keys.privateKey);

  assert.ok(signature.startsWith('ed25519:'), 'Signature should have ed25519: prefix');

  // Verify the signature
  const isValid = await verifyReceiptSignature(targetId, grade, timestamp, signature, keys.publicKey);

  assert.ok(isValid, 'Signature should verify successfully');
});

test('invalid signature fails verification', async () => {
  const keys = await generateKeyPair();
  const targetId = 'sha256:abc123';
  const grade = 0.95;
  const timestamp = new Date().toISOString();

  // Create valid signature
  const signature = await signReceipt(targetId, grade, timestamp, keys.privateKey);

  // Try to verify with wrong grade (should fail)
  const isValid = await verifyReceiptSignature(targetId, 0.80, timestamp, signature, keys.publicKey);

  assert.equal(isValid, false, 'Modified message should fail verification');
});

test('signature from different key fails verification', async () => {
  const keys1 = await generateKeyPair();
  const keys2 = await generateKeyPair();
  const targetId = 'sha256:abc123';
  const grade = 0.95;
  const timestamp = new Date().toISOString();

  // Sign with key1
  const signature = await signReceipt(targetId, grade, timestamp, keys1.privateKey);

  // Try to verify with key2's public key (should fail)
  const isValid = await verifyReceiptSignature(targetId, grade, timestamp, signature, keys2.publicKey);

  assert.equal(isValid, false, 'Signature from wrong key should fail');
});

test('createReceiptMessage is deterministic', () => {
  const targetId = 'sha256:abc123';
  const grade = 0.95;
  const timestamp = '2026-02-26T10:00:00Z';

  const message1 = createReceiptMessage(targetId, grade, timestamp);
  const message2 = createReceiptMessage(targetId, grade, timestamp);

  assert.deepEqual(message1, message2, 'Same inputs should produce same message hash');
});
