/**
 * Prometheus Orchestration System — Agent Cookbook Recipes
 *
 * Battle-tested patterns from a production system where Prometheus (an AI agent
 * running in a container) orchestrates headless Claude Code agents on the host
 * machine. These recipes capture the core patterns: IPC, tmux sessions, git
 * worktrees, TDD swarms, Q-learning workflow selection, and checkpoint gating.
 *
 * Usage:
 *   npx tsx examples/prometheus-recipes.ts           # Log recipe structures
 *   npx tsx examples/prometheus-recipes.ts --submit   # Submit to running node
 */

import { RRClient } from '@agent-cookbook/client';

// ---------------------------------------------------------------------------
// Recipe 1: AI Agent Orchestrator with Tmux & Git Worktrees
// ---------------------------------------------------------------------------
// The foundational pattern: spawn isolated AI coding agents that work in
// parallel on separate branches, auto-create PRs, and report back. Each agent
// gets its own worktree so there are zero merge conflicts during parallel work.

const tmuxWorktreeOrchestrator = {
  title: 'AI Agent Orchestrator with Tmux & Git Worktrees',
  description:
    'Spawn isolated AI coding agents that work in parallel on separate git branches via tmux sessions. ' +
    'Each agent gets its own worktree for zero-conflict parallel development, auto-creates PRs on completion, ' +
    'and reports results back to the orchestrator. Proven pattern from Prometheus orchestration system.',
  tags: ['agent-orchestration', 'tmux', 'git-worktree', 'parallel-agents', 'ci-cd'],
  version: '1.0.0',
  steps: [
    {
      index: 1,
      title: 'Create Git Worktree for Agent Isolation',
      spec: `Given: repo_path string (absolute path to git repository), branch_name string (unique per agent, e.g. "agent/feat-auth-api")
When: run "git worktree add <worktree_path> -b <branch_name>" where worktree_path is "<repo_path>/.worktrees/<branch_name>"
Then: return { worktree_path: string, branch_name: string, base_commit: string (HEAD sha at creation) }
Errors: if branch already exists throw BranchExistsError; if repo has uncommitted changes on target, warn but proceed; if .worktrees/ dir missing, create it first`,
      inputs: ['repo_path: string', 'branch_name: string'],
      outputs: ['worktree_path: string', 'branch_name: string', 'base_commit: string'],
    },
    {
      index: 2,
      title: 'Spawn Tmux Session with Headless AI Agent',
      spec: `Given: worktree_path string, task string (natural language task description), workflow string (optional, e.g. "/w-tdd-swarm"), session_name string (unique, e.g. "agent-<id>")
When: create tmux session with "tmux new-session -d -s <session_name> -c <worktree_path>" then send keys to run the AI agent CLI with the task and optional workflow command as input
Then: return { session_name: string, pid: number (tmux server pid), started_at: string (ISO timestamp) }
Errors: if tmux is not installed throw DependencyMissingError; if max concurrent agents exceeded (default 2) throw ConcurrencyLimitError; if session_name conflicts throw SessionExistsError`,
      inputs: ['worktree_path: string', 'task: string', 'workflow?: string', 'session_name: string'],
      outputs: ['session_name: string', 'pid: number', 'started_at: string'],
    },
    {
      index: 3,
      title: 'Monitor Agent Completion via Session Polling',
      spec: `Given: session_name string, poll_interval_ms number (default 5000), timeout_ms number (default 3600000 — 1 hour)
When: poll tmux session existence with "tmux has-session -t <session_name>" every poll_interval_ms; session exit means the agent finished; also capture last 500 lines of tmux output with "tmux capture-pane -t <session_name> -p -S -500"
Then: return { status: "completed" | "timeout" | "error", duration_ms: number, output_tail: string (last 500 lines) }
Errors: if session disappears unexpectedly check tmux pane output for crash indicators; on timeout, capture output before killing session with "tmux kill-session -t <session_name>"`,
      inputs: ['session_name: string', 'poll_interval_ms?: number', 'timeout_ms?: number'],
      outputs: ['status: string', 'duration_ms: number', 'output_tail: string'],
    },
    {
      index: 4,
      title: 'Detect PR Creation and Report Results',
      spec: `Given: branch_name string, repo_path string, output_tail string (from monitoring step)
When: check for PR creation by running "gh pr list --head <branch_name> --json number,url,title,state" in repo_path; parse the agent's output tail for summary lines or PR URLs
Then: return { pr_url?: string, pr_number?: number, pr_title?: string, summary: string (extracted from agent output or PR body) }
Errors: if gh CLI not authenticated throw AuthError; if no PR found, return summary from output_tail with pr_url as null (agent may have committed without creating PR)`,
      inputs: ['branch_name: string', 'repo_path: string', 'output_tail: string'],
      outputs: ['pr_url?: string', 'pr_number?: number', 'pr_title?: string', 'summary: string'],
    },
    {
      index: 5,
      title: 'Cleanup Worktree After Merge',
      spec: `Given: worktree_path string, branch_name string, repo_path string, force boolean (default false)
When: remove worktree with "git worktree remove <worktree_path>" from repo_path; if branch was merged, delete it with "git branch -d <branch_name>"; if force is true, use -D and --force flags
Then: return { cleaned: boolean, branch_deleted: boolean }
Errors: if worktree has uncommitted changes and force is false, throw DirtyWorktreeError with list of changed files; if worktree path doesn't exist, log warning and return cleaned=true`,
      inputs: ['worktree_path: string', 'branch_name: string', 'repo_path: string', 'force?: boolean'],
      outputs: ['cleaned: boolean', 'branch_deleted: boolean'],
    },
  ],
};

