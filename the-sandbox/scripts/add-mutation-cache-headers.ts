#!/usr/bin/env npx tsx
/**
 * Adds Cache-Control: no-store headers to mutation-only API routes.
 *
 * Targets routes that export POST/PUT/PATCH/DELETE but NOT GET, and
 * that don't already have Cache-Control headers.
 *
 * Skips: streaming routes, webhook receivers, Content-Disposition routes,
 * routes that already have Cache-Control.
 *
 * Dry-run:  npx tsx scripts/add-mutation-cache-headers.ts --dry-run
 * Execute:  npx tsx scripts/add-mutation-cache-headers.ts
 */

import * as fs from "fs";
import * as path from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const API_DIR = path.join(process.cwd(), "app", "api");

const NO_STORE_HEADER = `'Cache-Control': 'no-store'`;

const STREAMING_PATTERNS = ["ReadableStream", "text/event-stream", "TransformStream"];
const MUTATION_EXPORTS = ["export const POST", "export const PUT", "export const PATCH", "export const DELETE"];

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(full));
    } else if (entry.name === "route.ts") {
      results.push(full);
    }
  }
  return results;
}

function addNoStoreHeader(filePath: string): boolean {
  const content = fs.readFileSync(filePath, "utf-8");

  // Skip if already has Cache-Control
  if (content.includes("Cache-Control")) return false;

  // Skip if has GET handler (handled by the GET script)
  if (content.includes("export const GET") || content.includes("export async function GET")) return false;

  // Must have at least one mutation export
  if (!MUTATION_EXPORTS.some((p) => content.includes(p))) return false;

  // Skip streaming routes
  if (STREAMING_PATTERNS.some((p) => content.includes(p))) return false;

  // Skip Content-Disposition routes
  if (content.includes("Content-Disposition")) return false;

  // Strategy: Add no-store to every NextResponse.json() and Response.json() success response
  const lines = content.split("\n");
  const newLines: string[] = [];
  let changed = false;

  // Track multi-line NextResponse.json({ ... }) calls
  let inMultiLineJson = false;
  let multiLineReturnIndent = "";
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip error responses (4xx, 5xx status codes)
    if (/\bstatus:\s*(4|5)\d\d\b/.test(trimmed)) {
      newLines.push(line);
      continue;
    }

    // Handle multi-line tracking
    if (inMultiLineJson) {
      for (const ch of trimmed) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      if (braceDepth === 0 && /^\}\)\s*$/.test(trimmed)) {
        newLines.push(`${multiLineReturnIndent}}, {`);
        newLines.push(`${multiLineReturnIndent}  headers: { ${NO_STORE_HEADER} },`);
        newLines.push(`${multiLineReturnIndent}})`);
        inMultiLineJson = false;
        changed = true;
        continue;
      }
      newLines.push(line);
      continue;
    }

    // Pattern: return NextResponse.json(EXPR) — single line, single argument, no second arg
    const jsonMatch = trimmed.match(/return\s+(NextResponse|Response)\.json\((.+)\)[;\s]*$/);
    if (jsonMatch && !trimmed.includes("headers") && !trimmed.includes("status:")) {
      const args = jsonMatch[2];
      let depth = 0;
      let topLevelComma = false;
      for (const ch of args) {
        if (ch === "{" || ch === "[" || ch === "(") depth++;
        if (ch === "}" || ch === "]" || ch === ")") depth--;
        if (ch === "," && depth === 0) { topLevelComma = true; break; }
      }
      if (!topLevelComma) {
        const indent = line.match(/^(\s*)/)?.[1] ?? "  ";
        const newLine = line.replace(
          /(NextResponse|Response)\.json\((.+)\)[;\s]*$/,
          `NextResponse.json($2, {\n${indent}  headers: { ${NO_STORE_HEADER} },\n${indent}})`
        );
        newLines.push(newLine);
        changed = true;
        continue;
      }
    }

    // Pattern: return NextResponse.json({ — multi-line start
    if (/return\s+(NextResponse|Response)\.json\(\{\s*$/.test(trimmed)) {
      multiLineReturnIndent = line.match(/^(\s*)/)?.[1] ?? "  ";
      inMultiLineJson = true;
      braceDepth = 1;
      const newLine = line.replace(/(?<!Next)Response\.json\(/, "NextResponse.json(");
      newLines.push(newLine);
      continue;
    }

    newLines.push(line);
  }

  if (!changed) return false;

  let modified = newLines.join("\n");

  // Ensure NextResponse import
  if (modified.includes("NextResponse.json") && !modified.includes("NextResponse")) {
    if (modified.includes("import { NextRequest }")) {
      modified = modified.replace(
        "import { NextRequest }",
        "import { NextRequest, NextResponse }"
      );
    } else {
      modified = `import { NextResponse } from 'next/server'\n` + modified;
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, modified);
  }
  return true;
}

function main() {
  const files = findRouteFiles(API_DIR);
  console.log(`Found ${files.length} route files`);

  let modified = 0;
  let skipped = 0;

  for (const file of files) {
    if (addNoStoreHeader(file)) {
      modified++;
      const rel = path.relative(process.cwd(), file);
      if (DRY_RUN) {
        console.log(`  [dry-run] Would add no-store header: ${rel}`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Results:`);
  console.log(`  Modified: ${modified} (no-store)`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Total:    ${files.length}`);
}

main();
