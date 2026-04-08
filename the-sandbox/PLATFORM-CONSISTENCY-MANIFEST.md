# Platform Consistency Manifest
### University of Kentucky — UI Source of Truth
### Status: Living Document · Last updated: 2026-03-24 · Owner: Frontend Lead

This manifest is the single source of truth for all visual standards across the platform. Every page and component must conform to these rules. When a rule conflicts with existing code, the manifest wins — update the code.

---

## 1. Page Header Pattern

**One pattern for all pages.** Sandy in the sidebar is the personality — headers stay calm and consistent.

### Pattern A — Standard Page Header (SOLE PATTERN)
Use on: **every page**. No exceptions. Use `PageHeader` component or inline equivalent.

```tsx
<div className="bg-white border-b border-gray-200">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      {/* optional right-aligned action */}
    </div>
    {/* optional children: tabs, search bars, breadcrumbs */}
  </div>
</div>
```

**Exception:** `/evaluate` is an immersive full-screen landing page (CTA entry point), not a content page.

### BANNED Patterns
- ❌ `linear-gradient` hero/header backgrounds on any page
- ❌ `bg-gradient-to-*` as a page-level header or hero
- ❌ Purple / amber / emerald / any colored gradient as a page hero
- ❌ `style={{ background: '...' }}` with arbitrary hex colors on headers
- ❌ `text-white` on colored header backgrounds (Pattern B — deleted 2026-03-24)
- ❌ Any colored gradient as a content *card* background (allowed only on section banners)

---

## 2. Layout

### Max-Width
**All pages and sections: `max-w-6xl`**

```tsx
<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
```

- `max-w-5xl` — ❌ not permitted
- `max-w-4xl` — ❌ not permitted

### Vertical Rhythm
- Page body (below header): `py-8` or `py-10`
- Between major sections: `space-y-10` or `gap-10`
- Between items within a section: `gap-4` (grid) or `gap-5` (card grid)

### Container Padding
- Always: `px-4 sm:px-6 lg:px-8`
- Header padding: `py-6` (standard)

---

## 3. Card Geometry

### Standard Content Card
```tsx
<div className="bg-white rounded-2xl border-2 border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
```

| Property | Value | Notes |
|---|---|---|
| Background | `bg-white` | Always white — no colored fills |
| Border radius | `rounded-2xl` | All content cards |
| Border width | `border-2` | **2px** — never `border` (1px) |
| Border color | `border-gray-200` | Default; category cards may use colored borders |
| Hover | `hover:shadow-md hover:-translate-y-0.5 transition-all` | Consistent lift effect |

### Card Accent Bar (replaces gamification gradient fills)
For cards that need a color hint (zone cards, category sections), use a 4px top accent bar instead of a colored background:
```tsx
<div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden ...">
  <div className="h-1 bg-[#0033A0]" /> {/* or bg-amber-500, bg-emerald-500 per zone */}
  <div className="p-6">...</div>
</div>
```

### Section Banner Header (Featured Experiences pattern)
For curated section blocks within a page:
```tsx
{/* Header bar */}
<div
  className="rounded-t-2xl px-6 py-4 flex items-center justify-between"
  style={{ background: 'linear-gradient(135deg, #001f6b 0%, #0033A0 50%, #1a56d6 100%)' }}
>
  <span className="text-white font-bold text-lg">{sectionTitle}</span>
</div>
{/* Body */}
<div className="border-2 border-t-0 border-[#0033A0]/20 rounded-b-2xl bg-gray-50 p-4">
  {children}
</div>
```

### Smaller Cards / List Items
- Border: `border` (1px) is permitted for list rows inside a card container (e.g., session history rows inside a `rounded-2xl border-2` wrapper)
- Standalone clickable items must use `border-2`

---

## 4. Typography Scale

| Element | Classes | Notes |
|---|---|---|
| Page title (h1) | `text-2xl font-extrabold text-gray-900` | All page headers |
| Section heading (h2) | `text-base font-extrabold text-gray-900` | With optional Lucide icon (w-4 h-4) |
| Card title (h3) | `text-sm font-bold text-gray-900` | Inside content cards |
| Subtitle / description | `text-sm text-gray-500` | Below h1 or in card body |
| Meta / timestamp | `text-xs text-gray-400` | Dates, counts, secondary info |
| Eyebrow / label | `text-[11px] font-semibold uppercase tracking-wide text-gray-400` | Section label above heading |

**Key rule:** `font-extrabold` for h1/h2, `font-bold` for h3/card titles, `font-semibold` for UI labels/buttons. Never `font-bold` at the h1 level.

---

## 5. Color System

### Primary (UK Blue)
| Use | Class |
|---|---|
| Primary button fill | `bg-[#0033A0] hover:bg-[#002580]` |
| Primary text links | `text-[#0033A0]` |
| Active filter pills | `border-[#0033A0] bg-[#0033A0] text-white` |
| Focus rings | `focus-within:ring-[#0033A0] focus-within:border-[#0033A0]` |
| Section icon accents | `text-[#0033A0]` on white bg |

### Accent Colors (Category-only — not for page structure)
These exist only as category signals on tool cards and zone accent bars:
- Law/Registrar: `text-indigo-600 border-indigo-200`
- History: `text-amber-600 border-amber-200`
- STEM: `text-emerald-600 border-emerald-200`
- Medicine: `text-red-600 border-red-200`
- Business: `text-blue-600 border-blue-200`
- Arts & Humanities: `text-purple-600 border-purple-200`

