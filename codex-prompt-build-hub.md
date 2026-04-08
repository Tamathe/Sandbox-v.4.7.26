Make the following three changes to `the-sandbox/app/build/page.tsx`. Do not modify any other file.

---

## Change 1: Default the experience gallery to open

Find this line (near the top of the component's useState declarations):

```tsx
const [activeCategory, setActiveCategory] = useState<string | null>(null)
```

Change it to:

```tsx
const [activeCategory, setActiveCategory] = useState<string | null>('practice')
```

---

## Change 2: Replace the hero input with a textarea

Find the entire `<form>` block inside the hero section. It looks like this:

```tsx
<form
  onSubmit={(e) => {
    e.preventDefault()
    if (buildPrompt.trim()) {
      router.push(`/builder?prompt=${encodeURIComponent(buildPrompt.trim())}`)
    }
  }}
  className="relative max-w-2xl"
>
  <input
    value={buildPrompt}
    onChange={(e) => setBuildPrompt(e.target.value)}
    placeholder='e.g. "A Socratic tutor for 1L Contracts students to practice offer and acceptance"'
    className="w-full rounded-2xl border-2 border-white/20 bg-white/10 text-white placeholder-blue-300 px-5 py-4 pr-14 text-base focus:outline-none focus:border-white/50 backdrop-blur-sm"
  />
  <button
    type="submit"
    disabled={!buildPrompt.trim()}
    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-white text-[#0033A0] flex items-center justify-center disabled:opacity-40 hover:bg-blue-50 transition-colors"
  >
    <ArrowRight className="w-4 h-4" />
  </button>
</form>
<p className="text-blue-200 text-xs mt-2">
  Most tools take less than 5 minutes to build.
</p>
```

Replace the entire block above with:

```tsx
<div className="relative max-w-2xl">
  <div className="absolute top-3 left-4 z-10">
    <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
      <Sparkles className="w-3.5 h-3.5 text-white" />
    </div>
  </div>
  <textarea
    value={buildPrompt}
    onChange={(e) => setBuildPrompt(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (buildPrompt.trim()) {
          router.push(`/builder?prompt=${encodeURIComponent(buildPrompt.trim())}`)
        }
      }
    }}
    placeholder={'e.g. "A Socratic tutor for 1L Contracts students to practice offer and acceptance"'}
    rows={3}
    className="w-full rounded-2xl border-2 border-white/20 bg-white/10 text-white placeholder-blue-300 px-5 py-4 pl-14 pb-12 text-base focus:outline-none focus:border-white/50 backdrop-blur-sm resize-none"
  />
  <div className="absolute bottom-3 right-3 flex items-center gap-3">
    <span className="text-blue-200 text-xs hidden sm:inline">Shift+Enter for new line</span>
    <button
      type="button"
      onClick={() => {
        if (buildPrompt.trim()) {
          router.push(`/builder?prompt=${encodeURIComponent(buildPrompt.trim())}`)
        }
      }}
      disabled={!buildPrompt.trim()}
      className="w-9 h-9 rounded-xl bg-white text-[#0033A0] flex items-center justify-center disabled:opacity-40 hover:bg-blue-50 transition-colors flex-shrink-0"
    >
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
</div>
<p className="text-blue-200 text-xs mt-2">
  Most tools take less than 5 minutes to build.
</p>
```

---

## Change 3: Tighten spacing

Find:
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
```
Change `py-10` to `py-8`.

Find:
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
```
Change `py-8 space-y-8` to `py-6 space-y-6`.

---

## Constraints
- Only edit `the-sandbox/app/build/page.tsx`
- Do not add any new imports (`Sparkles` is already imported)
- Do not modify any other component or file
- After making changes, verify `npx tsc --noEmit` passes with no new errors
