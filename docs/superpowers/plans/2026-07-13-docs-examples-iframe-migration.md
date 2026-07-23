# Docs examples iframe migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@codesandbox/sandpack-react` live previews in `apps/docs` with real, statically-rendered Next.js example pages embedded via isolated `<iframe>`s.

**Architecture:** Each example becomes a page under an **embed root layout** (a second Next root layout via route groups) that loads only one UI kit's CSS — giving full style isolation without an in-browser bundler. A reusable `<ExampleFrame>` embeds the page with lazy mounting, auto-height (ResizeObserver → postMessage), and theme sync. Examples resolve by dynamic `import()` from `manifest.json` (no codegen); source panels read files via `fs`.

**Tech Stack:** Next.js 16 (App Router, route groups, `generateStaticParams`), React 19, Tailwind CSS v4, `next-themes`, Fumadocs, Playwright.

## Global Constraints

- Scope is `apps/docs` only — do NOT modify any published `@ez-kit/*` package.
- `DataGridDocsExample` public props are frozen: `exampleId`, `defaultType?`, `lockFlavor?`. ~40 MDX files and `components/mdx.tsx` depend on them — no MDX edits.
- Route groups `(...)` do NOT change URLs. `/`, `/docs/*`, `/sandbox/*`, `/og/*`, `/llms*` must keep working byte-for-identical URLs.
- The embed root MUST NOT import `app/globals.css` (it carries shadcn `:root` tokens that collide with heroui).
- Kit CSS is per-kit: shadcn and heroui each get their own compiled stylesheet in separate documents. Never load both in one document.
- ESLint runs with `--max-warnings=0`; type imports must use `import type`; `import/order` is enforced (alphabetical, grouped). Match existing tab-indent + no-semicolon Prettier style.
- Flavor list after migration: `shadcn`, `heroui` only. The `shadcn-native` flavor is removed.
- Manifest entry shape: `{ id, label, group, groupLabel, sourceFile, exportName }`, `sourceFile` relative to `apps/docs/shared/data-grid/examples/` (e.g. `components/base/sorting.tsx`). 72 entries.

---

## File Structure

```
apps/docs/
  app/
    (site)/                         # NEW group — existing site under its own root layout
      layout.tsx                    # MOVED from app/layout.tsx (imports globals.css)
      (home)/ docs/ sandbox/ og/    # MOVED unchanged
      llms.txt/ llms.mdx/ llms-full.txt/
    (embed)/                        # NEW group — isolated root for example iframes
      layout.tsx                    # own <html><body>, no globals.css, no-flash theme script, mounts FrameBridge
      examples/
        _styles/
          shadcn.css                # tailwind + shadcn kit css, scanned sources
          heroui.css                # tailwind + heroui kit css, scanned sources
          reset.css                 # minimal embed reset
        shadcn/
          layout.tsx                # imports ../_styles/shadcn.css
          [slug]/page.tsx           # resolves + renders example under DataGridTypeProvider type=shadcn
        heroui/
          layout.tsx                # imports ../_styles/heroui.css
          [slug]/page.tsx
    globals.css                     # unchanged location; imported by (site)/layout.tsx
  components/
    example-frame.tsx               # NEW — <ExampleFrame kit slug />
    frame-bridge.tsx                # NEW — client bridge mounted in embed root
    data-grid-docs-example.tsx      # MODIFIED — server wrapper + client switcher, ExampleFrame preview, no native
    data-grid-source-panel.tsx      # MODIFIED — accepts `source` prop, drops generated import
    example-source.ts               # NEW — server-only fs reader for example source
  lib/
    frame-messages.ts               # NEW — typed postMessage protocol shared by parent + child
  scripts/build-sandpack.mjs        # DELETED (Task 7)
  shared/data-grid/sandpack/        # DELETED (Task 7)
```

---

## Task 1: Route-group restructure + isolated shadcn example route

**Files:**

- Create dir: `apps/docs/app/(site)/`
- Move: `apps/docs/app/layout.tsx` → `apps/docs/app/(site)/layout.tsx`
- Move: `app/(home)`, `app/docs`, `app/sandbox`, `app/og`, `app/llms.txt`, `app/llms.mdx`, `app/llms-full.txt` → under `app/(site)/`
- Create: `apps/docs/app/(embed)/layout.tsx`
- Create: `apps/docs/app/(embed)/examples/_styles/reset.css`
- Create: `apps/docs/app/(embed)/examples/_styles/shadcn.css`
- Create: `apps/docs/app/(embed)/examples/shadcn/layout.tsx`
- Create: `apps/docs/app/(embed)/examples/shadcn/[slug]/page.tsx`
- Test: `apps/docs/tests/examples-iframe.spec.ts` (Playwright)

**Interfaces:**

