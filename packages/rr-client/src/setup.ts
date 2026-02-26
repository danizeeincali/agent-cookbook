/**
 * First-use setup for Agent Cookbook
 * Generates keypair, creates config, and shows privacy notice
 */

import { mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadConfig, saveConfig, getConfigPath } from './config.js';
import type { CookbookConfig } from './config.js';
import { generateKeyPair } from '@agent-cookbook/receipts';

/**
 * Setup status
 */
export interface SetupStatus {
  is_first_use: boolean;
  has_config: boolean;
  has_agent_keys: boolean;
  public_key?: string;
}

/**
 * Check if this is first use (no config file exists)
 */
export async function isFirstUse(configPath?: string): Promise<boolean> {
  const path = getConfigPath(configPath);

  try {
    await access(path);
    return false; // Config exists
  } catch {
    return true; // Config doesn't exist
  }
}

/**
 * Get setup status
 */
export async function getSetupStatus(
  configPath?: string
): Promise<SetupStatus> {
  const firstUse = await isFirstUse(configPath);

  if (firstUse) {
    return {
      is_first_use: true,
      has_config: false,
      has_agent_keys: false,
    };
  }

  // Load config to check keys
  const config = await loadConfig(configPath);

  return {
    is_first_use: false,
    has_config: true,
    has_agent_keys: !!config.agent?.public_key,
    public_key: config.agent?.public_key,
  };
}

/**
 * Perform first-use setup
 * - Generate Ed25519 keypair
 * - Create config with defaults
 * - Create cache directory
 *
 * Idempotent: safe to call multiple times
 */
export async function performSetup(
  configPath?: string
): Promise<CookbookConfig> {
  const path = getConfigPath(configPath);
  const baseDir = dirname(path);

  // Ensure base directory exists
  await mkdir(baseDir, { recursive: true });

  // Create cache directory
  const cacheDir = join(baseDir, 'cache');
  await mkdir(cacheDir, { recursive: true });

  // Load or create config
  let config = await loadConfig(path);

  // Generate keypair if not exists
  if (!config.agent?.public_key || !config.agent?.private_key) {
    const keypair = await generateKeyPair();
    config.agent = {
      public_key: keypair.publicKey,
      private_key: keypair.privateKey,
    };

    // Save config with new keys
    await saveConfig(config, path);
  }

  return config;
}

/**
 * Show privacy notice (for CLI)
 */
export function getPrivacyNotice(publicKey: string): string {
  return `
🔧 Agent Cookbook - First-time setup complete

📊 Privacy Notice:
   Agent Cookbook collects anonymous success metrics to improve recipe quality.

   What's collected:
   • Success receipts (grade + cryptographic proof)
   • Workflow patterns (for auto-recipe detection)
   • Your public key: ${publicKey.slice(0, 16)}...

   What's NOT collected:
   • Personal information (name, email, IP)
   • Project names or paths
   • Code or file contents

   Auto-submit features:
   ✓ Auto-receipts enabled (submit success metrics)
   ✓ Auto-recipes enabled (detect reusable patterns)

   Opt out anytime: cookbook config --no-auto

   Learn more: https://cookbook.daniz.dev/privacy
`;
}

/**
 * Show quick setup summary (for CLI)
 */
export function getSetupSummary(publicKey: string): string {
  return `
✓ Setup complete
  Public key: ${publicKey.slice(0, 16)}...
  Config: ~/.agent-cookbook/config.json

  Opt out: cookbook config --no-auto
`;
}
