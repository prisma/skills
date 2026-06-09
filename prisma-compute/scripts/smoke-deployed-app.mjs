#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 5;
const DEFAULT_STATUSES = "200-399";

function usage() {
  console.log(`Usage: smoke-deployed-app.mjs [options] <url...>

Options:
  --expect <text>         Require response body to contain text. Repeatable.
  --status <list>         Accepted statuses/ranges, e.g. 200,204,300-399.
                          Default: ${DEFAULT_STATUSES}
  --timeout <ms>          Per-request timeout. Default: ${DEFAULT_TIMEOUT_MS}
  --retries <count>       Attempts per URL. Default: ${DEFAULT_RETRIES}
  --header <name:value>   Header to send. Repeatable.
  --allow-localhost       Allow localhost/127.0.0.1 URLs.
  --json                  Print JSON report.
  --help                  Show this help.

Examples:
  node prisma-compute/scripts/smoke-deployed-app.mjs https://app.example.com
  node prisma-compute/scripts/smoke-deployed-app.mjs --expect "Hello" https://app.example.com
`);
}

function parseArgs(argv) {
  const options = {
    urls: [],
    expectedText: [],
    statuses: parseStatuses(DEFAULT_STATUSES),
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
    headers: {},
    allowLocalhost: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--allow-localhost") {
      options.allowLocalhost = true;
      continue;
    }
    if (arg === "--expect") {
      const value = argv[++i];
      if (!value) fail("--expect requires a value");
      options.expectedText.push(value);
      continue;
    }
    if (arg === "--status") {
      const value = argv[++i];
      if (!value) fail("--status requires a value");
      options.statuses = parseStatuses(value);
      continue;
    }
    if (arg === "--timeout") {
      options.timeoutMs = parsePositiveInt(argv[++i], "--timeout");
      continue;
    }
    if (arg === "--retries") {
      options.retries = parsePositiveInt(argv[++i], "--retries");
      continue;
    }
    if (arg === "--header") {
      const value = argv[++i];
      if (!value || !value.includes(":")) fail("--header requires name:value");
      const [name, ...rest] = value.split(":");
      options.headers[name.trim()] = rest.join(":").trim();
      continue;
    }
    if (arg.startsWith("--")) {
      fail(`Unknown option: ${arg}`);
    }
    options.urls.push(arg);
  }

  if (options.urls.length === 0) {
    usage();
    process.exit(2);
  }

  return options;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

function parsePositiveInt(value, flag) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    fail(`${flag} must be a positive integer`);
  }
  return parsed;
}

function parseStatuses(raw) {
  return raw.split(",").map((part) => {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [start, end] = trimmed.split("-").map((value) => parsePositiveInt(value, "--status"));
      if (start > end) fail(`Invalid status range: ${trimmed}`);
      return { start, end };
    }
    const status = parsePositiveInt(trimmed, "--status");
    return { start: status, end: status };
  });
}

function statusAllowed(status, ranges) {
  return ranges.some((range) => status >= range.start && status <= range.end);
}

function validateUrl(rawUrl, allowLocalhost) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "not a valid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "URL must use http or https" };
  }
  if (!allowLocalhost && isLoopbackHost(url.hostname)) {
    return { ok: false, error: "URL points to localhost/loopback; use the public deployment URL" };
  }
  return { ok: true, url };
}

function isLoopbackHost(hostname) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "::1" || host === "[::1]" || /^127\./.test(host);
}

async function smokeOne(rawUrl, options) {
  const validation = validateUrl(rawUrl, options.allowLocalhost);
  if (!validation.ok) {
    return {
      url: rawUrl,
      ok: false,
      attempts: 0,
      error: validation.error,
    };
  }

  let lastResult = null;
  for (let attempt = 1; attempt <= options.retries; attempt++) {
    lastResult = await fetchOnce(validation.url, options, attempt);
    if (lastResult.ok) {
      return lastResult;
    }
    if (attempt < options.retries) {
      await delay(Math.min(1000 * attempt, 5000));
    }
  }
  return lastResult;
}

async function fetchOnce(url, options, attempt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(url, {
      headers: options.headers,
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    const missingText = options.expectedText.filter((expected) => !body.includes(expected));
    const statusOk = statusAllowed(response.status, options.statuses);
    return {
      url: url.href,
      finalUrl: response.url,
      ok: statusOk && missingText.length === 0,
      attempts: attempt,
      status: response.status,
      contentType: response.headers.get("content-type"),
      bytes: Buffer.byteLength(body),
      missingText,
      snippet: body.replace(/\s+/g, " ").slice(0, 240),
      error: statusOk ? null : `unexpected status ${response.status}`,
    };
  } catch (error) {
    return {
      url: url.href,
      ok: false,
      attempts: attempt,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printHuman(results) {
  for (const result of results) {
    console.log(`\n${result.ok ? "OK" : "FAIL"} ${result.url}`);
    console.log(`attempts: ${result.attempts}`);
    if (result.status) console.log(`status: ${result.status}`);
    if (result.finalUrl && result.finalUrl !== result.url) console.log(`finalUrl: ${result.finalUrl}`);
    if (result.contentType) console.log(`contentType: ${result.contentType}`);
    if (typeof result.bytes === "number") console.log(`bytes: ${result.bytes}`);
    if (result.missingText?.length) console.log(`missingText: ${result.missingText.join(", ")}`);
    if (result.error) console.log(`error: ${result.error}`);
    if (result.snippet) console.log(`snippet: ${result.snippet}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const results = [];
for (const url of options.urls) {
  results.push(await smokeOne(url, options));
}

if (options.json) {
  console.log(JSON.stringify({ results }, null, 2));
} else {
  printHuman(results);
}

process.exit(results.every((result) => result.ok) ? 0 : 1);
