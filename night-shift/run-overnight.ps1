# Overnight build script — 4 tools for The Sandbox
# Run from PowerShell: & "c:\AA Code\Educator marketplace\night-shift\run-overnight.ps1"
# Prereq: claude CLI installed, on branch night-shift-4-tools, build is clean

$SandboxDir = "c:\AA Code\Educator marketplace\the-sandbox"
$PromptsDir = "c:\AA Code\Educator marketplace\night-shift"
$LogFile    = "$PromptsDir\run-log.txt"

function Log($msg) {
    $line = $msg
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

function Build-Check($toolName) {
    Log "--- Build check after $toolName ---"
    Set-Location $SandboxDir
    $output = npm run build 2>&1 | Out-String
    Add-Content -Path $LogFile -Value $output
    if ($output -match "Failed to compile") {
        Log "!!! BUILD FAILED after $toolName"
        return $false
    }
    Log "--- Build OK after $toolName ---"
    return $true
}

Log "=== NIGHT SHIFT START: $(Get-Date) ==="
Set-Location $SandboxDir
$branch = git branch --show-current
Log "Branch: $branch"

# ─── TOOL 1: Debate Arena ─────────────────────────────────────────────────────
Log ""
Log "=== TOOL 1: Debate Arena — $(Get-Date) ==="
Set-Location $SandboxDir
$prompt1 = Get-Content "$PromptsDir\tool1-debate-arena.md" -Raw
$result1 = claude --dangerously-skip-permissions -p $prompt1 2>&1 | Out-String
Add-Content -Path $LogFile -Value $result1
Write-Host $result1

if (Build-Check "Tool 1 (Debate Arena)") {
    Set-Location $SandboxDir
    git add -A
    git commit -m "feat: Debate Arena -- two-sided argument platform with AI verdict"
    Log "Tool 1 COMMITTED"
} else {
    Log "Tool 1 build failed -- skipping commit, continuing to Tool 2"
}

# ─── TOOL 2: Quiz Bowl Blitz ──────────────────────────────────────────────────
Log ""
Log "=== TOOL 2: Quiz Bowl Blitz — $(Get-Date) ==="
Set-Location $SandboxDir
$prompt2 = Get-Content "$PromptsDir\tool2-quiz-bowl-blitz.md" -Raw
$result2 = claude --dangerously-skip-permissions -p $prompt2 2>&1 | Out-String
Add-Content -Path $LogFile -Value $result2
Write-Host $result2

if (Build-Check "Tool 2 (Quiz Bowl Blitz)") {
    Set-Location $SandboxDir
    git add -A
    git commit -m "feat: Quiz Bowl Blitz -- AI-generated live quiz competition"
    Log "Tool 2 COMMITTED"
} else {
    Log "Tool 2 build failed -- skipping commit, continuing to Tool 3"
}

# ─── TOOL 3: Case Pitch ───────────────────────────────────────────────────────
Log ""
Log "=== TOOL 3: Case Pitch — $(Get-Date) ==="
Set-Location $SandboxDir
$prompt3 = Get-Content "$PromptsDir\tool3-case-pitch.md" -Raw
$result3 = claude --dangerously-skip-permissions -p $prompt3 2>&1 | Out-String
Add-Content -Path $LogFile -Value $result3
Write-Host $result3

if (Build-Check "Tool 3 (Case Pitch)") {
    Set-Location $SandboxDir
    git add -A
    git commit -m "feat: Case Pitch -- business case competition with AI executive feedback"
    Log "Tool 3 COMMITTED"
} else {
    Log "Tool 3 build failed -- skipping commit, continuing to Tool 4"
}

# ─── TOOL 4: Gallery Walk ─────────────────────────────────────────────────────
Log ""
Log "=== TOOL 4: Gallery Walk — $(Get-Date) ==="
Set-Location $SandboxDir
$prompt4 = Get-Content "$PromptsDir\tool4-gallery-walk.md" -Raw
$result4 = claude --dangerously-skip-permissions -p $prompt4 2>&1 | Out-String
Add-Content -Path $LogFile -Value $result4
Write-Host $result4

if (Build-Check "Tool 4 (Gallery Walk)") {
    Set-Location $SandboxDir
    git add -A
    git commit -m "feat: Gallery Walk -- peer critique studio with AI curator notes"
    Log "Tool 4 COMMITTED"
} else {
    Log "Tool 4 build failed -- skipping commit"
}

# ─── DONE ─────────────────────────────────────────────────────────────────────
Log ""
Log "=== ALL TOOLS COMPLETE: $(Get-Date) ==="
Log "Git log:"
Set-Location $SandboxDir
$gitLog = git log --oneline -6 2>&1 | Out-String
Add-Content -Path $LogFile -Value $gitLog
Write-Host $gitLog