// ---------------------------------------------------------------------------
// Recipe 2: File-Based IPC for Containerized AI Agents
// ---------------------------------------------------------------------------
// Container↔host communication using filesystem polling. No sockets, no
// network, just JSON files dropped into watched directories. The container
// writes task files; the host picks them up, processes them, and writes
// response files back. Dead-letter directory handles failures.

const fileBasedIpc = {
  title: 'File-Based IPC for Containerized AI Agents',
  description:
    'Implement container-to-host communication using filesystem polling with JSON files. ' +
    'No sockets or network required — the container writes task files to a shared mount, ' +
    'the host watches and processes them, then writes response files back. Includes dead-letter ' +
    'directory for failed tasks. Battle-tested pattern from NanoClaw/Prometheus system.',
  tags: ['ipc', 'container', 'file-polling', 'async-communication', 'sandboxing'],
  version: '1.0.0',
  steps: [
    {
      index: 1,
      title: 'Set Up IPC Directory Structure',
      spec: `Given: ipc_root string (shared mount path, e.g. "/workspace/ipc")
When: create directory tree: <ipc_root>/tasks/ (container writes here), <ipc_root>/responses/ (host writes here), <ipc_root>/dead-letter/ (failed tasks moved here); set permissions so container user can write to tasks/ and read from responses/
Then: return { tasks_dir: string, responses_dir: string, dead_letter_dir: string }
Errors: if ipc_root is not a mounted volume, throw MountNotFoundError; if permissions cannot be set, throw PermissionError`,
      inputs: ['ipc_root: string'],
      outputs: ['tasks_dir: string', 'responses_dir: string', 'dead_letter_dir: string'],
    },
    {
      index: 2,
      title: 'Write Task File from Container Agent',
      spec: `Given: tasks_dir string, task_type string (one of "spawn_agent" | "schedule" | "send_message" | "check_agents" | "stop_agent" | "redirect_agent"), payload object (task-specific data)
When: write JSON file to tasks_dir with naming convention "<task_type>_<timestamp_ms>.json" containing { type: task_type, ...payload, created_at: ISO timestamp }; use atomic write (write to .tmp then rename) to prevent partial reads
Then: return { task_file: string (full path), task_id: string (filename without extension) }
Errors: if tasks_dir is not writable throw WritePermissionError; if payload fails JSON serialization throw SerializationError`,
      inputs: ['tasks_dir: string', 'task_type: string', 'payload: object'],
      outputs: ['task_file: string', 'task_id: string'],
    },
    {
      index: 3,
      title: 'Poll and Process IPC Files on Host',
      spec: `Given: tasks_dir string, poll_interval_ms number (default 1000), handler_map object (maps task_type to async handler function)
When: watch tasks_dir with fs.watch or polling loop; on new .json file: read and parse it, route to handler by type field, await handler result; delete processed file from tasks_dir after successful handling
Then: return { processed_count: number, errors: Array<{ task_id: string, error: string }> } (per poll cycle)
Errors: if JSON parse fails, move file to dead-letter/ with error metadata appended; if handler throws, move to dead-letter/ and log error; if file is locked (partial write), skip and retry next cycle`,
      inputs: ['tasks_dir: string', 'poll_interval_ms?: number', 'handler_map: object'],
      outputs: ['processed_count: number', 'errors: Array<{ task_id: string, error: string }>'],
    },
    {
      index: 4,
      title: 'Write Response File Back to Container',
      spec: `Given: responses_dir string, task_id string, result object (handler output), success boolean
When: write JSON file to responses_dir named "<task_id>_response.json" containing { task_id, success, result, responded_at: ISO timestamp }; use atomic write pattern
Then: return { response_file: string }
Errors: if responses_dir not writable throw WritePermissionError; container should poll responses_dir for its task_id to pick up the result`,
      inputs: ['responses_dir: string', 'task_id: string', 'result: object', 'success: boolean'],
      outputs: ['response_file: string'],
    },
    {
      index: 5,
      title: 'Error Handling with Dead-Letter Directory',
      spec: `Given: dead_letter_dir string, task_file string (original path), error_message string, original_content object (parsed JSON or raw string if unparseable)
When: move the failed task file to dead_letter_dir with modified name "<original_name>.dead.json"; write companion metadata file "<original_name>.dead.meta.json" with { error: error_message, failed_at: ISO timestamp, original_path: task_file, retry_count: number }
Then: return { dead_letter_path: string, meta_path: string }
Errors: if dead_letter_dir is full (>1000 files), purge oldest 100 files and log warning; if move fails, log critical error and continue processing other tasks`,
      inputs: ['dead_letter_dir: string', 'task_file: string', 'error_message: string', 'original_content: object'],
      outputs: ['dead_letter_path: string', 'meta_path: string'],
    },
  ],
};

