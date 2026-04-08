Find half-finished work following `maintenance/18-wip-cleanup.md`. Look for:
1. "Coming Soon" / "TODO" / "FIXME" / "HACK" placeholders
2. Commented-out code blocks (>5 lines)
3. Dead feature flags
4. Zombie environment variables (defined but never read)
5. Empty component files or stub routes

List findings. Clean up obvious dead items. Flag ambiguous ones for review.