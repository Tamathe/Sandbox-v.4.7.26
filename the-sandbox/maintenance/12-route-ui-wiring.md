# Route-to-UI Wiring Audit

**Frequency:** Monthly
**Time:** ~15 minutes
**Why:** AI agents create pages but don't always wire them into navigation. Pages become orphaned and unreachable.

## Prompt

```
For every page under app/ (page.tsx files), verify:

1. **Reachable** — It's linked from navigation (sidebar, header, breadcrumbs, or another page's links)
2. **Layout consistent** — Uses PageHeader component, follows Pattern A header style per PLATFORM-CONSISTENCY-MANIFEST.md
3. **States handled** — Has loading and error states (loading.tsx or Suspense boundaries)
4. **Not a clone** — Isn't a copy-paste of another page with minor tweaks

Also check:
- Navigation links that point to pages that no longer exist (dead links)
- Pages with hardcoded role checks that should use the role-based nav system
- Pages missing from the role-appropriate sidebar/nav for users who should see them

Output a table:
Page Path | Linked From | Layout OK | States OK | Notes

Flag any orphaned pages or dead links for my review.
```
