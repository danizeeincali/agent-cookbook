/**
 * Node configuration
 */

export interface NodeConfig {
  nodeId: string;
  port: number;
  host: string;
  dataDir: string;
  cluster?: ClusterConfig;
}

export interface ClusterConfig {
  members: string[];
  replicationFactor: number;
  syncMode: 'sync' | 'semi-sync' | 'async';
  minReplicas: number;
  raft?: RaftConfig;
}

export interface RaftConfig {
  electionTimeoutMinMs: number;
  electionTimeoutMaxMs: number;
  heartbeatIntervalMs: number;
}

export const DEFAULT_CONFIG: NodeConfig = {
  nodeId: process.env.NODE_ID || 'node-1',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  dataDir: process.env.DATA_DIR || './data',
  cluster: {
    members: (process.env.CLUSTER_MEMBERS || 'node-1:3000').split(','),
    replicationFactor: parseInt(process.env.REPLICATION_FACTOR || '3', 10),
    syncMode: (process.env.SYNC_MODE || 'semi-sync') as any,
    minReplicas: parseInt(process.env.MIN_REPLICAS || '2', 10),
    raft: {
      electionTimeoutMinMs: 150,
      electionTimeoutMaxMs: 300,
      heartbeatIntervalMs: 50,
    },
  },
};

export function loadConfig(): NodeConfig {
  return DEFAULT_CONFIG;
}
