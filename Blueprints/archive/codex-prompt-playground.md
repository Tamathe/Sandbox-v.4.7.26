# Codex Prompt: Build The Playground

---

## Prompt

You are implementing a new feature called **The Playground** for an existing Next.js 16 application called "The Sandbox" — an AI-powered educational tool marketplace for the University of Kentucky.

Read the full blueprint before writing any code:
**`c:\AA Code\Educator marketplace\Blueprints\playground-vibe-coder.md`**

Also read the following existing files to understand patterns you must match:
- `the-sandbox/app/components/ChatInterface.tsx` — streaming chat pattern, auth header usage
- `the-sandbox/app/api/chat/route.ts` — Anthropic SDK streaming API route pattern
- `the-sandbox/app/lib/auth-context.tsx` — useAuth() hook and x-demo-user-email header
- `the-sandbox/app/build/page.tsx` — Build Hub page you will add a CTA to

---

## Task

Implement The Playground exactly as specified in the blueprint. Build the files in this order:

1. `app/components/playground/AppPreview.tsx`
2. `app/api/playground/chat/route.ts`
3. `app/components/playground/CodeEditor.tsx`
4. `app/components/playground/PlaygroundChat.tsx`
5. `app/components/playground/PlaygroundLayout.tsx`
6. `app/playground/page.tsx`
7. Add a Playground CTA to `app/build/page.tsx`

Install the one new dependency first: `npm install @monaco-editor/react`

---

## Constraints

- Match the code style, imports, and patterns of the existing codebase exactly
- Use `useAuth()` from `app/lib/auth-context` and pass `x-demo-user-email` on all API calls
- Use `claude-sonnet-4-6` as the model in the API route (NOT Haiku — code gen needs Sonnet)
- Use the Anthropic SDK streaming pattern from the existing `/api/chat/route.ts` — do not invent a new pattern
- Use UK Blue `#0033A0` for primary color accents in all new UI
- Use lucide-react for any icons (already installed)
- Use Tailwind CSS v4 for all styling — no CSS modules, no inline styles
- Do NOT add any new Prisma models or DB calls — Stage 1 is fully stateless/in-memory
- Do NOT modify `prisma/schema.prisma`
- The iframe `sandbox` attribute must be `"allow-scripts"` only — do NOT add `allow-same-origin`
- The system prompt for the API route must be implemented exactly as written in the blueprint — do not shorten or paraphrase it

---

## Key Behaviors to Verify After Building

1. User types a prompt → Claude streams back a complete HTML file → Monaco editor updates with the HTML → iframe auto-renders the app
2. If the generated app has a runtime JS error → the iframe postMessages it to the parent → the error appears in the chat with a "Fix this error" button → clicking it auto-submits the error to Claude → Claude returns a fixed complete HTML file
3. User can manually edit the HTML in Monaco → click "Run" → preview updates
4. Empty state in AppPreview shows a placeholder, not a blank white box
5. The API route returns a 401 if no `x-demo-user-email` header is present
6. Starter prompts appear in the chat when the messages array is empty

---

## What NOT to Build

Do not build anything listed in Section 11 of the blueprint ("What NOT to Build in Stage 1"). This includes: multi-file support, npm installs, session persistence, publish/save functionality, resizable panels, or mobile layout. The Publish button should render as a disabled gray button with tooltip "Coming soon."
