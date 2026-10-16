import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgentRun, EvalReport } from "./types.ts";

function escape(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

function number(value: number | null | undefined): string {
  return value == null ? "Unavailable" : value.toLocaleString("en-US");
}

function total(runs: Array<AgentRun | null>): number | null {
  return runs.every((run) => run?.tokens)
    ? runs.reduce((sum, run) => sum + run!.tokens!.total, 0)
    : null;
}

function tokenRows(run: AgentRun | null): Array<[string, string]> {
  return [
    ["Input (uncached)", number(run?.tokens?.input)],
    ["Output", number(run?.tokens?.output)],
    ["Cache read", number(run?.tokens?.cache_read)],
    ["Cache write", number(run?.tokens?.cache_write)],
    ["Total", number(run?.tokens?.total)],
    ["Model calls", run ? number(run.model_calls) : "Not run"],
    ["Tool calls", run ? number(run.tool_calls.length) : "Not run"],
    ["Duration", run ? `${(run.duration_ms / 1000).toFixed(1)}s` : "Not run"],
  ];
}

const script = `
const reportData = document.querySelector('#report-data');
const report = JSON.parse(reportData.textContent);
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.querySelector('#download-report').addEventListener('click', () => download(reportData.textContent, 'results.json', 'application/json'));
document.querySelectorAll('[data-native-case]').forEach(button => button.addEventListener('click', () => {
  const result = report.results[Number(button.dataset.nativeCase)];
  const role = button.dataset.nativeAgent;
  download(result[role].session_html, 'case-' + result.test.id + '-' + role + '-omp.html', 'text/html');
}));
document.querySelectorAll('details[data-field]').forEach(detail => detail.addEventListener('toggle', () => {
  if (!detail.open || detail.dataset.loaded) return;
  const run = report.results[Number(detail.dataset.caseIndex)][detail.dataset.agent];
  detail.querySelector('pre').textContent = run[detail.dataset.field] || 'No content recorded.';
  detail.dataset.loaded = 'true';
}));
document.querySelectorAll('.artifacts a[href^="#"]').forEach(link => link.addEventListener('click', () => {
  const target = document.getElementById(link.hash.slice(1));
  if (target?.tagName === 'DETAILS') target.open = true;
}));
const search = document.querySelector('#search');
const status = document.querySelector('#status');
const cases = [...document.querySelectorAll('.case')];
function filter() {
  let visible = 0;
  for (const item of cases) {
    item.hidden = (status.value !== 'all' && item.dataset.status !== status.value) || !item.textContent.toLowerCase().includes(search.value.toLowerCase());
    if (!item.hidden) visible++;
  }
  document.querySelector('#visible').textContent = visible + ' of ' + cases.length + ' cases shown';
}
search.addEventListener('input', filter);
status.addEventListener('change', filter);
document.querySelector('#expand').addEventListener('click', () => cases.filter(c => !c.hidden).forEach(c => c.open = true));
document.querySelector('#collapse').addEventListener('click', () => cases.forEach(c => c.open = false));
`;

/** Both formats use the same saved run and check data; reports make no model calls. */
export async function writeReports(
  report: EvalReport,
  directory: string,
): Promise<void> {
  const execution = report.evaluation_type === "execution";
  const scope =
    (execution
      ? "Execution evaluation · Generated files and independent verification are captured. Skills are explicitly loaded; this does not test automatic routing or v0."
      : "Planning evaluation · Skills are explicitly loaded. Results do not establish runtime behavior, automatic routing, or v0 integration.") +
    (report.publication ? ` ${report.publication}` : "");
  const passed = report.results.filter(
    (result) => result.status === "passed",
  ).length;
  const failed = report.results.filter(
    (result) => result.status === "failed",
  ).length;
  const errors = report.results.filter(
    (result) => result.status === "error",
  ).length;
  const checksPassed = report.results
    .flatMap((result) => result.checks)
    .filter((check) => check.passed).length;
  const checksExpected = report.results.reduce(
    (sum, result) => sum + result.test.expectations.length,
    0,
  );
  const executorTokens = total(report.results.map((result) => result.executor));
  const judgeTokens = total(report.results.map((result) => result.judge));
  const caseHtml = report.results
    .map((result, caseIndex) => {
      const name = `${result.test.id.toString().padStart(2, "0")} / ${result.test.name ?? "Untitled case"}`;
      const artifacts = [
        ["Agent prompt", `case-${result.test.id}-executor-prompt`],
        ["Raw OMP events", `case-${result.test.id}-executor-trace`],
        ["Tool calls & results", `case-${result.test.id}-tools`],
      ];
      if (result.judge)
        artifacts.push([
          "Judge prompt & response",
          `case-${result.test.id}-judge-prompt`,
        ]);
      const nativeHtml = (["executor", "judge"] as const)
        .map((role) =>
          result[role]?.session_html
            ? `<button type="button" data-native-case="${caseIndex}" data-native-agent="${role}">Download OMP ${role === "executor" ? "agent" : "judge"} session</button>`
            : "",
        )
        .join("");
      const artifactHtml = `<div class="artifacts">${artifacts.map(([label, id]) => `<a href="#${id}">${label}</a>`).join("")}${nativeHtml}</div>`;
      const evidenceHtml = (["executor", "judge"] as const)
        .map((role) => {
          const run = result[role];
          if (!run) return "";
          return (
            [
              [
                "prompt",
                role === "executor"
                  ? "Full agent prompt"
                  : "Judge prompt & response",
              ],
              [
                "trace",
                `${role === "executor" ? "Agent" : "Judge"} raw OMP events`,
              ],
              [
                "stderr",
                `${role === "executor" ? "Agent" : "Judge"} diagnostic log`,
              ],
            ] as const
          )
            .map(
              ([field, label]) =>
                `<details class="inspector" id="case-${result.test.id}-${role}-${field}" data-case-index="${caseIndex}" data-agent="${role}" data-field="${field}"><summary>${label}</summary><pre></pre>${role === "judge" && field === "prompt" ? `<h4>Judge response</h4><pre>${escape(run.response)}</pre>` : ""}</details>`,
            )
            .join("");
        })
        .join("");
      const rows = tokenRows(result.executor);
      const judgeRows = tokenRows(result.judge);
      const metrics = rows
        .map(
          ([label, value], index) =>
            `<tr><th scope="row">${label}</th><td>${value}</td><td>${judgeRows[index][1]}</td></tr>`,
        )
        .join("");
      let outputHtml = "";
      if (result.output) {
        const { verification } = result.output;
        const files = [...result.output.files].sort(
          (a, b) =>
            Number(b.path === "src/index.ts") -
              Number(a.path === "src/index.ts") || a.path.localeCompare(b.path),
        );
        const verified = verification.exit_code === 0 && !verification.error;
        outputHtml = `<section class="project-output"><h3>Generated project <span>${files.length} changed files</span></h3><p class="small muted">Actual files captured after OMP finished. Open a file to inspect its contents and diff. Dependency folders, local .env files, and installed skill copies are omitted.</p>
          <div class="file-list">${
            files
              .map(
                (file, index) =>
                  `<details class="output-file" ${index === 0 ? "open" : ""}><summary><span class="file-path">${escape(file.path)}</span><span class="file-change">${file.before === null ? "Created" : file.after === null ? "Deleted" : "Modified"}</span></summary><div class="file-content"><h4>Final contents</h4><pre>${escape(file.after ?? "File deleted.")}</pre><details class="file-diff"><summary>Show diff</summary><pre>${file.diff
                    .split("\n")
                    .map(
                      (line) =>
                        `<span class="${line.startsWith("+") ? "diff-add" : line.startsWith("-") ? "diff-remove" : "diff-context"}">${escape(line)}\n</span>`,
                    )
                    .join("")}</pre></details></div></details>`,
              )
              .join("") || '<p class="muted">No project files changed.</p>'
          }</div>
          <details class="verification" open><summary><strong>Independent verification</strong> <span class="badge ${verified ? "passed" : "failed"}">${verified ? "Passed" : "Failed"}</span></summary><pre>${escape(verification.output + (verification.error ?? ""))}</pre><p class="small muted">Exit code: ${verification.exit_code ?? "Unavailable"}. A failed verification prevents the case from passing, even if the judge approves.</p></details>
          </section>`;
      }
      return `<details class="case" id="case-${result.test.id}" data-status="${result.status}" ${execution || result.status !== "passed" ? "open" : ""}>
      <summary><span class="case-title">${escape(name)}</span><span class="case-tokens">${number(result.executor.tokens?.total)} <small>tokens</small></span><span class="badge ${result.status}">${result.status}</span></summary>
      <div class="case-body"><p class="source">${escape(result.test.source ?? "Source not specified.")}</p>
      ${result.error ? `<div class="error-box"><strong>Run could not be graded</strong><pre>${escape(result.error)}</pre></div>` : ""}
      <section class="case-usage"><h3>Tokens used in this case</h3><div class="case-usage-totals"><div><span class="muted">Executor</span><strong>${number(result.executor.tokens?.total)}</strong></div><div><span class="muted">Judge</span><strong>${number(result.judge?.tokens?.total)}</strong></div><div><span class="muted">Combined</span><strong>${number(total([result.executor, result.judge]))}</strong></div></div><details><summary>Token breakdown, calls and timing</summary><table><thead><tr><th>Metric</th><th>Executor</th><th>Judge</th></tr></thead><tbody>${metrics}</tbody></table></details><p class="small muted">Totals include cached and repeated context. Judge usage is separate grading overhead.</p>${artifactHtml}${result.executor.export_error || result.judge?.export_error ? `<p class="small">OMP export unavailable: ${escape(result.executor.export_error ?? result.judge?.export_error)}</p>` : ""}</section>
      ${outputHtml}
      <div class="detail-grid"><section><h3>Assessment <span>${result.checks.filter((check) => check.passed).length}/${result.test.expectations.length}</span></h3>
      ${result.checks.length ? `<ul class="checks">${result.checks.map((check) => `<li><span class="check-icon ${check.passed ? "passed" : "failed"}">${check.passed ? "✓" : "×"}</span><div><strong>${check.passed ? "Pass" : "Fail"}</strong> · ${escape(check.expectation)}<p>${escape(check.evidence)}</p></div></li>`).join("")}</ul>` : '<p class="muted">Checks ungraded. A runner error is not a failed skill check.</p>'}</section>
      <section><h3>Usage</h3><table><thead><tr><th>Metric</th><th>Execution</th><th>Judge</th></tr></thead><tbody>${metrics}</tbody></table><p class="small muted">Reported models: ${escape(result.executor.models.join(", ") || "Unavailable")}<br>Judge: ${escape(result.judge?.models.join(", ") || "Unavailable")}</p></section></div>
      <details class="inspector"><summary>Task &amp; response</summary><h4>Task</h4><pre>${escape(result.test.prompt)}</pre><h4>Agent response</h4><pre>${escape(result.executor.response || "No response captured.")}</pre></details>
      <details class="inspector" id="case-${result.test.id}-tools"><summary>Tool calls <span>${result.executor.tool_calls.length}</span></summary>${result.executor.tool_calls.length ? result.executor.tool_calls.map((tool, index) => `<details class="tool"><summary>${index + 1}. ${escape(tool.name)} <span>${tool.is_error === null ? "Incomplete" : tool.is_error ? "Tool error" : "Completed"}</span></summary><h4>Arguments</h4><pre>${escape(JSON.stringify(tool.args, null, 2))}</pre><h4>Result</h4><pre>${escape(JSON.stringify(tool.result, null, 2))}</pre></details>`).join("") : '<p class="muted">No tool calls recorded.</p>'}</details>
      ${evidenceHtml}${result.host_log ? `<details class="inspector"><summary>Host integration log</summary><pre>${escape(result.host_log)}</pre></details>` : ""}</div></details>`;
    })
    .join("\n");
  const raw = JSON.stringify(report, null, 2);
  const embedded = raw.replaceAll("<", "\\u003c");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${createHash("sha256").update(script).digest("base64")}'; base-uri 'none'"><title>${escape(report.skill_name)} · Skill evals</title><style>
  :root{color-scheme:light;--ink:#172b2d;--muted:#55696b;--line:#d9e2e1;--paper:#f5f8f7;--teal:#086858;--green:#e1f3e9;--red:#9c302e;--amber:#845000}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--teal);text-underline-offset:3px}button,input,select{font:inherit}button,summary,select{cursor:pointer}button:focus-visible,a:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #0c8dba;outline-offset:3px}button{background:white;border:1px solid var(--line);border-radius:6px;padding:7px 12px;color:var(--ink)}button:hover{background:#edf4f1}aside{position:fixed;inset:0 auto 0 0;width:246px;padding:32px 24px;background:#fff;border-right:1px solid var(--line);overflow:auto}.brand{font-weight:750;letter-spacing:-.6px;font-size:23px}.brand span{color:var(--teal)}.eyebrow{text-transform:uppercase;font-size:11px;letter-spacing:1.5px;color:var(--muted);font-weight:650}.side-label{margin-top:40px}.side-link{display:block;padding:9px 0;text-decoration:none;font-weight:600}.side-meta{font-size:12px;overflow-wrap:anywhere}.side-meta dt{margin-top:18px;color:var(--muted)}.side-meta dd{margin:4px 0}.hash{font-family:ui-monospace,monospace;font-size:10px}main{max-width:1480px;margin-left:246px;padding:42px 42px 70px}header{display:flex;gap:24px;align-items:start;justify-content:space-between}h1{font-size:clamp(25px,3vw,36px);line-height:1.2;letter-spacing:-1px;margin:10px 0 12px;overflow-wrap:anywhere}h2{font-size:19px;letter-spacing:-.4px;margin:0}h3{font-size:14px;margin:0 0 16px;display:flex;justify-content:space-between}h3 span,h4{color:var(--muted)}h4{font-size:12px;margin:16px 0 8px}.muted,.source{color:var(--muted)}.small{font-size:12px}.header-actions{display:flex;gap:16px;font-size:12px;white-space:nowrap;padding-top:34px}.notice{border-left:3px solid var(--teal);padding:10px 15px;margin:25px 0;background:#eaf3ef;font-size:13px}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:28px 0 32px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:24px 0}.stat{padding:0 24px;border-left:1px solid var(--line)}.stat:first-child{padding-left:0;border:0}.stat .value{font-size:clamp(24px,2.5vw,34px);font-weight:650;letter-spacing:-1px;white-space:nowrap;font-variant-numeric:tabular-nums}.stat .label{color:var(--muted);font-size:12px;margin-bottom:6px}.stat .hint{font-size:11px;color:var(--muted);margin-top:3px}.section-head{display:flex;align-items:center;justify-content:space-between;margin:28px 0 15px;gap:12px}.controls{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-bottom:20px}.field{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:600;color:var(--muted)}.field:first-child{flex:1;min-width:160px}input,select{border:1px solid var(--line);border-radius:6px;background:white;color:var(--ink);padding:9px 12px;min-height:42px;width:100%}.count{font-size:12px;color:var(--muted)}.case{background:#fff;border:1px solid var(--line);border-radius:9px;margin-bottom:12px;overflow:hidden}.case[open]{border-color:#9abdb3}.case>summary{list-style:none;display:flex;align-items:center;gap:18px;padding:19px 22px}.case>summary::-webkit-details-marker{display:none}.case>summary:before{content:'›';font-size:22px;color:var(--muted)}.case[open]>summary:before{transform:rotate(90deg)}.case-title{font-weight:650;flex:1;overflow-wrap:anywhere}.case-tokens{font-variant-numeric:tabular-nums;font-size:13px;white-space:nowrap}.case-tokens small{color:var(--muted)}.badge{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:4px 9px;border-radius:4px;white-space:nowrap}.passed{background:var(--green);color:var(--teal)}.failed{background:#fbe9e7;color:var(--red)}.error{background:#fff0d6;color:var(--amber)}.case-body{padding:0 24px 24px;border-top:1px solid var(--line)}.source{font-size:12px;margin:16px 0 24px}.detail-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(255px,1fr);gap:32px}.checks{padding:0;list-style:none;margin:0}.checks li{display:flex;gap:10px;margin-bottom:18px;font-size:13px}.checks p{font-size:12px;color:var(--muted);margin:7px 0 0}.check-icon{width:22px;height:22px;flex-shrink:0;text-align:center;border-radius:50%;font-weight:700}.checks strong{font-weight:650}table{border-collapse:collapse;width:100%;font-size:12px;font-variant-numeric:tabular-nums}th,td{border-bottom:1px solid #e7edeb;padding:7px 0;text-align:right}th:first-child{text-align:left;font-weight:450}thead th{color:var(--muted);font-size:11px;font-weight:550}tbody tr:nth-child(5){font-weight:750;color:var(--teal)}.inspector{border-top:1px solid var(--line);margin-top:20px;padding-top:12px;font-size:13px}.inspector>summary{font-weight:600;padding:4px 0}.inspector summary span,.tool summary span{color:var(--muted);font-weight:400;margin-left:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;background:#f4f7f6;padding:16px;border-radius:5px;max-height:420px;overflow:auto}.tool{border:1px solid var(--line);border-radius:5px;margin-top:12px;padding:12px}.artifacts button{font-size:12px;padding:0;border:0;color:var(--teal);background:none;text-decoration:underline}.artifacts{display:flex;flex-wrap:wrap;gap:20px;font-size:12px;margin-top:22px}.error-box{padding:14px;background:#fff5e6;margin-bottom:20px;border-left:3px solid #ab6b10;font-size:13px}.error-box pre{background:transparent;padding:0;margin-bottom:0}.method{font-size:12px;color:var(--muted);margin-top:34px;border-top:1px solid var(--line);padding-top:22px;max-width:850px}.method p{margin:0 0 10px}[hidden]{display:none!important}@media(max-width:1150px){aside{width:210px;padding:25px 20px}main{margin-left:210px;padding:32px 25px}.detail-grid{grid-template-columns:1fr}.stat{padding:0 12px}.header-actions{display:block}}@media(max-width:760px){aside{position:static;width:100%;padding:18px 22px;border-right:0;border-bottom:1px solid var(--line)}aside .side-label,aside nav,aside dl{display:none}main{margin-left:0;padding:25px 18px}.stats{grid-template-columns:1fr 1fr;gap:22px}.stat:nth-child(3){padding-left:0;border:0}.case>summary{padding:16px 12px;gap:10px}.case-tokens{display:none}.case-body{padding:0 16px 18px}.section-head{align-items:start}.controls button{font-size:12px}.brand{font-size:20px}}@media print{aside,.controls,.header-actions,.artifacts{display:none}main{margin:0;padding:0}.case{break-inside:avoid}.stats{margin:12px 0}}
  .case-usage{margin:20px 0 28px;padding:18px;border:1px solid var(--line);border-radius:7px;background:#f8faf9}.case-usage-totals{display:flex;flex-wrap:wrap;gap:18px 38px;margin-bottom:18px}.case-usage-totals span{display:block;font-size:12px}.case-usage-totals strong{display:block;font-size:24px;font-variant-numeric:tabular-nums}.case-usage summary{font-size:12px}.case-usage table{max-width:600px}
  .project-output{margin-bottom:32px}.file-list{border:1px solid var(--line);border-radius:7px;overflow:hidden}.output-file+ .output-file{border-top:1px solid var(--line)}.output-file>summary{display:flex;justify-content:space-between;gap:16px;padding:13px 16px;background:#f8faf9;font-size:12px}.file-path{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.file-change{font-size:11px;color:var(--teal)}.file-content{padding:0 16px 16px}.file-diff>summary{font-size:12px;color:var(--teal)}.diff-add{background:#dcf5e6;color:#165d35}.diff-remove{background:#ffe7e5;color:#942e2b}.verification{border-left:3px solid var(--teal);padding:16px;margin-top:20px;background:#f5f8f7}.verification>summary{display:flex;justify-content:space-between;gap:12px;font-size:13px}
  </style></head><body><aside><div class="brand">Prisma<span> / </span>evals</div><div class="eyebrow">Skill laboratory</div><div class="side-label eyebrow">This run</div><nav><a class="side-link" href="#overview">Overview</a><a class="side-link" href="#cases">Case results</a><a class="side-link" href="#method">Measurement notes</a></nav><dl class="side-meta"><dt>Model</dt><dd>${escape(report.model)}</dd><dt>Judge model</dt><dd>${escape(report.judge_model)}</dd><dt>Thinking · Harness</dt><dd>${escape(report.thinking)} · OMP ${escape(report.omp_version)}</dd><dt>Started</dt><dd>${escape(report.started_at)}</dd><dt>Skill snapshot</dt><dd class="hash">${report.skills_hash}</dd><dt>Suite fingerprint</dt><dd class="hash">${report.suite_hash}</dd><dt>Harness fingerprint</dt><dd class="hash">${report.harness_hash}</dd></dl></aside>
  <main><header id="overview"><div><div class="eyebrow">Evaluation report · ${execution ? "Execution" : "Planning"}</div><h1>${escape(report.skill_name)}</h1><p class="muted">Behavior first. Token efficiency alongside it.</p></div><div class="header-actions"><button id="download-report" type="button">Download raw report</button></div></header>
  <div class="notice">${escape(scope)}</div>
  <section class="stats" aria-label="Run summary"><div class="stat"><div class="label">Cases passed</div><div class="value">${passed}<span class="muted"> / ${report.results.length}</span></div><div class="hint">${failed} failed · ${errors} errors</div></div><div class="stat"><div class="label">Checks passed</div><div class="value">${checksPassed}<span class="muted"> / ${checksExpected}</span></div><div class="hint">Errors leave checks ungraded</div></div><div class="stat"><div class="label">Execution tokens</div><div class="value">${executorTokens === null ? "—" : number(executorTokens)}</div><div class="hint">${executorTokens === null ? "Incomplete usage data" : "Sum across all cases"}</div></div><div class="stat"><div class="label">Judge tokens</div><div class="value">${judgeTokens === null ? "—" : number(judgeTokens)}</div><div class="hint">${judgeTokens === null ? "Incomplete usage data" : "Separate grading overhead"}</div></div></section>
  <section id="cases"><div class="section-head"><h2>Case results</h2><span class="count" id="visible" aria-live="polite">${report.results.length} of ${report.results.length} cases shown</span></div><div class="controls"><label class="field">Search cases<input id="search" type="search" placeholder="Find a case, expectation, or tool…"></label><label class="field">Result<select id="status"><option value="all">All results</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="error">Errors</option></select></label><button id="expand" type="button">Expand all</button><button id="collapse" type="button">Collapse all</button></div>${caseHtml}</section>
  <footer class="method" id="method"><h3>Read the measurements</h3><p>Token usage comes from OMP's normalized provider usage on each completed assistant message, counted once. Stream updates and repeated turn or session snapshots are not counted again. Totals include repeated context across model calls, not just the size of the skill text.</p><p>Input, output, cache reads, and cache writes are shown separately. Reasoning is already included in output where the provider reports it that way. These are token counts, not a price estimate. Missing usage stays unavailable; a run with no judge is not zero judge tokens.</p><p>Compare the same cases, model, thinking level, OMP version, and harness settings. Check quality before rewarding lower usage, and repeat runs before claiming an improvement. The judge's checks are model assessments; inspect their quoted evidence.</p></footer></main><script type="application/json" id="report-data">${embedded}</script><script>${script}</script></body></html>`;
  await Promise.all([
    writeFile(resolve(directory, "results.json"), raw),
    writeFile(resolve(directory, "report.html"), html),
  ]);
}
