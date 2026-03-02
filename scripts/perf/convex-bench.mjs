#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { ConvexHttpClient } from "convex/browser";

const DEFAULT_ITERATIONS = 20;
const DEFAULT_WARMUP = 3;

/**
 * Lightweight .env parser for KEY=VALUE lines.
 * Supports unquoted and double/single quoted values.
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function parseArgs(argv) {
  const parsed = {
    out: null,
    iterations: DEFAULT_ITERATIONS,
    warmup: DEFAULT_WARMUP,
    url: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--out") {
      parsed.out = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (token === "--iterations") {
      parsed.iterations = Number.parseInt(argv[i + 1] ?? "", 10) || DEFAULT_ITERATIONS;
      i += 1;
      continue;
    }
    if (token === "--warmup") {
      parsed.warmup = Number.parseInt(argv[i + 1] ?? "", 10) || DEFAULT_WARMUP;
      i += 1;
      continue;
    }
    if (token === "--url") {
      parsed.url = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
  }

  return parsed;
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const idx = (sortedValues.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedValues[lower];
  const weight = idx - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function summarizeDurations(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    samples: sorted.length,
    minMs: Number(sorted[0]?.toFixed(2) ?? 0),
    maxMs: Number(sorted[sorted.length - 1]?.toFixed(2) ?? 0),
    avgMs: Number((total / Math.max(1, sorted.length)).toFixed(2)),
    p50Ms: Number(percentile(sorted, 0.5).toFixed(2)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(2)),
  };
}

function formatNumber(value) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const rootEnv = parseEnvFile(path.join(rootDir, ".env.local"));
  const webEnv = parseEnvFile(path.join(rootDir, "apps/web/.env.local"));

  const convexUrl =
    args.url ||
    process.env.CONVEX_URL ||
    process.env.NEXT_PUBLIC_CONVEX_URL ||
    rootEnv.CONVEX_URL ||
    webEnv.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    throw new Error(
      "Missing Convex URL. Set CONVEX_URL or NEXT_PUBLIC_CONVEX_URL, or pass --url."
    );
  }

  const client = new ConvexHttpClient(convexUrl);

  const cases = [
    { name: "events.listUpcoming", fn: "events:listUpcoming", args: { limit: 50 } },
    {
      name: "events.listByGenre",
      fn: "events:listByGenre",
      args: { genre: "rock", limit: 50 },
    },
    { name: "events.search", fn: "events:search", args: { query: "rock", limit: 20 } },
    {
      name: "events.listNearby",
      fn: "events:listNearby",
      args: {
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMiles: 25,
        genre: "rock",
        limit: 50,
      },
    },
    { name: "venues.list", fn: "venues:list", args: { limit: 50 } },
  ];

  const results = [];

  for (const testCase of cases) {
    for (let i = 0; i < args.warmup; i += 1) {
      await client.query(testCase.fn, testCase.args);
    }

    const durations = [];
    for (let i = 0; i < args.iterations; i += 1) {
      const startedAt = performance.now();
      await client.query(testCase.fn, testCase.args);
      durations.push(performance.now() - startedAt);
    }

    results.push({
      name: testCase.name,
      convexFunction: testCase.fn,
      args: testCase.args,
      ...summarizeDurations(durations),
    });
  }

  const output = {
    timestamp: new Date().toISOString(),
    convexUrl,
    iterations: args.iterations,
    warmupIterations: args.warmup,
    results,
  };

  if (args.out) {
    const absoluteOut = path.isAbsolute(args.out)
      ? args.out
      : path.join(rootDir, args.out);
    fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
    fs.writeFileSync(absoluteOut, `${JSON.stringify(output, null, 2)}\n`);
  }

  console.log("");
  console.log("Convex benchmark summary");
  console.log(`URL: ${convexUrl}`);
  console.log(`Iterations: ${args.iterations} (warmup ${args.warmup})`);
  console.log("");
  for (const result of results) {
    console.log(
      `${result.name.padEnd(20)} p50 ${formatNumber(result.p50Ms)}ms  p95 ${formatNumber(
        result.p95Ms
      )}ms  avg ${formatNumber(result.avgMs)}ms`
    );
  }
  console.log("");
  if (args.out) {
    console.log(`Saved JSON report: ${args.out}`);
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
