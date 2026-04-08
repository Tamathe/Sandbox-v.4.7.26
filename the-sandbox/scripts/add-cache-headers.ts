#!/usr/bin/env npx tsx
/**
 * Adds Cache-Control headers to API route GET handlers that are missing them.
 *
 * Two tiers:
 *   - User-specific routes (has require*User): private, max-age=60, stale-while-revalidate=300
 *   - Reference data routes (no auth guard): public, max-age=300, s-maxage=600, stale-while-revalidate=3600
 *
 * Skips: routes that already have Cache-Control, routes without GET handlers,
 * streaming routes (ReadableStream/text/event-stream).
 *
 * Dry-run:  npx tsx scripts/add-cache-headers.ts --dry-run
 * Execute:  npx tsx scripts/add-cache-headers.ts
 */

import * as fs from "fs";
import * as path from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const API_DIR = path.join(process.cwd(), "app", "api");

const PRIVATE_HEADER = `'Cache-Control': 'private, max-age=60, stale-while-revalidate=300'`;
const PUBLIC_HEADER = `'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600'`;

const AUTH_PATTERNS = [
  "requireRequestUser",
  "requireEducatorUser",
  "requireStudentUser",
  "requireAdminUser",
  "requireStaffUser",
];

const STREAMING_PATTERNS = ["ReadableStream", "text/event-stream", "TransformStream"];

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

function isUserSpecific(content: string): boolean {
  return AUTH_PATTERNS.some((p) => content.includes(p));
}

function isStreaming(content: string): boolean {
  return STREAMING_PATTERNS.some((p) => content.includes(p));
}

function addCacheHeader(filePath: string): boolean {
  const content = fs.readFileSync(filePath, "utf-8");

  // Skip if already has Cache-Control
  if (content.includes("Cache-Control")) return false;

  // Skip if no GET handler
  if (!content.includes("export const GET")) return false;

  // Skip streaming routes
  if (isStreaming(content)) return false;

  const header = isUserSpecific(content) ? PRIVATE_HEADER : PUBLIC_HEADER;

  // Strategy: Find the last NextResponse.json() or Response.json() in the GET handler
  // and add headers to it. We need to handle several patterns:
  //
  // 1. NextResponse.json(data)               → NextResponse.json(data, {\n    headers: { ... },\n  })
  // 2. NextResponse.json(data, { status: N }) → NextResponse.json(data, { status: N, headers: { ... } })
  // 3. Response.json(data)                    → NextResponse.json(data, {\n    headers: { ... },\n  })

  let modified = content;
  let changed = false;

  // Pattern: NextResponse.json(ANYTHING) at end of GET handler — no second arg
  // Match: NextResponse.json(something) where the closing ) is followed by newline/whitespace
  // We need to find the LAST successful return in the GET handler

  // Replace all `NextResponse.json(X)` (no second arg) that end a statement
  // But NOT ones that already have a second argument like `NextResponse.json(X, { ... })`
  // Regex approach: find NextResponse.json(...) where no comma follows the first arg

  const lines = modified.split("\n");
  const newLines: string[] = [];

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
        // This is the closing }) of a multi-line NextResponse.json({ ... })
        newLines.push(`${multiLineReturnIndent}}, {`);
        newLines.push(`${multiLineReturnIndent}  headers: { ${header} },`);
        newLines.push(`${multiLineReturnIndent}})`);
        inMultiLineJson = false;
        changed = true;
        continue;
      }
      newLines.push(line);
      continue;
    }

    // Pattern 1+2: return [Next]Response.json(EXPR) — single line, single argument
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
          `NextResponse.json($2, {\n${indent}  headers: { ${header} },\n${indent}})`
        );
        newLines.push(newLine);
        changed = true;
        continue;
      }
    }

    // Pattern 3: return NextResponse.json({ — multi-line start (no closing on same line)
    if (/return\s+(NextResponse|Response)\.json\(\{\s*$/.test(trimmed)) {
      multiLineReturnIndent = line.match(/^(\s*)/)?.[1] ?? "  ";
      inMultiLineJson = true;
      braceDepth = 1; // The opening { of the json argument
      // Convert bare Response.json to NextResponse.json if needed (avoid double-prefixing)
      const newLine = line.replace(/(?<!Next)Response\.json\(/, "NextResponse.json(");
      newLines.push(newLine);
      continue;
    }

    newLines.push(line);
  }

  if (!changed) return false;

  modified = newLines.join("\n");

  // Ensure NextResponse import exists if we converted Response.json
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
  let userSpecific = 0;
  let reference = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");

    if (content.includes("Cache-Control")) { skipped++; continue; }
    if (!content.includes("export const GET")) { skipped++; continue; }
    if (isStreaming(content)) { skipped++; continue; }

    const wasUserSpecific = isUserSpecific(content);
    if (addCacheHeader(file)) {
      modified++;
      if (wasUserSpecific) userSpecific++;
      else reference++;

      const rel = path.relative(process.cwd(), file);
      const type = wasUserSpecific ? "private" : "public";
      if (DRY_RUN) {
        console.log(`  [dry-run] Would add ${type} cache header: ${rel}`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Results:`);
  console.log(`  Modified: ${modified} (${userSpecific} private, ${reference} public)`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Total:    ${files.length}`);
}

main();