### BANNED Color Uses
- ❌ Purple (`#7c3aed`, `bg-purple-*`) as a page hero or zone card background
- ❌ Solid `bg-amber-*`, `bg-emerald-*`, `bg-blue-*` as card *background fills*
- ❌ `bg-white/20` text overlaid on colored gradients

---

## 6. Pill / Badge / Filter

### Filter Pill (category selectors, type filters)
```tsx
<button className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
  active
    ? 'border-[#0033A0] bg-[#0033A0] text-white'
    : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
}`}>
```

### Status Badge (New, Hot, Coming Soon)
```tsx
<span className="text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">New</span>
```

### Icon + Label Badge (eyebrow on hero)
```tsx
<span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 text-[11px] font-medium text-gray-600">
  <Icon className="w-3 h-3" />{label}
</span>
```

---

## 7. Icon Standards

- **Library:** `lucide-react` exclusively. No heroicons, react-icons, or SVG imports.
- **Nav/section icons:** `w-4 h-4` (16px)
- **Card feature icons in icon box:** `w-5 h-5` (20px)
- **Inline meta icons:** `w-3 h-3` (12px) or `w-3.5 h-3.5` (14px)
- **Hero icons:** `w-5 h-5` to `w-6 h-6`

---

## 8. Mobile Responsiveness Checklist

Every page and component must pass:
- [ ] Single-column layout on `<640px` (no horizontal scroll)
- [ ] Grid col count: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/4`
- [ ] Touch targets ≥ 44px tall
- [ ] Text never smaller than `text-xs` (10px)
- [ ] Padding uses responsive variants: `px-4 sm:px-6 lg:px-8`

---

## 9. Gamification Relic Detector

These visual patterns indicate gamification-era code and must be replaced:
| Pattern | Replace with |
|---|---|
| Solid colored gradient as card background | White card + 4px accent bar |
| `bg-white/20` text on colored card background | Standard gray text on white bg |
| `bg-white/15 border-white/25` chip on colored bg | `bg-gray-100 text-gray-600` pill |
| `style={{ background: 'linear-gradient(... amber ...) }}` on a content card | Remove — white card only |

---

## 10. Shared Components Roadmap

| Component | Status | File | Notes |
|---|---|---|---|
| `PageHeader` | ✅ Built | `app/components/PageHeader.tsx` | Wraps Pattern A header; accepts title, subtitle, action, children |
| `TabNav` | ✅ Built | `app/components/TabNav.tsx` | Underline-style tab bar: `border-b-2 border-[#0033A0]` active, optional icons + badges. Adopted on analytics/student, constellation. |
| `SectionHeading` | ✅ Inline pattern | N/A | Use inline — too simple to extract |
| `SegmentedControl` | ✅ Built | `app/components/SegmentedControl.tsx` | Pill-style toggle tabs: `bg-gray-100 rounded-xl p-1`, active `bg-white shadow-sm`. Generic `<T extends string>`, supports ReactNode labels. Adopted on 6 files (7 call sites): AcademicStandingProcessor, data-desk, portfolio-mapper, CommunicationsLayout, lecture-debrief (×2), office-hours/faculty. |
| `ContentCard` | ❌ Not extracted | N/A | All call sites use inline card markup — 40+ locations make extraction risky without clear benefit |

---

## Revision History

| Date | Change | By |
|---|---|---|
| 2026-03-19 | Initial manifest created from cross-page audit of 5 student pages | Frontend Lead (Agent 1) |
| 2026-03-19 | UI Consistency Sweep complete — all 9 waves executed; every page in the app conforms to this manifest; `PageHeader` component built and deployed across 20+ pages; 0 TypeScript errors | Frontend Lead (Waves 1–9) |
| 2026-03-24 | Pattern B (gradient heroes) killed — all pages flattened to Pattern A. Affected: CollectionGallery, Research Hub, Campus Navigator, Office Hours (×2), Lecture Debrief (×2), Portfolio Mapper, Build prompt, Student Services [slug], Hub HeroBanner, Analytics Student. Evaluate page exempted (immersive landing). Manifest updated to single-pattern standard. | UX Sweep Convo 4 |
| 2026-03-24 | Visual micro-sweep: `TabNav` component built + adopted (analytics/student, constellation). Fixed max-w violations (admin/users 7xl→6xl, apps 5xl→6xl). Fixed apps/page.tsx gradient hero→Pattern A + card borders. Fixed compliance-exports border-width + radius. Fixed library + analytics/faculty card radius. Standardized apps filter pills to class-based. | UX Sweep Convo 5 |
| 2026-03-24 | Bulk border-radius + border-width sweep: 81 standalone cards fixed `rounded-xl`→`rounded-2xl` + `border`→`border-2` across ~50 files (admin, analytics, courses, course-map, bracket, staff, student-home, registrar, office-hours, etc.). `SegmentedControl` component built + adopted on 7 call sites. 16 h1 `font-bold`→`font-extrabold` fixes across 13 files (page titles + error states). Remaining ~1461 `rounded-xl` are legitimate on buttons, inputs, dropdowns, tooltips, badges. 0 TS errors. | UX Sweep Convo 6 |
| 2026-03-24 | Tailwind v4 `size-X` migration: all `w-X h-X` / `h-X w-X` pairs (775 instances) converted to `size-X` across entire codebase. h2 section heading audit: 14 h2s fixed `text-lg font-bold`→`text-base font-extrabold` across 10 files (build, collaborator, degree-plan, CollabJoinModal, PasteZone, PortfolioAddItemModal, StaffHomepage, profile, book-recommender, BuilderLayout). Fixed 2 pre-existing TS errors (what-if-service.ts, RequirementComparison.tsx). 0 TS errors. | UX Sweep Convo 7 |