- Consumes: `apps/docs/shared/data-grid/examples/manifest.json` (array of `{ id, sourceFile, exportName }`), `DataGridTypeProvider` from `shared/DataGrid`.
- Produces: URL `/examples/shadcn/<slug>?theme=<light|dark>` renders the example. `generateStaticParams()` yields `{ slug }` for every manifest id.

- [ ] **Step 1: Move the existing tree into a `(site)` group**

Route groups don't change URLs. Move with git so history follows:

```bash
cd apps/docs
mkdir -p "app/(site)"
git mv app/layout.tsx "app/(site)/layout.tsx"
git mv "app/(home)" "app/(site)/(home)"
git mv app/docs "app/(site)/docs"
git mv app/sandbox "app/(site)/sandbox"
git mv app/og "app/(site)/og"
git mv app/llms.txt "app/(site)/llms.txt"
git mv app/llms.mdx "app/(site)/llms.mdx"
git mv "app/llms-full.txt" "app/(site)/llms-full.txt"
```

Leave `app/globals.css` where it is — `(site)/layout.tsx` already imports it via `./globals.css`; fix that relative import in the next step.

- [ ] **Step 2: Fix the moved layout's CSS import**

In `app/(site)/layout.tsx` the import `import './globals.css'` now points one level too shallow. Change it to reach the still-at-`app/` file:

```tsx
import '../globals.css'
```

All other imports in moved files use the `@/*` alias or baseUrl-relative bare specifiers (`shared/…`, `collections/…`, `@/lib/…`), which are location-independent — do not touch them.

- [ ] **Step 3: Verify the site still builds and routes are intact**

Run: `pnpm --filter @ez-kit/docs typecheck`
Expected: PASS (no missing-module errors from the move).

- [ ] **Step 4: Create the embed root layout (no globals.css, no-flash theme)**

`app/(embed)/layout.tsx` — a second root layout. It owns `<html>`/`<body>`, loads only the embed reset, runs a blocking inline script that applies `?theme=` before paint, and mounts the client bridge:

