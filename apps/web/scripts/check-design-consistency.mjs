#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");
const allowlistPath = path.join(__dirname, "design-consistency.allowlist.json");

/** @typedef {{file:string, pattern?:string, line?:number}} AllowEntry */

/** @type {Record<string, Array<string | AllowEntry>>} */
const allowlist = fs.existsSync(allowlistPath)
  ? JSON.parse(fs.readFileSync(allowlistPath, "utf8"))
  : {};

const CHECKS = [
  {
    key: "legacySurfaceClass",
    label: "Legacy surface class",
    regex: /\b(?:bg|text|border)-night(?:-[a-z0-9/]+)?\b/g,
  },
  {
    key: "legacyAccentClass",
    label: "Legacy accent class",
    regex: /\b(?:bg|text|border)-(?:lime|violet)(?:-[a-z0-9/]+)?\b/g,
  },
  {
    key: "forbiddenEffects",
    label: "Forbidden glow/brutalist utility",
    regex:
      /\b(?:shadow-brutal(?:-violet)?|glow-(?:lime|violet)|text-glow-(?:lime|violet)|animate-pulse-lime|animate-pulse-violet|progress-lime|progress-violet)\b/g,
  },
  {
    key: "typographyNoise",
    label: "Typography noise (non-micro contexts)",
    regex:
      /\b(?:uppercase|font-black|tracking-(?:tight|wide|wider|widest)|tracking-\[[^\]]+\])\b/g,
  },
];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

/** @returns {string[]} */
function listSourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(fullPath));
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

/** @param {string} fileRel */
function normalizePath(fileRel) {
  return fileRel.replaceAll(path.sep, "/");
}

/** @param {string} fileRel */
function findAllowEntries(key, fileRel) {
  const entries = allowlist[key] ?? [];
  return entries.filter((entry) => {
    if (typeof entry === "string") {
      return normalizePath(fileRel) === normalizePath(entry);
    }
    return normalizePath(fileRel) === normalizePath(entry.file);
  });
}

/**
 * @param {string} key
 * @param {string} fileRel
 * @param {string} match
 * @param {number} line
 */
function isAllowed(key, fileRel, match, line) {
  const entries = findAllowEntries(key, fileRel);
  if (entries.length === 0) {
    return false;
  }

  return entries.some((entry) => {
    if (typeof entry === "string") {
      return true;
    }
    if (entry.line !== undefined && entry.line !== line) {
      return false;
    }
    if (entry.pattern && !match.includes(entry.pattern)) {
      return false;
    }
    return true;
  });
}

/** @param {string} content */
function lineStarts(content) {
  const starts = [0];
  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === "\n") {
      starts.push(i + 1);
    }
  }
  return starts;
}

/**
 * @param {number[]} starts
 * @param {number} index
 */
function lineForIndex(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= index) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return hi + 1;
}

const files = listSourceFiles(srcRoot);

const violations = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, "utf8");
  const relativePath = normalizePath(path.relative(projectRoot, filePath));
  const starts = lineStarts(content);

  for (const check of CHECKS) {
    check.regex.lastIndex = 0;
    for (const match of content.matchAll(check.regex)) {
      const index = match.index ?? 0;
      const line = lineForIndex(starts, index);
      const token = match[0];

      if (isAllowed(check.key, relativePath, token, line)) {
        continue;
      }

      violations.push({
        check: check.label,
        key: check.key,
        file: relativePath,
        line,
        token,
      });
    }
  }
}

if (violations.length === 0) {
  console.log("design:check passed (no consistency violations).");
  process.exit(0);
}

const grouped = new Map();
for (const violation of violations) {
  const list = grouped.get(violation.key) ?? [];
  list.push(violation);
  grouped.set(violation.key, list);
}

console.error("design:check failed. Consistency violations found:\n");
for (const check of CHECKS) {
  const group = grouped.get(check.key);
  if (!group || group.length === 0) {
    continue;
  }

  console.error(`- ${check.label}: ${group.length}`);
  for (const item of group.slice(0, 40)) {
    console.error(`  ${item.file}:${item.line} -> ${item.token}`);
  }
  if (group.length > 40) {
    console.error(`  ... ${group.length - 40} more`);
  }
}

process.exit(1);
