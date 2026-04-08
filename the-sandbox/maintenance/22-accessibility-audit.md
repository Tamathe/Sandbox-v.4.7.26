# Accessibility Audit

**Frequency:** Monthly
**Time:** ~30 minutes
**Why:** Platform targets 70K university users including those with disabilities. WCAG 2.1 AA compliance is both a legal requirement for public universities and good UX.

## Prompt

```
Run a WCAG 2.1 AA accessibility audit across the codebase:

1. **Keyboard Navigation** — for key pages (home, courses, hub, build, study, messages):
   - Can every interactive element be reached via Tab?
   - Do all modals/dialogs trap focus and return focus on close?
   - Are dropdown menus keyboard-navigable (arrow keys, Escape to close)?
   - Are custom interactive components (cards with onClick, custom selects)
     focusable with proper tabIndex?

2. **ARIA Labels & Roles** — scan all components for:
   - Interactive elements missing aria-label or aria-labelledby
     (icon-only buttons, image links, custom controls)
   - Missing role attributes on custom widgets (tabs, accordions, dialogs)
   - Incorrect ARIA usage (aria-expanded on non-toggle elements, etc.)
   - Missing live regions for dynamic content updates (chat messages,
     notifications, loading states)

3. **Image Alt Text** — for all <img>, next/image, and background images:
   - Missing alt attributes
   - Generic/useless alt text ("image", "icon", "photo")
   - Decorative images that should have alt=""
   - Complex images (charts, diagrams) that need longer descriptions

4. **Color Contrast** — check:
   - Text on colored backgrounds meets 4.5:1 ratio (normal text) or
     3:1 (large text, 18px+ or 14px+ bold)
   - UK Blue (#0033A0) on white passes (it does at 8.5:1)
   - Light gray text on white backgrounds (common violation)
   - Focus indicators are visible against their backgrounds
   - Error/success/warning states don't rely on color alone

5. **Form Accessibility** — for all form elements:
   - Every input has an associated <label> (or aria-label)
   - Required fields are marked with aria-required="true"
   - Error messages are associated with inputs via aria-describedby
   - Form validation errors are announced to screen readers
   - Fieldsets with legends for related radio/checkbox groups

6. **Semantic HTML** — check for:
   - Heading hierarchy (h1 → h2 → h3, no skipped levels)
   - Proper use of <nav>, <main>, <aside>, <section>, <article>
   - Lists using <ul>/<ol> not styled divs
   - Tables with <thead>, <th>, scope attributes for data tables
   - Skip-to-content link at the top of the page

7. **Motion & Media** — check for:
   - Animations/transitions that should respect prefers-reduced-motion
   - Auto-playing media without controls
   - Video/audio without captions or transcripts
   - Flashing content (3 flashes per second threshold)

Output a table: File | Issue | WCAG Criterion | Severity (Critical/High/Medium/Low) | Status (Fixed/Needs Review)

Fix easy wins (missing alt text, aria-labels on icon buttons). Flag structural
issues (focus management, heading hierarchy) for my review.
```