```tsx
import { FrameBridge } from '@/components/frame-bridge'

import './examples/_styles/reset.css'

import type { ReactNode } from 'react'

// Blocking script: read ?theme before first paint so the iframe never flashes
// the wrong theme. Sets `.dark` (shadcn/tailwind custom-variant) and data-theme.
const themeBootstrap = `(function(){try{var t=new URLSearchParams(location.search).get('theme');var d=t==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`

export default function EmbedLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang='en'
			suppressHydrationWarning
		>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
			</head>
			<body>
				<FrameBridge />
				{children}
			</body>
		</html>
	)
}
```

`FrameBridge` is created in Task 3. To keep this task self-contained and testable, create a temporary stub now and replace it in Task 3:

```tsx
// apps/docs/components/frame-bridge.tsx (stub — replaced in Task 3)
'use client'

export function FrameBridge() {
	return null
}
```

- [ ] **Step 5: Create the embed reset**

`app/(embed)/examples/_styles/reset.css`:

```css
html,
body {
	margin: 0;
	background: transparent;
}

body {
	padding: 16px;
	font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 6: Create the shadcn kit stylesheet**

`app/(embed)/examples/_styles/shadcn.css`. Mirror the kit imports already proven to compile in `app/globals.css`, minus Fumadocs, plus explicit `@source` scans so utilities used by example components and kit blocks are generated. Paths are relative to this CSS file:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@ez-kit/data-grid-shadcn/global.css';

@custom-variant dark (&:is(.dark *));

@source '../../../../shared/data-grid/examples/components/**/*.{ts,tsx}';
@source '../../../../../../packages/data-grid/react/shadcn/src/**/*.{ts,tsx}';
```

Verify path depth from `app/(embed)/examples/_styles/` to the docs root is four `..` segments and to the repo `packages/` is six. If a later step shows missing utility classes, correct these globs first.

- [ ] **Step 7: Create the shadcn segment layout (imports its CSS)**

`app/(embed)/examples/shadcn/layout.tsx`:

```tsx
import '../_styles/shadcn.css'

import type { ReactNode } from 'react'

export default function ShadcnExamplesLayout({ children }: { children: ReactNode }) {
	return children
}
```

- [ ] **Step 8: Create the shadcn example page (dynamic import from manifest)**

`app/(embed)/examples/shadcn/[slug]/page.tsx`. Server component: resolve the manifest entry, dynamically import the component over a static path prefix, render it under `DataGridTypeProvider type='shadcn'`.

```tsx
import { notFound } from 'next/navigation'

import manifest from '@/shared/data-grid/examples/manifest.json'
import { DataGridTypeProvider } from '@/shared/DataGrid'

type ManifestEntry = { id: string; sourceFile: string; exportName: string }

const entries = manifest as ManifestEntry[]

export function generateStaticParams() {
	return entries.map((entry) => ({ slug: entry.id }))
}

export default async function ShadcnExamplePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const entry = entries.find((item) => item.id === slug)

	if (!entry) {
		notFound()
	}

	// Static prefix + variable suffix → bundler builds a recursive context module
	// over shared/data-grid/examples. Validated on Turbopack in Step 10.
	const mod = (await import(`@/shared/data-grid/examples/${entry.sourceFile}`)) as Record<string, React.ComponentType>
	const Example = mod[entry.exportName]

	if (!Example) {
		throw new Error(`Example "${slug}" has no export "${entry.exportName}"`)
	}

	return (
		<DataGridTypeProvider type='shadcn'>
			<Example />
		</DataGridTypeProvider>
	)
}
```

- [ ] **Step 9: Write the failing Playwright smoke test**

`apps/docs/tests/examples-iframe.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('shadcn example page renders an isolated grid', async ({ page }) => {
	await page.goto('/examples/shadcn/base-sorting?theme=light')
	// The grid table renders (data-slot from the shadcn table blocks).
	await expect(page.locator('table')).toBeVisible()
	// Isolation: docs chrome (Fumadocs sidebar/nav) must NOT be present.
	await expect(page.locator('[data-fumadocs-sidebar], nav[aria-label="Main navigation"]')).toHaveCount(0)
})
```

- [ ] **Step 10: Run the test — validates the dynamic import risk on Turbopack**

Run: `pnpm --filter @ez-kit/docs exec playwright test examples-iframe.spec.ts`
Expected: PASS. If the dynamic `import()` throws a Turbopack "cannot statically analyze" error, apply the fallback: replace Step 8's dynamic import with a hand-maintained map module `shared/data-grid/examples/registry.ts` (`export const examples = { 'base-sorting': () => import('./components/base/sorting'), … }`) and index it by slug. This changes only Step 8; the rest of the plan is unaffected.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(docs): isolated shadcn example route via embed root layout"
```

---

## Task 2: Isolated heroui example route

**Files:**

- Create: `apps/docs/app/(embed)/examples/_styles/heroui.css`
- Create: `apps/docs/app/(embed)/examples/heroui/layout.tsx`
- Create: `apps/docs/app/(embed)/examples/heroui/[slug]/page.tsx`
- Modify: `apps/docs/tests/examples-iframe.spec.ts`

**Interfaces:**

- Consumes: same manifest + `DataGridTypeProvider` as Task 1.
- Produces: URL `/examples/heroui/<slug>?theme=<light|dark>`.

- [ ] **Step 1: Create the heroui kit stylesheet**

`app/(embed)/examples/_styles/heroui.css`. Mirror the heroui synthetic entry from the old `build-sandpack.mjs` (`buildHeroUiSandpackCss`): tailwind + heroui global.css + source scans. No shadcn imports — heroui tokens only.

```css
@import 'tailwindcss';
@import '@ez-kit/data-grid-heroui/global.css';

@custom-variant dark (&:is(.dark *));

@source '../../../../shared/data-grid/examples/components/**/*.{ts,tsx}';
@source '../../../../../../packages/data-grid/react/heroui/src/**/*.{ts,tsx}';
```

- [ ] **Step 2: Create the heroui segment layout**

`app/(embed)/examples/heroui/layout.tsx`:

```tsx
import '../_styles/heroui.css'

import type { ReactNode } from 'react'

export default function HerouiExamplesLayout({ children }: { children: ReactNode }) {
	return children
}
```

- [ ] **Step 3: Create the heroui example page**

`app/(embed)/examples/heroui/[slug]/page.tsx` — identical to the shadcn page from Task 1 Step 8 but with `type='heroui'`:

```tsx
import { notFound } from 'next/navigation'

import manifest from '@/shared/data-grid/examples/manifest.json'
import { DataGridTypeProvider } from '@/shared/DataGrid'

type ManifestEntry = { id: string; sourceFile: string; exportName: string }

const entries = manifest as ManifestEntry[]

export function generateStaticParams() {
	return entries.map((entry) => ({ slug: entry.id }))
}

export default async function HerouiExamplePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const entry = entries.find((item) => item.id === slug)

	if (!entry) {
		notFound()
	}

	const mod = (await import(`@/shared/data-grid/examples/${entry.sourceFile}`)) as Record<string, React.ComponentType>
	const Example = mod[entry.exportName]

	if (!Example) {
		throw new Error(`Example "${slug}" has no export "${entry.exportName}"`)
	}

	return (
		<DataGridTypeProvider type='heroui'>
			<Example />
		</DataGridTypeProvider>
	)
}
```

- [ ] **Step 4: Add a cross-kit isolation assertion to the test**

Append to `apps/docs/tests/examples-iframe.spec.ts`:

```ts
test('heroui example renders with heroui tokens, not shadcn', async ({ page }) => {
	await page.goto('/examples/heroui/base-sorting?theme=light')
	await expect(page.locator('table')).toBeVisible()
	// heroui defines --bg-surface tokens; shadcn does not. Presence proves the
	// heroui stylesheet loaded in isolation (no shadcn :root bleed).
	const hasHerouiToken = await page.evaluate(() => {
		const v = getComputedStyle(document.documentElement).getPropertyValue('--bg-surface')
		return v.trim().length > 0
	})
	expect(hasHerouiToken).toBe(true)
})
```

If `--bg-surface` is not the actual heroui token name, grep `packages/data-grid/react/heroui/src/global.css` for a `:root`/`@theme` custom property that shadcn's global.css does not define and use that name.

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter @ez-kit/docs exec playwright test examples-iframe.spec.ts`
Expected: PASS (both shadcn and heroui).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(docs): isolated heroui example route"
```

---

## Task 3: postMessage protocol + child bridge (height + theme)

**Files:**

- Create: `apps/docs/lib/frame-messages.ts`
- Modify: `apps/docs/components/frame-bridge.tsx` (replace Task 1 stub)
- Test: `apps/docs/tests/examples-iframe.spec.ts`

**Interfaces:**

- Produces: `FrameMessage` union and `FRAME_HEIGHT`/`FRAME_THEME`/`FRAME_READY` constants consumed by `ExampleFrame` (Task 4). Child posts `{ type: FRAME_HEIGHT, height }` and `{ type: FRAME_READY }`; child listens for `{ type: FRAME_THEME, theme }`.

- [ ] **Step 1: Create the typed protocol module**

`apps/docs/lib/frame-messages.ts`:

```ts
export const FRAME_READY = 'ez-frame-ready' as const
export const FRAME_HEIGHT = 'ez-frame-height' as const
export const FRAME_THEME = 'ez-frame-theme' as const

export type FrameTheme = 'light' | 'dark'

export type FrameMessage =
	| { type: typeof FRAME_READY }
	| { type: typeof FRAME_HEIGHT; height: number }
	| { type: typeof FRAME_THEME; theme: FrameTheme }

export function isFrameMessage(value: unknown): value is FrameMessage {
	if (typeof value !== 'object' || value === null) return false
	const type = (value as { type?: unknown }).type
	return type === FRAME_READY || type === FRAME_HEIGHT || type === FRAME_THEME
}
```

- [ ] **Step 2: Implement the child bridge**

Replace `apps/docs/components/frame-bridge.tsx` with the real implementation: report `body` height on resize, announce ready, and apply theme messages to `<html>`:

```tsx
'use client'

import { useEffect } from 'react'

import { FRAME_HEIGHT, FRAME_READY, FRAME_THEME, isFrameMessage } from '@/lib/frame-messages'

function applyTheme(theme: 'light' | 'dark') {
	const isDark = theme === 'dark'
	document.documentElement.classList.toggle('dark', isDark)
	document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

export function FrameBridge() {
	useEffect(() => {
		const post = (message: { type: string; [key: string]: unknown }) => {
			window.parent.postMessage(message, window.location.origin)
		}

		const reportHeight = () => {
			post({ type: FRAME_HEIGHT, height: document.body.scrollHeight })
		}

		const observer = new ResizeObserver(reportHeight)
		observer.observe(document.body)

		const onMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return
			if (!isFrameMessage(event.data)) return
			if (event.data.type === FRAME_THEME) applyTheme(event.data.theme)
		}
		window.addEventListener('message', onMessage)

		post({ type: FRAME_READY })
		reportHeight()

		return () => {
			observer.disconnect()
			window.removeEventListener('message', onMessage)
		}
	}, [])

	return null
}
```

- [ ] **Step 3: Write the failing bridge test**

Append to `apps/docs/tests/examples-iframe.spec.ts`:

```ts
test('embed page reports height and responds to theme messages', async ({ page }) => {
	const height = await page.evaluate(async () => {
		return await new Promise<number>((resolve) => {
			window.addEventListener('message', (e) => {
				if (e.data?.type === 'ez-frame-height' && e.data.height > 0) resolve(e.data.height)
			})
			const f = document.createElement('iframe')
			f.src = '/examples/shadcn/base-sorting?theme=light'
			document.body.appendChild(f)
		})
	})
	expect(height).toBeGreaterThan(0)
})
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ez-kit/docs exec playwright test examples-iframe.spec.ts -g "reports height"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(docs): frame message protocol and embed child bridge"
```

---

## Task 4: `<ExampleFrame>` parent component

**Files:**

- Create: `apps/docs/components/example-frame.tsx`
- Test: `apps/docs/tests/examples-iframe.spec.ts`

**Interfaces:**

- Consumes: `frame-messages.ts` constants; `useTheme` from `next-themes` (available via Fumadocs `RootProvider`).
- Produces: `<ExampleFrame kit={'shadcn' | 'heroui'} slug={string} />` — a lazy, auto-height, theme-synced iframe. Exposes an optional `action?: ReactNode` slot (deferred "open in sandbox" seam; renders nothing when omitted).

- [ ] **Step 1: Implement `ExampleFrame`**

`apps/docs/components/example-frame.tsx`:

```tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'

import { FRAME_HEIGHT, FRAME_READY, FRAME_THEME, isFrameMessage } from '@/lib/frame-messages'

import type { ReactNode } from 'react'

const MIN_HEIGHT_PX = 200

export type ExampleFrameProps = {
	kit: 'shadcn' | 'heroui'
	slug: string
	action?: ReactNode
}

export function ExampleFrame({ kit, slug, action }: ExampleFrameProps) {
	const { resolvedTheme } = useTheme()
	const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
	const containerRef = useRef<HTMLDivElement>(null)
	const iframeRef = useRef<HTMLIFrameElement>(null)
	const [visible, setVisible] = useState(false)
	const [ready, setReady] = useState(false)
	const [height, setHeight] = useState(MIN_HEIGHT_PX)

	// Lazy: only set src once the container scrolls into view.
	useEffect(() => {
		const el = containerRef.current
		if (!el || visible) return
		const io = new IntersectionObserver((entries) => {
			if (entries.some((e) => e.isIntersecting)) {
				setVisible(true)
				io.disconnect()
			}
		})
		io.observe(el)
		return () => {
			io.disconnect()
		}
	}, [visible])

	// Receive height + ready from the child.
	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return
			if (event.source !== iframeRef.current?.contentWindow) return
			if (!isFrameMessage(event.data)) return
			if (event.data.type === FRAME_HEIGHT) setHeight(Math.max(MIN_HEIGHT_PX, event.data.height))
			if (event.data.type === FRAME_READY) setReady(true)
		}
		window.addEventListener('message', onMessage)
		return () => {
			window.removeEventListener('message', onMessage)
		}
	}, [])

	// Push theme changes once the child is ready.
	useEffect(() => {
		if (!ready) return
		iframeRef.current?.contentWindow?.postMessage({ type: FRAME_THEME, theme }, window.location.origin)
	}, [ready, theme])

	// Initial theme travels in the URL so there is no flash before READY.
	const src = visible ? `/examples/${kit}/${slug}?theme=${theme}` : undefined

	return (
		<div
			ref={containerRef}
			className='relative'
		>
			{action ? <div className='absolute right-2 top-2 z-10'>{action}</div> : null}
			<iframe
				ref={iframeRef}
				src={src}
				title={`${kit} example: ${slug}`}
				loading='lazy'
				style={{ width: '100%', height, border: '0', display: 'block' }}
			/>
		</div>
	)
}
```

- [ ] **Step 2: Write the failing auto-height test**

Append to `apps/docs/tests/examples-iframe.spec.ts`. Drive it through the real docs render added in Task 6; for now assert the standalone contract by mounting via a docs page that already uses it after Task 6. To keep Task 4 independently testable, add a minimal harness route under the site group:

Create `apps/docs/app/(site)/examples-harness/page.tsx`:

```tsx
import { ExampleFrame } from '@/components/example-frame'

