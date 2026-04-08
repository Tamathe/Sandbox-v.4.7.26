#!/usr/bin/env npx tsx
/**
 * CI Bundle Budget Check
 *
 * Analyzes Next.js App Router client-side chunks and enforces size budgets.
 * Works with Turbopack's chunk-based splitting (no per-route manifest needed).
 *
 * Budgets:
 *   - No single chunk > 200 KB gzipped
 *   - Total client JS < 6 MB gzipped
 *
 * Usage:
 *   npx tsx scripts/check-bundle-size.ts
 *   npm run bundle-check
 *
 * Exit code 1 if any budget is exceeded.
 */

import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

const BUILD_DIR = path.join(process.cwd(), ".next");
const CHUNKS_DIR = path.join(BUILD_DIR, "static", "chunks");
const CHUNK_BUDGET_KB = 200;
const TOTAL_BUDGET_MB = 6;

function getGzipSize(filePath: string): number {
  const content = fs.readFileSync(filePath);
  return zlib.gzipSync(content).length;
}

function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

function main() {
  if (!fs.existsSync(CHUNKS_DIR)) {
    console.error("No .next/static/chunks/ found. Run `npm run build` first.");
    process.exit(1);
  }

  const jsFiles = fs.readdirSync(CHUNKS_DIR).filter((f) => f.endsWith(".js"));
  if (jsFiles.length === 0) {
    console.error("No JS chunks found in .next/static/chunks/.");
    process.exit(1);
  }

  const chunks = jsFiles.map((name) => {
    const filePath = path.join(CHUNKS_DIR, name);
    const raw = fs.statSync(filePath).size;
    const gz = getGzipSize(filePath);
    return { name, raw, gz };
  });

  chunks.sort((a, b) => b.gz - a.gz);

  const totalRaw = chunks.reduce((s, c) => s + c.raw, 0);
  const totalGz = chunks.reduce((s, c) => s + c.gz, 0);
  const overBudgetChunks = chunks.filter((c) => c.gz > CHUNK_BUDGET_KB * 1024);
  const totalOverBudget = totalGz > TOTAL_BUDGET_MB * 1024 * 1024;

  console.log(`\nBundle Size Report — ${chunks.length} client chunks\n`);
  console.log(`Total raw:     ${(totalRaw / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total gzipped: ${(totalGz / 1024 / 1024).toFixed(2)} MB (budget: ${TOTAL_BUDGET_MB} MB)\n`);

  console.log("Top 20 largest chunks (gzipped):");
  console.log("-".repeat(70));
  for (const c of chunks.slice(0, 20)) {
    const flag = c.gz > CHUNK_BUDGET_KB * 1024 ? "OVER" : " OK ";
    console.log(`  ${flag}  ${formatKB(c.gz).padStart(8)} KB  ${c.name}`);
  }
  console.log("-".repeat(70));

  let failed = false;

  if (overBudgetChunks.length > 0) {
    console.log(`\n${overBudgetChunks.length} chunk(s) exceed ${CHUNK_BUDGET_KB} KB budget:`);
    for (const c of overBudgetChunks) {
      console.log(`  - ${c.name}: ${formatKB(c.gz)} KB (over by ${formatKB(c.gz - CHUNK_BUDGET_KB * 1024)} KB)`);
    }
    failed = true;
  }

  if (totalOverBudget) {
    console.log(`\nTotal gzipped JS (${(totalGz / 1024 / 1024).toFixed(2)} MB) exceeds ${TOTAL_BUDGET_MB} MB budget.`);
    failed = true;
  }

  if (failed) {
    console.log("\nBundle check FAILED.\n");
    process.exit(1);
  } else {
    console.log(`\nAll chunks within ${CHUNK_BUDGET_KB} KB. Total within ${TOTAL_BUDGET_MB} MB.\n`);
    process.exit(0);
  }
}

main();
