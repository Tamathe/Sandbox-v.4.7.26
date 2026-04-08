#!/usr/bin/env bash
# Overnight build script — 4 tools for The Sandbox
# Run from Git Bash: bash "c:/AA Code/Educator marketplace/night-shift/run-overnight.sh"
# Prereq: claude CLI installed, on branch night-shift-4-tools, build is clean

SANDBOX_DIR="c:/AA Code/Educator marketplace/the-sandbox"
PROMPTS_DIR="c:/AA Code/Educator marketplace/night-shift"
LOG_FILE="$PROMPTS_DIR/run-log.txt"

log() { echo "$1" | tee -a "$LOG_FILE"; }

log "=== NIGHT SHIFT START: $(date) ==="
log "Branch: $(cd "$SANDBOX_DIR" && git branch --show-current)"

build_check() {
  local tool_name="$1"
  log "--- Build check after $tool_name ---"
  cd "$SANDBOX_DIR"
  if npm run build 2>&1 | tee -a "$LOG_FILE" | grep -q "Failed to compile"; then
    log "!!! BUILD FAILED after $tool_name — check run-log.txt"
    return 1
  else
    log "--- Build OK after $tool_name ---"
    return 0
  fi
}

# ─── TOOL 1: Debate Arena ─────────────────────────────────────────────────────
log ""
log "=== TOOL 1: Debate Arena — $(date) ==="
cd "$SANDBOX_DIR"
claude --dangerously-skip-permissions -p "$(cat "$PROMPTS_DIR/tool1-debate-arena.md")" 2>&1 | tee -a "$LOG_FILE"

if build_check "Tool 1 (Debate Arena)"; then
  cd "$SANDBOX_DIR" && git add -A && git commit -m "feat: Debate Arena — two-sided argument platform with AI verdict" 2>&1 | tee -a "$LOG_FILE"
  log "Tool 1 COMMITTED"
else
  log "Tool 1 build failed — skipping commit, continuing to Tool 2"
fi

# ─── TOOL 2: Quiz Bowl Blitz ──────────────────────────────────────────────────
log ""
log "=== TOOL 2: Quiz Bowl Blitz — $(date) ==="
cd "$SANDBOX_DIR"
claude --dangerously-skip-permissions -p "$(cat "$PROMPTS_DIR/tool2-quiz-bowl-blitz.md")" 2>&1 | tee -a "$LOG_FILE"

if build_check "Tool 2 (Quiz Bowl Blitz)"; then
  cd "$SANDBOX_DIR" && git add -A && git commit -m "feat: Quiz Bowl Blitz — AI-generated live quiz competition" 2>&1 | tee -a "$LOG_FILE"
  log "Tool 2 COMMITTED"
else
  log "Tool 2 build failed — skipping commit, continuing to Tool 3"
fi

# ─── TOOL 3: Case Pitch ───────────────────────────────────────────────────────
log ""
log "=== TOOL 3: Case Pitch — $(date) ==="
cd "$SANDBOX_DIR"
claude --dangerously-skip-permissions -p "$(cat "$PROMPTS_DIR/tool3-case-pitch.md")" 2>&1 | tee -a "$LOG_FILE"

if build_check "Tool 3 (Case Pitch)"; then
  cd "$SANDBOX_DIR" && git add -A && git commit -m "feat: Case Pitch — business case competition with AI executive feedback" 2>&1 | tee -a "$LOG_FILE"
  log "Tool 3 COMMITTED"
else
  log "Tool 3 build failed — skipping commit, continuing to Tool 4"
fi

# ─── TOOL 4: Gallery Walk ─────────────────────────────────────────────────────
log ""
log "=== TOOL 4: Gallery Walk — $(date) ==="
cd "$SANDBOX_DIR"
claude --dangerously-skip-permissions -p "$(cat "$PROMPTS_DIR/tool4-gallery-walk.md")" 2>&1 | tee -a "$LOG_FILE"

if build_check "Tool 4 (Gallery Walk)"; then
  cd "$SANDBOX_DIR" && git add -A && git commit -m "feat: Gallery Walk — peer critique studio with AI curator notes" 2>&1 | tee -a "$LOG_FILE"
  log "Tool 4 COMMITTED"
else
  log "Tool 4 build failed — skipping commit"
fi

# ─── DONE ─────────────────────────────────────────────────────────────────────
log ""
log "=== ALL TOOLS COMPLETE: $(date) ==="
log "Git log:"
cd "$SANDBOX_DIR" && git log --oneline -6 2>&1 | tee -a "$LOG_FILE"