export default function Harness() {
	return (
		<ExampleFrame
			kit='shadcn'
			slug='base-sorting'
		/>
	)
}
```

Test:

```ts
test('ExampleFrame lazily mounts and auto-sizes to content', async ({ page }) => {
	await page.goto('/examples-harness')
	const frame = page.locator('iframe')
	await expect(frame).toHaveAttribute('src', /\/examples\/shadcn\/base-sorting/)
	await expect
		.poll(async () => Number(await frame.evaluate((el) => (el as HTMLIFrameElement).clientHeight)))
		.toBeGreaterThan(200)
})
```

- [ ] **Step 3: Run the test**

Run: `pnpm --filter @ez-kit/docs exec playwright test examples-iframe.spec.ts -g "auto-sizes"`
Expected: PASS.

- [ ] **Step 4: Delete the temporary harness route**

The harness proved the contract; remove it so it does not ship:

```bash
git rm -r "apps/docs/app/(site)/examples-harness"
```

Remove the `-g "auto-sizes"` test block from the spec (it depended on the harness), or repoint it at the real docs example after Task 6. For now delete that one `test(...)` block.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(docs): ExampleFrame lazy iframe with auto-height and theme sync"
```

> **Prototype checkpoint:** Tasks 1–4 deliver the full prototype (both kits, isolation, auto-height, theme). Pause here for the user to review speed/isolation before the migration tasks 5–7.

