---
name: accessibility-audit
description: WCAG 2.1 AA audit — keyboard navigation, ARIA labels, alt text, color contrast, form accessibility, semantic HTML, motion/media. Monthly.
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
effort: high
---

# Accessibility Audit (WCAG 2.1 AA)

Comprehensive accessibility audit for a university platform serving 70K users.

## Checks

1. **Keyboard Navigation** — for key pages (home, courses, hub, build, study, messages):
   - Every interactive element reachable via Tab
   - Modals/dialogs trap focus and return focus on close
   - Dropdowns keyboard-navigable (arrow keys, Escape)
   - Custom interactive components (cards with onClick, custom selects) have proper tabIndex

2. **ARIA Labels & Roles**:
   - Interactive elements missing `aria-label`/`aria-labelledby` (icon-only buttons, image links)
   - Missing `role` on custom widgets (tabs, accordions, dialogs)
   - Incorrect ARIA usage (`aria-expanded` on non-toggles)
   - Missing live regions for dynamic content (chat messages, notifications, loading)

3. **Image Alt Text**:
   - Missing `alt` attributes
   - Generic alt text ("image", "icon", "photo")
   - Decorative images that should have `alt=""`
   - Complex images needing longer descriptions

4. **Color Contrast**:
   - Text meets 4.5:1 (normal) or 3:1 (large text) ratio
   - Light gray text on white (common violation)
   - Focus indicators visible against backgrounds
   - Error/success/warning states don't rely on color alone

5. **Form Accessibility**:
   - Every input has `<label>` or `aria-label`
   - `aria-required="true"` on required fields
   - Error messages via `aria-describedby`
   - Validation errors announced to screen readers
   - Related radio/checkbox groups use `<fieldset>` + `<legend>`

6. **Semantic HTML**:
   - Heading hierarchy (h1 → h2 → h3, no skipped levels)
   - Proper landmark elements (`<nav>`, `<main>`, `<aside>`, `<section>`)
   - Lists use `<ul>`/`<ol>`, not styled divs
   - Data tables have `<thead>`, `<th>`, `scope`
   - Skip-to-content link

7. **Motion & Media**:
   - Animations respect `prefers-reduced-motion`
   - No auto-playing media without controls
   - Video/audio without captions or transcripts
   - No flashing content (3 flashes/second threshold)

## Output

Table: `File | Issue | WCAG Criterion | Severity (Critical/High/Medium/Low) | Status (Fixed/Needs Review)`

Fix easy wins (missing alt text, aria-labels on icon buttons). Flag structural issues for review.

## Key References
- Icons: lucide-react only — check all icon-only buttons have aria-label
- UI components: `PageHeader`, `Button`, `ModalShell` — verify built-in accessibility
- Platform color: UK Blue `#0033A0` on white = 8.5:1 (passes)