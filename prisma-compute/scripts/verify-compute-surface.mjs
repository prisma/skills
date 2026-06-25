#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_TIMEOUT_MS = 45_000;
const CREATE_PRISMA_PACKAGE =
  process.env.PRISMA_CREATE_PRISMA_PACKAGE || "create-prisma@latest";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_WORK_ROOT = path.resolve(SKILLS_REPO_ROOT, "..");

const checks = [
  {
    label: CREATE_PRISMA_PACKAGE,
    packageName: CREATE_PRISMA_PACKAGE,
    args: ["--help"],
    probes: [
      ["has --deploy", /--deploy\b/],
      ["has hono template", /\bhono\b/i],
      ["has elysia template", /\belysia\b/i],
      ["has nest template", /\bnest\b/i],
      ["has next template", /\bnext\b/i],
      ["has svelte template", /\bsvelte\b/i],
      ["has astro template", /\bastro\b/i],
      ["has nuxt template", /\bnuxt\b/i],
      ["has tanstack-start template", /\btanstack-start\b/i],
      ["has turborepo template", /\bturborepo\b/i],
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
      ["has app domain", /\bdomain\b/],
      ["has app show-deploy", /\bshow-deploy\b/],
      ["has app remove", /\bremove\b/],
      ["has [app] target arguments", /\b(deploy|build|run|show|logs) \[app\]/],
    ],
  },
  {
    label: "@prisma/cli@latest auth workspace",
    packageName: "@prisma/cli@latest",
    args: ["auth", "workspace", "--help"],
    probes: [
      ["has workspace list", /\blist\b/],
      ["has workspace use", /\buse\b/],
      ["workspace use accepts optional id-or-name", /\buse \[id-or-name\]/],
      ["has workspace logout", /\blogout\b/],
    ],
  },
  {
    label: "@prisma/cli@latest auth logout",
    packageName: "@prisma/cli@latest",
    args: ["auth", "logout", "--help"],
    probes: [["has --workspace", /--workspace\b/]],
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
      ["has --prod", /--prod\b/],
      ["has --create-project", /--create-project\b/],
    ],
  },
  {
    label: "@prisma/cli@latest app deploy framework choices",
    packageName: "@prisma/cli@latest",
    args: ["app", "deploy", "--framework", "__invalid__", "--no-interactive"],
    expectedExitCode: 2,
    probes: [
      ["allows nestjs framework", /Allowed choices are .*nestjs|nextjs, nuxt, astro, hono, nestjs, tanstack-start, bun/i],
      ["published package does not allow custom framework yet", /Allowed choices are (?:(?!custom).)*$/is],
      ["does not allow svelte framework", /Allowed choices are (?:(?!svelte).)*$/is],
    ],
  },
  {
    label: "@prisma/cli@latest app domain",
    packageName: "@prisma/cli@latest",
    args: ["app", "domain", "--help"],
    probes: [
      ["has add", /\badd\b/],
      ["has show", /\bshow\b/],
      ["has remove", /\bremove\b/],
      ["has retry", /\bretry\b/],
      ["has wait", /\bwait\b/],
    ],
  },
  {
    label: "@prisma/cli@latest app show-deploy",
    packageName: "@prisma/cli@latest",
    args: ["app", "show-deploy", "--help"],
    probes: [["takes deployment id", /<deployment>|show-deploy dep_/i]],
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
    label: "@prisma/cli@latest app build type choices",
    packageName: "@prisma/cli@latest",
    args: ["app", "build", "--build-type", "__invalid__", "--no-interactive"],
    expectedExitCode: 2,
    probes: [
      ["allows nestjs build type", /Allowed choices are .*nestjs|auto, bun, nextjs, nuxt, astro, nestjs, tanstack-start/i],
      ["published package does not allow custom build type yet", /Allowed choices are (?:(?!custom).)*$/is],
    ],
  },
  {
    label: "@prisma/cli@latest app run",
    packageName: "@prisma/cli@latest",
    args: ["app", "run", "--help"],
    probes: [
      ["has --build-type", /--build-type\b/],
      ["has --entry", /--entry\b/],
      ["has --port", /--port\b/],
    ],
  },
  {
    label: "@prisma/cli@latest app run type choices",
    packageName: "@prisma/cli@latest",
    args: ["app", "run", "--build-type", "nestjs", "--no-interactive"],
    expectedExitCode: 2,
    probes: [
      ["run stays local-dev only", /Allowed choices are auto, nextjs, bun/i],
      ["does not allow nestjs run type", /argument 'nestjs' is invalid/i],
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
    label: "@prisma/cli@latest project env update",
    packageName: "@prisma/cli@latest",
    args: ["project", "env", "update", "--help"],
    probes: [
      ["has --file", /--file\b/],
      ["has --role", /--role\b/],
      ["has --branch", /--branch\b/],
      ["has --project", /--project\b/],
    ],
  },
  {
    label: "@prisma/cli@latest branch",
    packageName: "@prisma/cli@latest",
    args: ["branch", "--help"],
    probes: [["has branch list", /\blist\b/]],
  },
  {
    label: "@prisma/cli@latest git",
    packageName: "@prisma/cli@latest",
    args: ["git", "--help"],
    probes: [
      ["has git connect", /\bconnect\b/],
      ["has git disconnect", /\bdisconnect\b/],
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
  {
    label: "@prisma/cli@latest database connection",
    packageName: "@prisma/cli@latest",
    args: ["database", "connection", "--help"],
    probes: [
      ["has connection list", /\blist\b/],
      ["has connection create", /\bcreate\b/],
      ["has connection remove", /\bremove\b/],
      ["mentions --confirm", /--confirm\b/],
    ],
  },
];

const sourceChecks = [
  {
    label: "prisma-cli source",
    envName: "PRISMA_CLI_REPO",
    defaultRoot: path.join(DEFAULT_WORK_ROOT, "prisma-cli"),
    files: [
      {
        path: "docs/product/command-spec.md",
        probes: [
          ["documents custom deploy framework", /--framework <[^>]*custom[^>]*>/],
          ["documents config region", /config `region` applies only when the resolved app does not exist yet/i],
          ["documents build.entrypoint", /`build\.entrypoint` is the built artifact entrypoint/i],
        ],
      },
      {
        path: "packages/cli/src/lib/app/compute-config.ts",
        probes: [
          ["merges config region", /readComputeTargetRegion/],
          ["returns region deploy input", /\bregion,\n/],
        ],
      },
    ],
  },
  {
    label: "project-compute source",
    envName: "PROJECT_COMPUTE_REPO",
    defaultRoot: path.join(DEFAULT_WORK_ROOT, "project-compute"),
    files: [
      {
        path: "sdk/src/config/types.ts",
        probes: [
          ["config framework includes custom", /"custom"/],
          ["config app supports region", /region\?: string/],
          ["build config supports entrypoint", /entrypoint\?: string/],
        ],
      },
      {
        path: "sdk/src/compute-client.ts",
        probes: [
          ["deploy options use appName", /appName\?: string/],
          ["deploy result uses deploymentEndpointDomain", /deploymentEndpointDomain: string/],
        ],
      },
      {
        path: "sdk/src/index.ts",
        probes: [["exports CustomBuild", /\bCustomBuild\b/]],
      },
    ],
  },
  {
    label: "pdp-control-plane source",
    envName: "PDP_CONTROL_PLANE_REPO",
    defaultRoot: path.join(DEFAULT_WORK_ROOT, "pdp-control-plane"),
    files: [
      {
        path: "services/management-api/routes/v1/deployments.ts",
        probes: [
          ["has public deployments route", /basePath\(`\/deployments`\)/],
          ["has deployment log stream route", /:deploymentId\/logs/],
        ],
      },
      {
        path: "services/console/app/components/GitHubRepoConnect.tsx",
        probes: [
          ["mentions Deploy from GitHub", /Deploy from GitHub/],
          ["mentions push to deploy", /push to deploy/i],
        ],
      },
      {
        path: "services/build-runner/build-jobs/runBuild.ts",
        probes: [
          ["wires preview branch database", /preview branch has a Prisma schema and no DATABASE_URL/i],
        ],
      },
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
      const expectedExitCode = check.expectedExitCode ?? 0;
      resolve({
        check,
        ok: exitCode === expectedExitCode,
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
    .filter((line) => /(auth workspace|--workspace|--deploy|--framework|--entry|--http-port|--env|--branch|--role|--project|--create-project|--prod|--build-type|--port|--confirm|Allowed choices|app deploy|app build|app run|app domain|app show-deploy|app remove|project env|env update|branch list|git connect|database create|database connection|prisma\.compute\.ts|App target|\[app\]|\[id-or-name\]|version|deployment|region|custom|create-prisma|hono|elysia|nest|svelte|next|nuxt|astro|tanstack|bun)/i.test(line))
    .slice(0, 12);
}

function printResult(result) {
  const { check } = result;
  console.log(`\n## ${check.label}`);
  console.log(`command: ${runnerCommand().command} ${runnerCommand().argsForPackage(check.packageName, check.args).join(" ")}`);
  console.log(`status: ${result.ok ? "ok" : `failed (${result.exitCode ?? "spawn error"})`}`);
  if (check.expectedExitCode !== undefined) {
    console.log(`expected exit: ${check.expectedExitCode}`);
  }

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

function resolveSourceRoot(check) {
  const explicitRoot = process.env[check.envName];
  if (explicitRoot) {
    return {
      root: path.resolve(explicitRoot),
      explicit: true,
    };
  }

  if (fs.existsSync(check.defaultRoot)) {
    return {
      root: check.defaultRoot,
      explicit: false,
    };
  }

  return null;
}

function runSourceCheck(check) {
  const resolved = resolveSourceRoot(check);
  if (!resolved) {
    return {
      check,
      skipped: true,
      ok: true,
      root: null,
      files: [],
      error: null,
    };
  }

  if (!fs.existsSync(resolved.root)) {
    return {
      check,
      skipped: false,
      ok: false,
      root: resolved.root,
      files: [],
      error: `${resolved.root} does not exist`,
    };
  }

  const files = [];
  let ok = true;

  for (const file of check.files) {
    const fullPath = path.join(resolved.root, file.path);
    if (!fs.existsSync(fullPath)) {
      ok = false;
      files.push({
        path: file.path,
        ok: false,
        error: "missing file",
        probes: [],
      });
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    const probes = file.probes.map(([label, pattern]) => {
      const passed = pattern.test(content);
      if (!passed) {
        ok = false;
      }
      return { label, passed };
    });

    files.push({
      path: file.path,
      ok: probes.every((probe) => probe.passed),
      error: null,
      probes,
    });
  }

  return {
    check,
    skipped: false,
    ok,
    root: resolved.root,
    files,
    error: null,
  };
}

function printSourceResult(result) {
  const { check } = result;
  console.log(`\n## ${check.label}`);
  if (result.skipped) {
    console.log(
      `status: skipped (set ${check.envName} or place repo at ${check.defaultRoot})`,
    );
    return;
  }

  console.log(`source: ${result.root}`);
  console.log(`status: ${result.ok ? "ok" : "failed"}`);

  if (result.error) {
    console.log(`error: ${result.error}`);
    return;
  }

  for (const file of result.files) {
    console.log(`file ${file.path}: ${file.ok ? "ok" : "failed"}`);
    if (file.error) {
      console.log(`- ${file.error}`);
      continue;
    }
    for (const probe of file.probes) {
      console.log(`- ${probe.label}: ${probe.passed ? "yes" : "no"}`);
    }
  }
}

console.log("# Prisma Compute CLI Surface");
console.log(`runner: ${runnerCommand().command}`);
console.log("Set PRISMA_COMPUTE_RUNNER=bunx to use bunx instead of npx.");
console.log("Set PRISMA_CREATE_PRISMA_PACKAGE to test another create-prisma tag or local package.");
console.log("Set PRISMA_CLI_REPO, PROJECT_COMPUTE_REPO, or PDP_CONTROL_PLANE_REPO to audit local source repos.");

let hasFailure = false;
for (const check of checks) {
  const result = await runCheck(check);
  printResult(result);
  if (!result.ok) {
    hasFailure = true;
  }
}

for (const check of sourceChecks) {
  const result = runSourceCheck(check);
  printSourceResult(result);
  if (!result.ok) {
    hasFailure = true;
  }
}

process.exit(hasFailure ? 1 : 0);