---

## Task 5: Source panel via `fs`

**Files:**

- Create: `apps/docs/components/example-source.ts`
- Modify: `apps/docs/components/data-grid-source-panel.tsx`
- Test: `apps/docs/test/data-grid-source-panel.test.tsx`

**Interfaces:**

- Produces: `readExampleSource(exampleId: string): Promise<string>` (server-only). `DataGridSourcePanel` now takes `{ source: string; language?: string }` instead of `{ exampleId }`.

- [ ] **Step 1: Create the server-only source reader**

`apps/docs/components/example-source.ts`:

```ts
import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import manifest from '@/shared/data-grid/examples/manifest.json'

type ManifestEntry = { id: string; sourceFile: string }

const entries = manifest as ManifestEntry[]
const examplesDir = path.join(process.cwd(), 'shared/data-grid/examples')

export async function readExampleSource(exampleId: string): Promise<string> {
	const entry = entries.find((item) => item.id === exampleId)
	if (!entry) throw new Error(`readExampleSource: unknown example id "${exampleId}"`)
	const source = await readFile(path.join(examplesDir, entry.sourceFile), 'utf8')
	return source.replace(/\s+$/u, '\n')
}
```

- [ ] **Step 2: Change `DataGridSourcePanel` to accept a `source` prop**

