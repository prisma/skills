#!/usr/bin/env node

import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 45_000;
const CREATE_PRISMA_PACKAGE =
  process.env.PRISMA_CREATE_PRISMA_PACKAGE || "create-prisma@latest";

const checks = [
  {
    label: CREATE_PRISMA_PACKAGE,
    packageName: CREATE_PRISMA_PACKAGE,
    args: ["--help"],
    probes: [
      ["has --deploy", /--deploy\b/],
      ["has hono template", /\bhono\b/i],
      ["has elysia template", /\belysia\b/i],
      ["has next template", /\bnext\b/i],
      ["has tanstack-start template", /\btanstack-start\b/i],
    ],
  },
  {
    label: `${CREATE_PRISMA_PACKAGE} version`,
    packageName: CREATE_PRISMA_PACKAGE,
    args: ["--version"],
    probes: [],
  },
  {
    label: "@prisma/cli@latest app",
    packageName: "@prisma/cli@latest",
    args: ["app", "--help"],
    probes: [
      ["has app deploy", /\bdeploy\b/],
      ["has app build", /\bbuild\b/],
      ["has app run", /\brun\b/],
      ["has app logs", /\blogs\b/],
    ],
  },
  {
    label: "@prisma/cli@latest app deploy",
    packageName: "@prisma/cli@latest",
    args: ["app", "deploy", "--help"],
    probes: [
      ["has --framework", /--framework\b/],
      ["has --entry", /--entry\b/],
      ["has --http-port", /--http-port\b/],
      ["has --env", /--env\b/],
      ["has --branch", /--branch\b/],
      ["has --db", /--db\b/],
      ["has --no-db", /--no-db\b/],
      ["has --prod", /--prod\b/],
    ],
  },
  {
    label: "@prisma/cli@latest app build",
    packageName: "@prisma/cli@latest",
    args: ["app", "build", "--help"],
    probes: [
      ["has --build-type", /--build-type\b/],
      ["has --entry", /--entry\b/],
    ],
  },
  {
    label: "@prisma/cli@latest project env add",
    packageName: "@prisma/cli@latest",
    args: ["project", "env", "add", "--help"],
    probes: [
      ["has --file", /--file\b/],
      ["has --role", /--role\b/],
      ["has --branch", /--branch\b/],
      ["has --project", /--project\b/],
    ],
  },
  {
    label: "@prisma/cli@latest database create",
    packageName: "@prisma/cli@latest",
    args: ["database", "create", "--help"],
    probes: [
      ["has --region", /--region\b/],
      ["has --project", /--project\b/],
      ["has --branch", /--branch\b/],
    ],
  },
];

function runnerCommand() {
  if (process.env.PRISMA_COMPUTE_RUNNER) {
    return {
      command: process.env.PRISMA_COMPUTE_RUNNER,
      argsForPackage: (packageName, args) => [packageName, ...args],
    };
  }

  return {
    command: "npx",
    argsForPackage: (packageName, args) => ["--yes", packageName, ...args],
  };
}

function runCheck(check) {
  const runner = runnerCommand();
  const args = runner.argsForPackage(check.packageName, check.args);

  return new Promise((resolve) => {
    const child = spawn(runner.command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NO_COLOR: "1",
        CI: "1",
      },
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, DEFAULT_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        check,
        ok: false,
        exitCode: null,
        output: "",
        error: error.message,
      });
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve({
        check,
        ok: exitCode === 0,
        exitCode,
        output: stripAnsi(`${stdout}\n${stderr}`).trim(),
        error: null,
      });
    });
  });
}

function stripAnsi(value) {
  return value.replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function firstUsefulLines(output) {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => /(--deploy|--framework|--entry|--http-port|--env|--branch|--db|--no-db|--role|--project|--prod|app deploy|project env|database create|version|create-prisma|hono|elysia|next|tanstack|bun)/i.test(line))
    .slice(0, 12);
}

function printResult(result) {
  const { check } = result;
  console.log(`\n## ${check.label}`);
  console.log(`command: ${runnerCommand().command} ${runnerCommand().argsForPackage(check.packageName, check.args).join(" ")}`);
  console.log(`status: ${result.ok ? "ok" : `failed (${result.exitCode ?? "spawn error"})`}`);

  if (result.error) {
    console.log(`error: ${result.error}`);
    return;
  }

  for (const [label, pattern] of check.probes) {
    console.log(`${label}: ${pattern.test(result.output) ? "yes" : "no"}`);
  }

  const lines = firstUsefulLines(result.output);
  if (lines.length > 0) {
    console.log("notable lines:");
    for (const line of lines) {
      console.log(`- ${line}`);
    }
  }
}

console.log("# Prisma Compute CLI Surface");
console.log(`runner: ${runnerCommand().command}`);
console.log("Set PRISMA_COMPUTE_RUNNER=bunx to use bunx instead of npx.");
console.log("Set PRISMA_CREATE_PRISMA_PACKAGE to test another create-prisma tag or local package.");

let hasFailure = false;
for (const check of checks) {
  const result = await runCheck(check);
  printResult(result);
  if (!result.ok) {
    hasFailure = true;
  }
}

process.exit(hasFailure ? 1 : 0);
