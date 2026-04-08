Audit all AI system prompts following `maintenance/14-prompt-audit.md`. Check:
1. Stale prompts referencing deleted features or old schemas
2. Duplicate prompt fragments across services
3. Missing prompts (features that should have AI context but don't)
4. Prompts exceeding token budget recommendations
5. Conflicting persona instructions across Sandy surfaces

Report findings with file paths and specific stale references.