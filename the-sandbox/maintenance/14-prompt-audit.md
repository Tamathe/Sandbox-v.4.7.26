# Prompt & System Message Audit

**Frequency:** Monthly
**Time:** ~20 minutes
**Why:** AI prompts accumulate across features and drift out of sync with the actual codebase. Stale prompts reference deleted features, use inconsistent personas, or duplicate instructions.

## Prompt

```
Find every string or template literal sent to an AI API (Anthropic, OpenAI) as a
system message, user prompt, or tool description. Check all files that import from
anthropic, openai, or call /api/ routes that proxy AI calls.

For each prompt found, report:
1. **File and line** — where the prompt is defined
2. **Purpose** — what feature it supports (chat, analysis, generation, etc.)
3. **Model used** — which model it targets (haiku, sonnet, gpt-4, etc.)
4. **Approximate length** — rough token count
5. **Staleness check** — does it reference features, models, pages, or data
   structures that no longer exist in the codebase?

Also flag:
- Duplicated instructions across multiple prompts (e.g., "You are a helpful assistant"
  repeated in 5 places — should be a shared constant)
- Conflicting persona definitions (Sandy described differently in different prompts)
- Prompts that include hardcoded data that should be dynamic
- System prompts that are excessively long or could be simplified
- Missing prompts — AI-powered features that don't have a system prompt at all

Output a table: File | Purpose | Model | ~Tokens | Issues Found

Don't change any prompts — just produce the audit for my review.
```
