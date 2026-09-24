export interface EvalCase {
  id: number;
  name?: string;
  prompt: string;
  expected_output: string;
  expectations: string[];
  files: string[];
  source?: string;
  fixture?: string;
  verify?: string;
  host?: { extension: string; tools: string[]; context: string };
}

export interface EvalSuite {
  skill_name: string;
  evaluation_type: "planning" | "execution";
  evals: EvalCase[];
}

export interface AgentRun {
  duration_ms: number;
  tokens: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
    total: number;
  } | null;
  model_calls: number;
  models: string[];
  tool_calls: Array<{
    id: string;
    name: string;
    args: unknown;
    result: unknown;
    is_error: boolean | null;
  }>;
  response: string;
  prompt: string;
  evidence: unknown[];
  stderr: string;
  trace: string;
  session_jsonl?: string;
  session_html?: string;
  export_error?: string;
  error: string | null;
}

export interface Check {
  expectation: string;
  passed: boolean;
  evidence: string;
}

export interface ProjectOutput {
  files: Array<{
    path: string;
    before: string | null;
    after: string | null;
    diff: string;
  }>;
  verification: {
    exit_code: number | null;
    output: string;
    error: string | null;
  };
}

export interface CaseResult {
  test: EvalCase;
  output?: ProjectOutput;
  host_log?: string;
  status: "passed" | "failed" | "error";
  executor: AgentRun;
  judge: AgentRun | null;
  checks: Check[];
  error: string | null;
}

export interface EvalReport {
  skill_name: string;
  evaluation_type: EvalSuite["evaluation_type"];
  started_at: string;
  model: string;
  judge_model: string;
  omp_version: string;
  skills_hash: string;
  suite_hash: string;
  harness_hash: string;
  thinking: string;
  publication?: string;
  system_prompt?: string;
  omp_config?: unknown;
  results: CaseResult[];
}
