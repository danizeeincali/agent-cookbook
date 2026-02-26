#!/usr/bin/env node
/**
 * R&R Node HTTP Server
 */

import { createServer } from 'http';
import { RecipeStore, FilesystemStorage } from '@rr-system/store';
import { DiscoveryService } from '@rr-system/discover';
import { ReceiptEngine } from '@rr-system/receipts';
import { RouteHandler } from './routes.js';
import { loadConfig } from './config.js';

async function main() {
  const config = loadConfig();

  console.log(`Starting R&R Node: ${config.nodeId}`);
  console.log(`Data directory: ${config.dataDir}`);

  // Initialize storage
  const storage = new FilesystemStorage(config.dataDir);
  await storage.init();

  // Initialize services
  const store = new RecipeStore(storage);
  const discovery = new DiscoveryService(store);
  const receipts = new ReceiptEngine(store);

  // Create route handler
  const routes = new RouteHandler(store, discovery, receipts);

  // Create HTTP server
  const server = createServer((req, res) => {
    routes.handle(req, res).catch(err => {
      console.error('Request error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  });

  // Start server
  server.listen(config.port, config.host, () => {
    console.log(`R&R Node listening on http://${config.host}:${config.port}`);
    console.log(`Node ID: ${config.nodeId}`);
    if (config.cluster) {
      console.log(`Cluster members: ${config.cluster.members.join(', ')}`);
      console.log(`Replication factor: ${config.cluster.replicationFactor}`);
      console.log(`Sync mode: ${config.cluster.syncMode}`);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
