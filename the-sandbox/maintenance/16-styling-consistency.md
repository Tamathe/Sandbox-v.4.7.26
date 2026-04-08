# CSS & Styling Consistency Audit

**Frequency:** Monthly
**Time:** ~15 minutes
**Why:** Multiple agents apply Tailwind classes inconsistently — hardcoded colors, mixed spacing scales, stale design patterns, and occasional violations of the Tailwind v4 rules.

## Prompt

```
Scan all .tsx and .css files for styling inconsistencies:

1. **Tailwind v4 violations** — Any @apply directives in .css files (forbidden in v4).
   Any use of `w-X h-X` instead of `size-X` where both dimensions are equal.
2. **Hardcoded colors** — Inline hex/rgb values or Tailwind colors that don't match
   the project's theme tokens. List each with file:line.
3. **Spacing inconsistency** — Cards/containers that use inconsistent padding
   (mix of p-4, p-5, p-6, p-8 on structurally similar components). Group by
   component type (cards, modals, page containers, form sections).
4. **Inline styles** — Any `style={{...}}` in JSX that could be Tailwind classes instead.
   Exception: dynamic values that genuinely need runtime calculation.
5. **Icon size drift** — Icons using inconsistent sizing (mix of size-4, size-5, size-6
   in similar contexts). Should follow lucide-react conventions.
6. **Platform manifest drift** — Check key pages against PLATFORM-CONSISTENCY-MANIFEST.md
   rules: Pattern A headers, max-w-6xl containers, border rounded-2xl shadow-sm cards,
   font-extrabold headings.

Output a table: File | Issue | Current | Should Be

Fix clear violations (w-4 h-4 → size-4, @apply removal). Flag subjective
choices for my review.
```