In `apps/docs/components/data-grid-source-panel.tsx`, replace the generated import and `exampleId` prop. Delete these lines:

```tsx
import { dataGridExampleSources } from '../shared/data-grid/examples/generated/data-grid-source'

import type { DataGridSourceExampleId } from '../shared/data-grid/examples/generated/data-grid-source'
```

Change the props type and drop the lookup:

```tsx
export type DataGridSourcePanelProps = {
	source: string
	language?: string
}

export function DataGridSourcePanel({ source, language = 'tsx' }: DataGridSourcePanelProps) {
	const code = source
	// (rest of the component unchanged — it already renders `code`)
```

Remove the now-dead `if (typeof code !== 'string')` guard block (the prop is typed `string`).

- [ ] **Step 3: Write the failing test**

`apps/docs/test/data-grid-source-panel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { DataGridSourcePanel } from '@/components/data-grid-source-panel'

test('renders the provided source string', () => {
	render(<DataGridSourcePanel source={'const answer = 42\n'} />)
	expect(screen.getByText(/const answer = 42/)).toBeTruthy()
})
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ez-kit/docs test data-grid-source-panel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(docs): source panel reads example source via fs"
```

---

## Task 6: Switch `DataGridDocsExample` to iframe preview, drop native flavor

**Files:**

- Modify: `apps/docs/components/data-grid-docs-example.tsx`
- Test: `apps/docs/test/data-grid-docs-example.test.tsx`

**Interfaces:**

- Consumes: `ExampleFrame` (Task 4), `readExampleSource` (Task 5), `DataGridSourcePanel` (Task 5, `source` prop).
- Produces: `DataGridDocsExample` unchanged public props (`exampleId`, `defaultType?`, `lockFlavor?`), now an async server component that reads source and renders a client switcher whose preview is `<ExampleFrame>`. Flavors: `shadcn`, `heroui`.

- [ ] **Step 1: Split into a server wrapper + client switcher**

Rewrite `apps/docs/components/data-grid-docs-example.tsx`. The exported `DataGridDocsExample` becomes an async server component that reads the source once (source is identical across kits) and hands it to a `'use client'` inner switcher. Full replacement file:

```tsx
import { readExampleSource } from '@/components/example-source'

import { DataGridDocsExampleClient } from './data-grid-docs-example-client'

export type DataGridDocsExampleFlavor = 'shadcn' | 'heroui'

export type DataGridDocsExampleProps = {
	exampleId: string
	defaultType?: DataGridDocsExampleFlavor
	lockFlavor?: boolean
}

export async function DataGridDocsExample({ exampleId, defaultType, lockFlavor }: DataGridDocsExampleProps) {
	if (lockFlavor === true && defaultType === undefined) {
		throw new Error('<DataGridDocsExample />: `lockFlavor` requires `defaultType` ("shadcn" or "heroui").')
	}

	const source = await readExampleSource(exampleId)

	return (
		<DataGridDocsExampleClient
			exampleId={exampleId}
			source={source}
			defaultType={defaultType}
			lockFlavor={lockFlavor ?? false}
		/>
	)
}
```

- [ ] **Step 2: Create the client switcher**

`apps/docs/components/data-grid-docs-example-client.tsx`. Port the existing `FlavorSwitcher`/`FlavorTabs`/`ExampleShell`/`ExampleCard` from the old file, drop `shadcn-native`, and render `<ExampleFrame>` for the preview. `defaultType` defaults to `shadcn`.