// ---------------------------------------------------------------------------
// Recipe 3: TDD-First Parallel Agent Swarm
// ---------------------------------------------------------------------------
// The workflow that drives Prometheus's most reliable output: plan first, write
// failing tests as acceptance criteria, then spawn parallel agents to implement.
// Tests act as the contract — agents can't "finish" until tests pass.

const tddSwarm = {
  title: 'TDD-First Parallel Agent Swarm',
  description:
    'Plan architecture, write failing acceptance tests as the contract, then spawn parallel AI agents to ' +
    'implement against those tests. Tests act as blocking gates — agents cannot "finish" until all tests pass. ' +
    'Includes memory search for prior solutions, user checkpoint gates, and knowledge compounding on completion.',
  tags: ['tdd', 'swarm', 'parallel-build', 'workflow', 'test-first', 'agent-coordination'],
  version: '1.0.0',
  steps: [
    {
      index: 1,
      title: 'Search Memory for Similar Past Solutions',
      spec: `Given: task_description string, memory_namespace string (e.g. "groups/main/memory/"), max_results number (default 5)
When: search memory files (markdown, JSON) for keywords extracted from task_description; rank by relevance using simple term frequency; also check recipe store via cookbook client discover(task_description)
Then: return { prior_solutions: Array<{ source: string, relevance: number, summary: string }>, cookbook_matches: Array<{ recipe_id: string, title: string, score: number }> }
Errors: if memory directory is empty or missing, return empty arrays and proceed; if cookbook node unreachable, log warning and continue with local memory only`,
      inputs: ['task_description: string', 'memory_namespace?: string', 'max_results?: number'],
      outputs: [
        'prior_solutions: Array<{ source: string, relevance: number, summary: string }>',
        'cookbook_matches: Array<{ recipe_id: string, title: string, score: number }>',
      ],
    },
    {
      index: 2,
      title: 'Plan Architecture with User Checkpoint Gate',
      spec: `Given: task_description string, prior_solutions array (from step 1), codebase_context string (key file paths and patterns)
When: generate architecture plan with: 1) component breakdown, 2) file changes needed, 3) test strategy, 4) risk assessment; present plan to user and BLOCK until explicit approval ("approved", "yes", "go", "lgtm")
Then: return { plan: object (structured plan), approved: boolean, user_feedback?: string }
Errors: if user rejects plan, incorporate feedback and regenerate (max 3 iterations); if user provides no response within timeout, pause workflow and notify`,
      inputs: ['task_description: string', 'prior_solutions: array', 'codebase_context: string'],
      outputs: ['plan: object', 'approved: boolean', 'user_feedback?: string'],
    },
    {
      index: 3,
      title: 'Write Acceptance Tests — Must Fail (Blocking Gate)',
      spec: `Given: plan object (from step 2), test_framework string (e.g. "vitest", "jest", "pytest")
When: write acceptance tests based on the plan's component breakdown; tests MUST define the public API contracts (function signatures, expected behaviors, edge cases); run the test suite to confirm ALL tests fail (red phase of TDD)
Then: return { test_files: string[] (paths written), test_count: number, all_failing: boolean }
Errors: BLOCKING GATE — if any test passes, the implementation already exists or tests are wrong; halt and require human review before proceeding; if test framework not found, install it first`,
      inputs: ['plan: object', 'test_framework: string'],
      outputs: ['test_files: string[]', 'test_count: number', 'all_failing: boolean'],
    },
    {
      index: 4,
      title: 'Spawn Parallel Build Agents',
      spec: `Given: plan object, test_files string[], max_agents number (default 2), repo_path string
When: partition the plan into independent work units (e.g. by component or module); for each unit, spawn an agent (using tmux+worktree recipe) with task = "implement <component> — tests at <test_file> must pass"; agents work in parallel on isolated branches
Then: return { agents: Array<{ agent_id: string, component: string, branch: string, status: string }> }
Errors: if spawn fails for any agent, retry once then mark that component for serial execution; if agents exceed timeout, capture partial work and report`,
      inputs: ['plan: object', 'test_files: string[]', 'max_agents?: number', 'repo_path: string'],
      outputs: ['agents: Array<{ agent_id: string, component: string, branch: string, status: string }>'],
    },
    {
      index: 5,
      title: 'Integrate Results and Verify All Tests Pass',
      spec: `Given: agents array (from step 4), repo_path string, test_files string[]
When: for each completed agent, merge their branch into integration branch; resolve any merge conflicts (prefer agent changes for their component, flag conflicts for review); run full test suite on integrated branch
Then: return { all_passing: boolean, test_results: object (pass/fail counts), merge_conflicts: string[] (files with conflicts), integration_branch: string }
Errors: if tests fail after integration, identify which agent's changes caused regression; if merge conflicts are unresolvable, flag for human review`,
      inputs: ['agents: array', 'repo_path: string', 'test_files: string[]'],
      outputs: ['all_passing: boolean', 'test_results: object', 'merge_conflicts: string[]', 'integration_branch: string'],
    },
    {
      index: 6,
      title: 'Compound Solution to Memory Namespace',
      spec: `Given: task_description string, plan object, test_files string[], integration_branch string, memory_namespace string
When: write a structured knowledge document to memory_namespace containing: 1) problem statement, 2) solution architecture, 3) key decisions and rationale, 4) test patterns used, 5) gotchas encountered; format as markdown with frontmatter tags for searchability
Then: return { memory_file: string (path written), tags: string[], knowledge_summary: string }
Errors: if memory_namespace is read-only, log warning and output to stdout instead; if write fails, retry to alternate path`,
      inputs: ['task_description: string', 'plan: object', 'test_files: string[]', 'integration_branch: string', 'memory_namespace: string'],
      outputs: ['memory_file: string', 'tags: string[]', 'knowledge_summary: string'],
    },
  ],
};

