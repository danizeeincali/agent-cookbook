#!/usr/bin/env node
import { createServer } from 'http';
import { RecipeStore, FilesystemStorage, PostgresStorage } from '@agent-cookbook/store';
import { DiscoveryService } from '@agent-cookbook/discover';
import { ReceiptEngine } from '@agent-cookbook/receipts';
import { RouteHandler } from './routes.js';
import { loadConfig } from './config.js';

async function main() {
  const config = loadConfig();
  const databaseUrl = process.env.DATABASE_URL;

  console.log(`Starting R&R Node: ${config.nodeId}`);

  let storage: FilesystemStorage | PostgresStorage;

  if (databaseUrl) {
    console.log('Using PostgreSQL storage');
    storage = new PostgresStorage(databaseUrl);
  } else {
    console.log(`Using filesystem storage: ${config.dataDir}`);
    storage = new FilesystemStorage(config.dataDir);
  }

  await storage.init();

  const store = new RecipeStore(storage);
  const discovery = new DiscoveryService(store);
  const receipts = new ReceiptEngine(store);

  const routes = new RouteHandler(store, discovery, receipts);

  const server = createServer((req, res) => {
    routes.handle(req, res).catch(err => {
      console.error('Request error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  });

  server.listen(config.port, config.host, () => {
    console.log(`R&R Node listening on http://${config.host}:${config.port}`);
    console.log(`Node ID: ${config.nodeId}`);
    if (config.cluster) {
      console.log(`Cluster members: ${config.cluster.members.join(', ')}`);
      console.log(`Replication factor: ${config.cluster.replicationFactor}`);
      console.log(`Sync mode: ${config.cluster.syncMode}`);
    }
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    server.close(async () => {
      if ('close' in storage) {
        await (storage as PostgresStorage).close();
      }
      console.log('Server closed');
      process.exit(0);
    });
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