```tsx
'use client'

import { Suspense } from 'react'

import { ExampleFrame } from '@/components/example-frame'
import { DataGridSourcePanel } from '@/components/data-grid-source-panel'
import { useUrlState } from '@/hooks/use-url-state'

import type { DataGridDocsExampleFlavor } from './data-grid-docs-example'

const FLAVOR_PARAM = 'kit'
const DEFAULT_FLAVOR: DataGridDocsExampleFlavor = 'shadcn'

const FLAVORS: readonly { value: DataGridDocsExampleFlavor; label: string }[] = [
	{ value: 'shadcn', label: 'shadcn' },
	{ value: 'heroui', label: 'HeroUI' },
]

const FLAVOR_VALUES: readonly DataGridDocsExampleFlavor[] = FLAVORS.map((flavor) => flavor.value)

type ClientProps = {
	exampleId: string
	source: string
	defaultType?: DataGridDocsExampleFlavor
	lockFlavor: boolean
}

export function DataGridDocsExampleClient({ exampleId, source, defaultType, lockFlavor }: ClientProps) {
	if (lockFlavor && defaultType) {
		return (
			<ExampleShell>
				<ExampleCard
					view={
						<ExampleFrame
							kit={defaultType}
							slug={exampleId}
						/>
					}
					source={<DataGridSourcePanel source={source} />}
				/>
			</ExampleShell>
		)
	}

	return (
		<Suspense
			fallback={
				<Switcher
					exampleId={exampleId}
					source={source}
					flavor={defaultType ?? DEFAULT_FLAVOR}
				/>
			}
		>
			<UrlSwitcher
				exampleId={exampleId}
				source={source}
				defaultType={defaultType ?? DEFAULT_FLAVOR}
			/>
		</Suspense>
	)
}

function UrlSwitcher({
	exampleId,
	source,
	defaultType,
}: {
	exampleId: string
	source: string
	defaultType: DataGridDocsExampleFlavor
}) {
	const [flavor, setFlavor] = useUrlState<DataGridDocsExampleFlavor>(FLAVOR_PARAM, {
		allowedValues: FLAVOR_VALUES,
		defaultValue: defaultType,
	})
	return (
		<Switcher
			exampleId={exampleId}
			source={source}
			flavor={flavor}
			onSelect={setFlavor}
		/>
	)
}

function Switcher({
	exampleId,
	source,
	flavor,
	onSelect,
}: {
	exampleId: string
	source: string
	flavor: DataGridDocsExampleFlavor
	onSelect?: (flavor: DataGridDocsExampleFlavor) => void
}) {
	return (
		<ExampleShell>
			<FlavorTabs
				active={flavor}
				onSelect={onSelect}
			/>
			<ExampleCard
				view={
					<ExampleFrame
						kit={flavor}
						slug={exampleId}
					/>
				}
				source={<DataGridSourcePanel source={source} />}
			/>
		</ExampleShell>
	)
}

function ExampleShell({ children }: { children: React.ReactNode }) {
	return <div className='not-prose flex flex-col gap-3'>{children}</div>
}

function ExampleCard({ view, source }: { view: React.ReactNode; source: React.ReactNode }) {
	return (
		<div className='flex flex-col flex-1 border border-fd-border rounded-lg overflow-hidden'>
			<div className='border-b border-fd-border p-2'>{view}</div>
			{source ? <div>{source}</div> : null}
		</div>
	)
}

function FlavorTabs({
	active,
	onSelect,
}: {
	active: DataGridDocsExampleFlavor
	onSelect?: (flavor: DataGridDocsExampleFlavor) => void
}) {
	return (
		<div
			role='tablist'
			aria-label='Flavor'
			className='inline-flex w-fit gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-1 text-sm dark:border-zinc-800 dark:bg-zinc-900'
		>
			{FLAVORS.map(({ value, label }) => {
				const isActive = active === value
				return (
					<button
						key={value}
						type='button'
						role='tab'
						aria-selected={isActive}
						onClick={onSelect ? () => onSelect(value) : undefined}
						className={
							isActive
								? 'rounded bg-white px-3 py-1 font-semibold underline underline-offset-4 shadow-sm dark:bg-zinc-800'
								: 'rounded px-3 py-1 font-normal text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
						}
					>
						{label}
					</button>
				)
			})}
		</div>
	)
}
```

- [ ] **Step 2b: Fix import order**

Run: `pnpm --filter @ez-kit/docs lint --fix`
Expected: import/order autofixed, 0 warnings.

- [ ] **Step 3: Update the docs-example test to the iframe render**

Replace `apps/docs/test/data-grid-docs-example.test.tsx` assertions that referenced Sandpack with an iframe-oriented check. Full replacement:

```tsx
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { DataGridDocsExampleClient } from '@/components/data-grid-docs-example-client'

vi.mock('@/hooks/use-url-state', () => ({
	useUrlState: (_k: string, o: { defaultValue: string }) => [o.defaultValue, vi.fn()],
}))

test('renders an iframe pointing at the selected kit example', () => {
	render(
		<DataGridDocsExampleClient
			exampleId='base-sorting'
			source={'const x = 1\n'}
			defaultType='shadcn'
			lockFlavor
		/>,
	)
	const frame = screen.getByTitle(/shadcn example: base-sorting/i)
	expect(frame.getAttribute('title')).toContain('base-sorting')
})
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @ez-kit/docs test data-grid-docs-example`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(docs): docs example uses ExampleFrame, drop shadcn-native flavor"
```

---

## Task 7: Remove Sandpack and its build pipeline

**Files:**

- Delete: `apps/docs/scripts/build-sandpack.mjs`
- Delete: `apps/docs/shared/data-grid/sandpack/` (whole dir incl. `DataGridSandpackExample.tsx` and `generated/`)
- Delete: `apps/docs/shared/data-grid/examples/generated/` (regenerated no more)
- Modify: `apps/docs/package.json` (scripts + dependency)
- Modify: any remaining importers of the deleted modules

**Interfaces:**

- Consumes: nothing new.
- Produces: a docs app with no Sandpack code, no prebuild step.

- [ ] **Step 1: Find every remaining reference to the deleted modules**

Run: `cd apps/docs && grep -rln "sandpack\|examples/generated\|DataGridSandpackExample\|dataGridPrimitiveExamples\|dataGridExampleSources" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.json" . | grep -v node_modules | grep -v .next`
Expected: a finite list. Every hit must be resolved in this task. Known consumers to fix or delete: `shared/data-grid/examples/DataGridTabsExample.tsx`, `shared/data-grid/examples/DataGridExamplesBrowser.tsx`, `app/(site)/sandbox/data-grid/shadcn/page.tsx`, `app/(site)/sandbox/data-grid/shadcn-primitive/page.tsx`. Inspect each: if it renders examples through the primitive registry, repoint it to the manifest + dynamic import used by the embed routes, or delete the sandbox page if it is dev-only scaffolding.

- [ ] **Step 2: Remove the prebuild wiring and dependency from package.json**

In `apps/docs/package.json`, delete the `sandpack:build` script line and strip `pnpm sandpack:build && ` from every script that includes it (`dev`, `build`, `lint`, `typecheck`, `test:visual`, `test:visual:update`). Resulting examples:

```json
"dev": "pnpm build:deps && next dev",
"build": "pnpm build:deps && next build",
"lint": "eslint .",
"typecheck": "next typegen && tsc --project tsconfig.json --noEmit",
"test:visual": "playwright test",
"test:visual:update": "playwright test --update-snapshots",
```

Remove `"@codesandbox/sandpack-react": "^2.20.0",` from `dependencies`.

- [ ] **Step 3: Delete the Sandpack code and generated output**

```bash
cd apps/docs
git rm scripts/build-sandpack.mjs
git rm -r shared/data-grid/sandpack
git rm -r shared/data-grid/examples/generated
```

- [ ] **Step 4: Reinstall to drop the dependency from the lockfile**

Run: `pnpm install`
Expected: lockfile updates, `@codesandbox/sandpack-react` removed.

- [ ] **Step 5: Full docs verification**

Run: `pnpm --filter @ez-kit/docs typecheck`
Expected: PASS (no dangling imports).

Run: `pnpm --filter @ez-kit/docs lint`
Expected: PASS, 0 warnings.

Run: `pnpm --filter @ez-kit/docs build`
Expected: PASS — `generateStaticParams` prerenders `/examples/{shadcn,heroui}/<slug>`; `/`, `/docs/*` still build.

Run: `pnpm --filter @ez-kit/docs exec playwright test examples-iframe.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(docs): remove Sandpack and its build pipeline"
```

---

## Self-Review

**Spec coverage:**

- Routes `/examples/[kit]/[slug]` + CSS isolation → Tasks 1, 2 (per-kit segments under an isolated embed root — the spec's `[kit]` dynamic segment is realized as explicit `shadcn/`+`heroui/` segments to allow static per-kit CSS imports; same URLs, same behavior).
- Dynamic import from manifest, no codegen → Task 1 Step 8 (+ fallback map in Step 10).
- Source panel via `fs` → Task 5.
- `ExampleFrame` lazy + auto-height + theme sync → Tasks 3 (protocol/bridge) + 4 (parent).
- Switcher = real kits only, MDX API frozen → Task 6.
- Delete build-sandpack, prebuild, generated, dependency, native flavor → Tasks 6, 7.
- Deferred seams: "open in sandbox" slot → Task 4 (`action` prop); Vue extension point → embed `[kit]` segment structure (documented, not built).

**Placeholder scan:** No TBD/TODO; every code step shows full content. Non-obvious lookups (heroui token name in Task 2 Step 4, `@source` glob depth in Task 1 Step 6) include explicit verification instructions rather than guesses.

**Type consistency:** `FrameMessage`/`FRAME_*` constants defined in Task 3 are used identically in Tasks 3 and 4. `readExampleSource(exampleId)` (Task 5) is consumed with that signature in Task 6. `DataGridSourcePanel` `source` prop (Task 5) matches all call sites in Task 6. `ExampleFrame` prop shape `{ kit, slug, action? }` (Task 4) matches Task 6 usage.

**Note on decomposition:** The `shadcn/[slug]/page.tsx` and `heroui/[slug]/page.tsx` bodies are near-identical; if Task 10-fallback or review prefers, extract a shared `renderExample(kit, slug)` helper. Left inline here because the two files live under different CSS-owning segments and a fresh reviewer reads each independently.