// ---------------------------------------------------------------------------
// Recipe 4: Q-Learning Workflow Optimizer for AI Agents
// ---------------------------------------------------------------------------
// The intelligence layer that learns which workflows work best for which task
// types. Tracks outcomes, updates Q-values, and recommends the best workflow
// for new tasks. Simple but effective — no neural nets, just a Q-table.

const qLearningOptimizer = {
  title: 'Q-Learning Workflow Optimizer for AI Agents',
  description:
    'Track which workflows succeed for which task types using a Q-table (task types × workflows). ' +
    'Record outcomes, update Q-values with reward signals, and recommend the best workflow for new tasks. ' +
    'Simple reinforcement learning — no neural nets, just tabular Q-learning with fast/slow bonuses.',
  tags: ['q-learning', 'reinforcement-learning', 'workflow-optimization', 'agent-intelligence', 'meta-learning'],
  version: '1.0.0',
  steps: [
    {
      index: 1,
      title: 'Define Q-Table Structure',
      spec: `Given: task_types string[] (e.g. ["feature", "bugfix", "refactor", "security", "performance"]), workflows string[] (e.g. ["tdd-swarm", "fix", "debug", "hotfix", "review", "swarm"])
When: initialize Q-table as a 2D map: Record<task_type, Record<workflow, { q_value: number, visits: number }>>; set initial q_values to 0.5 (optimistic initialization); persist to JSON file at <data_dir>/q-table.json
Then: return { q_table: object, task_type_count: number, workflow_count: number, file_path: string }
Errors: if data_dir not writable throw StorageError; if q-table file exists, load it instead of reinitializing (idempotent)`,
      inputs: ['task_types: string[]', 'workflows: string[]', 'data_dir: string'],
      outputs: ['q_table: object', 'task_type_count: number', 'workflow_count: number', 'file_path: string'],
    },
    {
      index: 2,
      title: 'Record Outcome Event',
      spec: `Given: task_type string, workflow string, success boolean, duration_ms number, metadata object (optional — PR url, test counts, etc.)
When: create outcome record { task_type, workflow, success, duration_ms, metadata, recorded_at: ISO timestamp }; append to outcome log at <data_dir>/outcomes.jsonl (one JSON object per line)
Then: return { outcome_id: string (line number or hash), outcome_count: number (total in log) }
Errors: if task_type or workflow not in Q-table, add them dynamically with initial q_value 0.5; if log file exceeds 10MB, rotate to outcomes.1.jsonl`,
      inputs: ['task_type: string', 'workflow: string', 'success: boolean', 'duration_ms: number', 'metadata?: object'],
      outputs: ['outcome_id: string', 'outcome_count: number'],
    },
    {
      index: 3,
      title: 'Update Q-Values with Reward Signal',
      spec: `Given: task_type string, workflow string, success boolean, duration_ms number, learning_rate number (default 0.1), median_duration_ms number (running median for this task_type)
When: compute reward = success ? +1.0 : -0.5; add fast bonus +0.2 if duration_ms < median_duration_ms * 0.8; add slow penalty -0.1 if duration_ms > median_duration_ms * 1.5; update Q-value: q_new = q_old + learning_rate * (reward - q_old); increment visits counter; persist updated Q-table
Then: return { previous_q: number, new_q: number, reward: number, visits: number }
Errors: if Q-value goes below 0, clamp to 0; if Q-value exceeds 1.5, clamp to 1.5; if persistence fails, keep in-memory and retry on next update`,
      inputs: ['task_type: string', 'workflow: string', 'success: boolean', 'duration_ms: number', 'learning_rate?: number'],
      outputs: ['previous_q: number', 'new_q: number', 'reward: number', 'visits: number'],
    },
    {
      index: 4,
      title: 'Suggest Workflow by Highest Q-Value',
      spec: `Given: task_type string, exploration_rate number (default 0.1, epsilon for epsilon-greedy)
When: with probability (1 - exploration_rate), select workflow with highest Q-value for task_type (exploit); with probability exploration_rate, select a random workflow (explore); if task_type has fewer than 3 total visits, always explore; break ties by selecting the workflow with fewer visits (prefer less-explored)
Then: return { recommended_workflow: string, q_value: number, confidence: string ("high" if visits > 10, "medium" if > 3, "low" otherwise), exploration: boolean (true if random) }
Errors: if task_type not in Q-table, return the globally highest-performing workflow as fallback`,
      inputs: ['task_type: string', 'exploration_rate?: number'],
      outputs: ['recommended_workflow: string', 'q_value: number', 'confidence: string', 'exploration: boolean'],
    },
    {
      index: 5,
      title: 'Generate Effectiveness Report',
      spec: `Given: q_table object, outcomes_log_path string
When: compute per-workflow stats: success_rate, avg_duration, total_uses; compute per-task_type stats: best_workflow, worst_workflow, avg_q_value; generate markdown report with tables showing: 1) workflow leaderboard, 2) task type × workflow matrix with Q-values, 3) recent trend (last 20 outcomes)
Then: return { report_markdown: string, best_combo: { task_type: string, workflow: string, q_value: number }, worst_combo: { task_type: string, workflow: string, q_value: number } }
Errors: if outcomes log is empty, generate report with "insufficient data" message; if log is corrupted, skip malformed lines and note count of skipped entries`,
      inputs: ['q_table: object', 'outcomes_log_path: string'],
      outputs: [
        'report_markdown: string',
        'best_combo: { task_type: string, workflow: string, q_value: number }',
        'worst_combo: { task_type: string, workflow: string, q_value: number }',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Recipe 5: Checkpoint-Gated Workflow Engine
// ---------------------------------------------------------------------------
// The enforcement layer that prevents agents from skipping critical steps.
// Three gate types: user-gate (requires human approval), blocking-gate
// (programmatic condition must be met), auto-proceed (just logs and continues).
// TodoWrite task list is mandatory first action for traceability.

const checkpointWorkflowEngine = {
  title: 'Checkpoint-Gated Workflow Engine',
  description:
    'Enforce mandatory workflow phases with three gate types: user-gate (human approval required), ' +
    'blocking-gate (programmatic condition must pass), and auto-proceed (logs and continues). ' +
    'Prevents agents from skipping critical steps like testing, review, or security checks. ' +
    'TodoWrite task list initialization is mandatory for traceability.',
  tags: ['workflow-engine', 'checkpoint', 'gating', 'agent-guardrails', 'quality-enforcement'],
  version: '1.0.0',
  steps: [
    {
      index: 1,
      title: 'Define Workflow Phases with Gate Types',
      spec: `Given: workflow_name string, phases array of { name: string, gate_type: "user-gate" | "blocking-gate" | "auto-proceed", required_artifact?: string, description: string }
When: validate phase definitions: at least 2 phases required, no duplicate names, each phase has a valid gate_type; store workflow definition as JSON at <config_dir>/<workflow_name>.workflow.json
Then: return { workflow_id: string (hash of definition), phase_count: number, gates: Array<{ phase: string, gate_type: string }> }
Errors: if workflow_name contains invalid chars throw InvalidNameError; if duplicate phase names found throw DuplicatePhaseError; if no blocking-gate or user-gate exists, warn that workflow has no enforcement points`,
      inputs: ['workflow_name: string', 'phases: array', 'config_dir: string'],
      outputs: ['workflow_id: string', 'phase_count: number', 'gates: Array<{ phase: string, gate_type: string }>'],
    },
    {
      index: 2,
      title: 'Initialize TodoWrite Task List as Mandatory First Action',
      spec: `Given: workflow_id string, phases array (from step 1), task_context string (high-level description)
When: create a TodoWrite task list with one entry per workflow phase; each entry includes phase name, gate type, and required artifact; this MUST be the first action when a workflow begins — any agent output before TodoWrite initialization is a violation
Then: return { task_list: Array<{ id: string, phase: string, status: "pending", gate_type: string }>, initialized_at: string }
Errors: if TodoWrite tool is unavailable, fall back to writing task list as markdown file; if task_context is empty throw MissingContextError`,
      inputs: ['workflow_id: string', 'phases: array', 'task_context: string'],
      outputs: ['task_list: Array<{ id: string, phase: string, status: string, gate_type: string }>', 'initialized_at: string'],
    },
    {
      index: 3,
      title: 'Execute Phase with Required Output Artifact',
      spec: `Given: phase object (current phase from workflow), agent_context object (workspace path, tools available), previous_artifacts object (outputs from prior phases)
When: execute the phase's work (implementation, testing, review, etc.); on completion, verify the required_artifact exists and is non-empty (e.g. test file for testing phase, PR URL for submit phase, review document for review phase)
Then: return { phase_name: string, artifact: string (path or value), artifact_valid: boolean, duration_ms: number }
Errors: if required_artifact is specified but not produced, mark phase as failed and block progression; if execution throws, capture error and mark phase as errored with diagnostics`,
      inputs: ['phase: object', 'agent_context: object', 'previous_artifacts: object'],
      outputs: ['phase_name: string', 'artifact: string', 'artifact_valid: boolean', 'duration_ms: number'],
    },
    {
      index: 4,
      title: 'Enforce Blocking Gate',
      spec: `Given: gate_type string, phase_name string, artifact string (from step 3), condition object (for blocking-gate: { check: "tests_must_fail" | "tests_must_pass" | "file_exists" | "custom", custom_command?: string })
When: for "user-gate" — present artifact and summary to user, block until explicit approval; for "blocking-gate" — evaluate condition programmatically (e.g. run test suite and verify exit code matches expected); for "auto-proceed" — log phase completion and continue immediately
Then: return { gate_passed: boolean, gate_type: string, details: string (reason for pass/fail), waited_ms: number (0 for auto-proceed) }
Errors: for user-gate, if no response within timeout_ms (default 3600000) pause workflow; for blocking-gate, if condition evaluation throws, treat as gate failure; NEVER auto-pass a blocking-gate on error`,
      inputs: ['gate_type: string', 'phase_name: string', 'artifact: string', 'condition?: object'],
      outputs: ['gate_passed: boolean', 'gate_type: string', 'details: string', 'waited_ms: number'],
    },
    {
      index: 5,
      title: 'Compound Results to Memory Namespace on Completion',
      spec: `Given: workflow_name string, phase_results Array<{ phase_name: string, artifact: string, duration_ms: number, gate_passed: boolean }>, memory_namespace string
When: all phases completed and all gates passed; write structured completion document to memory_namespace with: workflow name, phase summaries, total duration, artifacts produced, success/failure for each gate; tag document for future searchability
Then: return { memory_file: string, total_duration_ms: number, all_gates_passed: boolean, summary: string }
Errors: if any gate failed, mark workflow as incomplete in memory with failure point; if memory write fails, output to stdout as fallback`,
      inputs: ['workflow_name: string', 'phase_results: array', 'memory_namespace: string'],
      outputs: ['memory_file: string', 'total_duration_ms: number', 'all_gates_passed: boolean', 'summary: string'],
    },
  ],
};

// ---------------------------------------------------------------------------
// All recipes collected
// ---------------------------------------------------------------------------

const ALL_RECIPES = [
  tmuxWorktreeOrchestrator,
  fileBasedIpc,
  tddSwarm,
  qLearningOptimizer,
  checkpointWorkflowEngine,
];

// ---------------------------------------------------------------------------
// Validation and submission
// ---------------------------------------------------------------------------

function validateRecipe(recipe: typeof ALL_RECIPES[number]): string[] {
  const errors: string[] = [];

  if (!recipe.title || recipe.title.length > 200) {
    errors.push(`Title missing or exceeds 200 chars: "${recipe.title}"`);
  }
  if (!recipe.description || recipe.description.length > 1000) {
    errors.push(`Description missing or exceeds 1000 chars (${recipe.description?.length ?? 0})`);
  }
  if (!recipe.tags?.length) {
    errors.push('Tags array is empty');
  }
  for (const tag of recipe.tags) {
    if (!/^[a-z0-9-]+$/.test(tag)) {
      errors.push(`Invalid tag format: "${tag}" (must be lowercase alphanumeric with hyphens)`);
    }
  }
  if (!recipe.steps?.length) {
    errors.push('Steps array is empty');
  }
  for (const step of recipe.steps) {
    if (!step.title || step.title.length > 200) {
      errors.push(`Step ${step.index}: title missing or exceeds 200 chars`);
    }
    if (!step.spec) {
      errors.push(`Step ${step.index}: spec is empty`);
    }
    // Verify Given/When/Then/Errors format
    const hasWhen = step.spec.includes('When:');
    const hasThen = step.spec.includes('Then:');
    if (!hasWhen || !hasThen) {
      errors.push(`Step ${step.index}: spec missing When/Then sections`);
    }
  }

  return errors;
}

async function submitAll(baseUrl = 'http://localhost:3000') {
  const client = new RRClient({ baseUrl });

  console.log('Submitting 5 Prometheus recipes to R&R system...\n');

  for (const recipe of ALL_RECIPES) {
    try {
      // Validate locally first
      const errors = validateRecipe(recipe);
      if (errors.length > 0) {
        console.error(`✗ ${recipe.title}`);
        errors.forEach((e) => console.error(`  - ${e}`));
        continue;
      }

      console.log(`Submitting: ${recipe.title}`);
      console.log(`  Tags: ${recipe.tags.join(', ')}`);
      console.log(`  Steps: ${recipe.steps.length}`);

      // POST to /recipes endpoint
      const response = await fetch(`${baseUrl}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`  ✗ HTTP ${response.status}: ${body}`);
        continue;
      }

      const result = await response.json();
      console.log(`  ✓ Created: ${result.id ?? 'ok'}\n`);
    } catch (error: any) {
      console.error(`  ✗ ${error.message}\n`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main — validate and optionally submit
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Prometheus Orchestration Recipes ===\n');

  // Validate all recipes
  let allValid = true;
  for (const recipe of ALL_RECIPES) {
    const errors = validateRecipe(recipe);
    if (errors.length > 0) {
      console.error(`✗ ${recipe.title}`);
      errors.forEach((e) => console.error(`  - ${e}`));
      allValid = false;
    } else {
      console.log(`✓ ${recipe.title} (${recipe.steps.length} steps, tags: ${recipe.tags.join(', ')})`);
    }
  }

  console.log(`\nTotal: ${ALL_RECIPES.length} recipes, ${ALL_RECIPES.reduce((n, r) => n + r.steps.length, 0)} steps`);

  if (!allValid) {
    console.error('\nValidation failed. Fix errors above before submitting.');
    process.exit(1);
  }

  console.log('\nAll recipes valid.');

  // Submit if --submit flag passed
  if (process.argv.includes('--submit')) {
    const baseUrl = process.argv.find((a) => a.startsWith('--url='))?.split('=')[1] ?? 'http://localhost:3000';
    await submitAll(baseUrl);
  } else {
    console.log('Run with --submit to register recipes with a running node.');
    console.log('\nRecipe structures:\n');
    console.log(JSON.stringify(ALL_RECIPES, null, 2));
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
