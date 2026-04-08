---
name: record-keeping
description: Audit and optimize memory files, CLAUDE.md, MEMORY.md index, blueprints, and archives. Ensures all records are accurate, up-to-date, and properly categorized. Biweekly.
allowed-tools: Read, Grep, Glob, Bash(ls *, git log *)
---

# Record-Keeping Audit

Audit all project documentation, memory files, CLAUDE.md, and archives for accuracy and staleness. Archive completed work, remove stale entries, fix broken references, and ensure the knowledge base reflects the actual codebase.

**Memory directory:** `C:\Users\tamat\.claude\projects\c--AA-Code-Educator-marketplace\memory\`
**Project root:** `c:\AA Code\Educator marketplace\the-sandbox\`
**Archive file:** `archive_completed_features.md` (in memory directory)

---

## Phase 1: MEMORY.md Index Integrity

Check every entry in `MEMORY.md` for:

1. **Broken links** — Does the linked `.md` file actually exist in the memory directory?
2. **Orphan files** — Are there `.md` files in the memory directory NOT referenced in `MEMORY.md`?
3. **Description drift** — Does the one-line hook in `MEMORY.md` match the file's frontmatter `description`?
4. **Line count** — Is `MEMORY.md` under 200 lines? If over, flag entries that should be consolidated or archived.

**Fix:** Remove broken links. Add missing orphan entries. Update drifted descriptions. Report all changes.

---

## Phase 2: Memory Accuracy Audit

For each `project_*.md` memory file, verify its claims against the actual codebase:

### 2a. Completed Blueprints Still Listed as Active
Check files under the "Blueprints (Designed, Not Yet Built)" section of `MEMORY.md`:
- Search the codebase for routes, components, API endpoints, or schema models mentioned in the blueprint
- If substantial implementation exists (routes created, schema models present, pages rendering), the blueprint is **done** — move it to the archive

### 2b. "Coming Soon" / "Not Yet Built" Claims
For each memory that says something is "planned", "not yet executed", "future", or "coming soon":
- Grep the codebase for the feature's routes, components, or schema models
- If the feature now exists, update the memory or archive it

### 2c. Stale Technical Claims
For memories that reference specific files, functions, or patterns:
- Verify the referenced file/function still exists at the stated path
- If renamed or removed, update or delete the memory
- Don't deep-verify every line — just spot-check file existence and key claims

### 2d. Date Sensitivity
Flag any memory with relative dates ("next week", "Thursday") that weren't converted to absolute dates.

---

## Phase 3: Archive Completed Work

Move completed features/projects from active memory sections to the archive:

1. Read `archive_completed_features.md`
2. For each `project_*.md` NOT already in the archive:
   - Check if the feature is fully implemented (routes exist, schema present, pages render)
   - If complete, add a row to the archive table with completion date (use `git log` on relevant files if needed)
3. Update `MEMORY.md` to remove archived entries from active sections
4. Do NOT delete the memory files themselves — they serve as reference

### What counts as "complete"?
- The feature's primary routes exist in `app/(pages)/` or `app/api/`
- Core schema models referenced in the blueprint exist in `prisma/schema.prisma`
- The feature is not marked as "Coming Soon" or placeholder in the UI
- A "complete" flag or completion date exists in the memory file itself

### What stays active?
- Blueprints with no implementation at all
- Features partially built (some routes but missing core functionality)
- Active decisions/rules (like "Do Not Rebuild") — these never archive
- Feedback memories — these never archive (they're behavioral rules)
- Business context — stays until explicitly outdated

---

## Phase 4: CLAUDE.md Accuracy Check

Verify key claims in `the-sandbox/CLAUDE.md` against reality:

1. **Model counts** — Check stated counts (~358 models, ~92 enums, ~129 route directories, ~666 component files) against actual filesystem. Update if drifted by >10%.
2. **Tech stack versions** — Compare stated versions (Next.js, Prisma, Tailwind) against `package.json`. Update if wrong.
3. **Navigation table** — Spot-check 5 random routes from the table to verify they exist. Flag any that 404 or redirect unexpectedly.
4. **Intentionally public routes** — Verify each listed public route still exists and is still unguarded.
5. **Feature reference docs** — Check each `docs/claude/*.md` file listed in the table actually exists.

**Fix:** Update CLAUDE.md directly for factual corrections (counts, versions). Flag structural issues for the user to decide.

---

## Phase 5: Maintenance Prompt Relevance

Check `maintenance/*.md` prompt files:

1. Do any reference removed features (gamification, old nav, etc.)?
2. Do any have instructions that conflict with current CLAUDE.md constraints?
3. Are the maintenance prompts indexed somewhere? If so, is the index current?

**Fix:** Flag outdated prompts. Don't delete — the user decides.

---

## Phase 6: Cross-Reference Consistency

Check for contradictions across the documentation ecosystem:

1. **CLAUDE.md vs memory files** — Do any memory files contradict CLAUDE.md? (e.g., memory says feature X uses pattern A, CLAUDE.md says pattern B is standard)
2. **Memory vs memory** — Do any two memory files give conflicting information about the same topic?
3. **Archive vs active** — Is anything listed in BOTH the archive AND active sections of MEMORY.md?

---

## Output Format

```
## Record-Keeping Audit — YYYY-MM-DD

### MEMORY.md Index
- Broken links: N (list)
- Orphan files: N (list)  
- Description drift: N (list)
- Line count: N/200

### Memory Accuracy
- Archived (moved to complete): N entries
- Updated (stale claims fixed): N entries
- Flagged (needs user decision): N entries

### CLAUDE.md
- Version updates: N
- Count updates: N
- Broken references: N

### Maintenance Prompts
- Outdated: N (list)

### Cross-Reference Issues
- Contradictions found: N (list)

### Actions Taken
1. [list every file modified and what changed]

### Needs User Decision
1. [list items that require human judgment]
```

---

## Rules

- **Never delete memory files** — archive or update them
- **Never delete feedback memories** — they are permanent behavioral rules
- **Preserve frontmatter format** in all memory files (name, description, type)
- **Keep MEMORY.md under 200 lines** — consolidate if needed
- **Use absolute dates** — convert any relative dates found
- **Don't refactor** — this is an audit skill, not a rewrite skill
- When in doubt about whether something is "complete", leave it active and flag it for the user
