# Multi-file example source panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show every file a docs example is built from as tabs above its source, with the file list derived automatically from the example's relative imports.

**Architecture:** A server-side collector parses the entry example file with the TypeScript compiler API, walks its relative imports transitively, and returns an ordered `ExampleFile[]`. Both example conventions (the data-grid manifest pipeline and the flat `LivePreview` pipeline) call it. `SourcePanel` renders a shadcn `Tabs` bar when it receives more than one file and is byte-for-byte unchanged when it receives one.

**Tech Stack:** Next.js (App Router), React 19, TypeScript compiler API (`typescript`), Vitest + Testing Library (jsdom), shadcn `Tabs` (Radix), Tailwind.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-14-example-source-file-tabs-design.md`.
- Work in `apps/docs` only. No package under `packages/` changes, no changeset needed (the docs app is not published).
- `tsconfig.base.json` is strict with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` — index access must be guarded, type-only imports must use `import type`.
- ESLint runs with `--max-warnings=0`. `import/order` is enforced: builtin (`node:*`) → external → internal (`@/*`) → relative, alphabetised, blank line between groups.
- Prettier config: tabs for indentation, single quotes, no semicolons. `pnpm --filter @ez-kit/docs format` if unsure.
- Never edit files under `packages/data-grid/react/shadcn/src/components/ui/**`. `apps/docs/components/ui/**` is vendored shadcn too — use it, do not modify it.
- Test command for every task: `pnpm --filter @ez-kit/docs test`. Single file: `pnpm --filter @ez-kit/docs test <path>`.
- Commit messages follow Conventional Commits (`feat:`, `test:`, `refactor:`); commitlint enforces this. Never pass `--no-verify`.

---

### Task 1: The collector

Builds `collectExampleFiles`, the only new logic in the feature. Nothing else in the app imports it yet, so this task is self-contained and its tests are the only consumer.

**Files:**

- Create: `apps/docs/components/example-file.ts` (type + constant, no Node imports — safe for client components)
- Create: `apps/docs/components/example-files.ts` (the collector)
- Create: `apps/docs/test/example-files.test.ts`
- Create fixtures:
  - `apps/docs/test/fixtures/outside.ts`
  - `apps/docs/test/fixtures/example-files/entry.tsx`
  - `apps/docs/test/fixtures/example-files/columns.ts`
  - `apps/docs/test/fixtures/example-files/use-data.ts`
  - `apps/docs/test/fixtures/example-files/server.ts`
  - `apps/docs/test/fixtures/example-files/cycle-a.ts`
  - `apps/docs/test/fixtures/example-files/cycle-b.ts`
  - `apps/docs/test/fixtures/example-files/broken.tsx`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `type ExampleFile = { name: string; path: string; source: string; language: string }` from `@/components/example-file`
  - `const DEFAULT_EXAMPLE_LANGUAGE = 'tsx'` from `@/components/example-file`
  - `function collectExampleFiles(entryPath: string, rootDir: string): Promise<ExampleFile[]>` from `@/components/example-files`

Note on fixtures: ESLint lints `apps/docs/test/**`. The fixture files are real TypeScript modules; keep them valid and free of unused-variable warnings by exporting everything they declare.

- [ ] **Step 1: Create the fixture tree**

`apps/docs/test/fixtures/outside.ts`:

```ts
export const OUTSIDE = 'outside the example root'
```

`apps/docs/test/fixtures/example-files/entry.tsx`:

```tsx
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns } from './columns'
import { useData } from './use-data'
import { OUTSIDE } from '../outside'

export function EntryExample() {
	const [open] = useState(false)
	const rows = useData()
	return (
		<DataGrid
			columns={columns}
			data={rows}
			title={OUTSIDE}
			open={open}
		/>
	)
}
```

`apps/docs/test/fixtures/example-files/columns.ts`:

```ts
export const columns = [{ id: 'name' }]
```

`apps/docs/test/fixtures/example-files/use-data.ts`:

```ts
import { fetchRows } from './server'

export function useData() {
	return fetchRows()
}
```

`apps/docs/test/fixtures/example-files/server.ts`:

```ts
export function fetchRows() {
	return [{ name: 'Ada' }]
}
```

`apps/docs/test/fixtures/example-files/cycle-a.ts`:

```ts
import { b } from './cycle-b'

export const a = () => b
```

`apps/docs/test/fixtures/example-files/cycle-b.ts`:

```ts
import { a } from './cycle-a'

export const b = () => a
```

`apps/docs/test/fixtures/example-files/broken.tsx`:

```tsx
// @ts-expect-error — the fixture deliberately imports a file that does not exist.
import { gone } from './nope'

export function BrokenExample() {
	return gone
}
```

- [ ] **Step 2: Write the failing test**

Create `apps/docs/test/example-files.test.ts`:

```ts
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { collectExampleFiles } from '../components/example-files'

const ROOT = fileURLToPath(new URL('./fixtures/example-files', import.meta.url))

const entry = (name: string) => path.join(ROOT, name)

describe('collectExampleFiles', () => {
	it('returns the entry file first, then its dependencies in import order', async () => {
		const files = await collectExampleFiles(entry('entry.tsx'), ROOT)

		expect(files.map((file) => file.name)).toEqual(['entry.tsx', 'columns.ts', 'use-data.ts', 'server.ts'])
	})

	it('describes each file with its basename, root-relative path and language', async () => {
		const files = await collectExampleFiles(entry('entry.tsx'), ROOT)

		expect(files[0]).toMatchObject({ name: 'entry.tsx', path: 'entry.tsx', language: 'tsx' })
		expect(files[1]).toMatchObject({ name: 'columns.ts', path: 'columns.ts', language: 'ts' })
		expect(files[1]?.source).toContain("export const columns = [{ id: 'name' }]")
	})

	it('does not collect non-relative specifiers', async () => {
		const files = await collectExampleFiles(entry('entry.tsx'), ROOT)

		expect(files.map((file) => file.name)).not.toContain('DataGrid.tsx')
		expect(files.map((file) => file.name)).not.toContain('react')
	})

	it('does not collect a file resolving outside the root', async () => {
		const files = await collectExampleFiles(entry('entry.tsx'), ROOT)

		expect(files.map((file) => file.name)).not.toContain('outside.ts')
	})

	it('terminates on an import cycle and lists each file once', async () => {
		const files = await collectExampleFiles(entry('cycle-a.ts'), ROOT)

		expect(files.map((file) => file.name)).toEqual(['cycle-a.ts', 'cycle-b.ts'])
	})

	it('skips an unresolvable relative import instead of throwing', async () => {
		const files = await collectExampleFiles(entry('broken.tsx'), ROOT)

		expect(files.map((file) => file.name)).toEqual(['broken.tsx'])
	})
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/docs test test/example-files.test.ts`
Expected: FAIL — `Failed to resolve import "../components/example-files"`.

- [ ] **Step 4: Create the shared type module**

`apps/docs/components/example-file.ts`:

```ts
/**
 * One file shown in an example's source panel. Deliberately free of Node imports:
 * the panel is a client component and must be able to import this type.
 */
export type ExampleFile = {
	/** Basename — the tab label. */
	name: string
	/** Path relative to the example root — disambiguates colliding basenames. */
	path: string
	/** Display-ready source. */
	source: string
	/** Syntax-highlighting language, derived from the extension. */
	language: string
}

export const DEFAULT_EXAMPLE_LANGUAGE = 'tsx'
```

- [ ] **Step 5: Write the collector**

`apps/docs/components/example-files.ts`:

```ts
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import ts from 'typescript'

import { DEFAULT_EXAMPLE_LANGUAGE, type ExampleFile } from '@/components/example-file'

/**
 * Which files an example is built from is derived from its imports, not registered by
 * hand: an example that splits its columns or its data hook into a sibling file gets
 * those files in its source panel automatically.
 *
 * Only *relative* specifiers are followed. A bare specifier (`react`, `@ez-kit/*`,
 * `shared/DataGrid`) names a package the reader installs, not a file they write.
 */

/** Extensions a relative specifier may resolve to, in resolution order. */
const RESOLVABLE_EXTENSIONS = ['.tsx', '.ts'] as const

/** Directory imports resolve to one of these, mirroring the bundler's behaviour. */
const INDEX_BASENAMES = ['index.tsx', 'index.ts'] as const

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
	'.tsx': 'tsx',
	'.ts': 'ts',
}

/** Parsed as TSX regardless of extension — a `.ts` file is a valid subset. */
const PARSE_FILE_NAME = 'example.tsx'

const RELATIVE_SPECIFIER = /^\.{1,2}\//u

/**
 * The entry file followed by every file reachable from it through relative imports,
 * breadth-first, each listed once. Files resolving outside `rootDir` are left out.
 */
export async function collectExampleFiles(entryPath: string, rootDir: string): Promise<ExampleFile[]> {
	const root = path.resolve(rootDir)
	const files: ExampleFile[] = []
	const visited = new Set<string>()
	const queue: string[] = [path.resolve(entryPath)]

	while (queue.length > 0) {
		const filePath = queue.shift()
		if (filePath === undefined || visited.has(filePath)) continue
		visited.add(filePath)

		const source = await readFile(filePath, 'utf8')
		files.push(toExampleFile(filePath, source, root))

		for (const specifier of relativeSpecifiers(source)) {
			const resolved = await resolveSpecifier(path.dirname(filePath), specifier)
			if (resolved !== undefined && isInside(root, resolved) && !visited.has(resolved)) queue.push(resolved)
		}
	}

	return files
}

function toExampleFile(filePath: string, source: string, root: string): ExampleFile {
	const extension = path.extname(filePath)

	return {
		name: path.basename(filePath),
		path: path.relative(root, filePath),
		source: source.replace(/\s+$/u, '\n'),
		language: LANGUAGE_BY_EXTENSION[extension] ?? DEFAULT_EXAMPLE_LANGUAGE,
	}
}

/** Every relative module specifier the file imports from or re-exports from. */
function relativeSpecifiers(source: string): string[] {
	const sourceFile = ts.createSourceFile(PARSE_FILE_NAME, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
	const specifiers: string[] = []

	for (const statement of sourceFile.statements) {
		const moduleSpecifier = ts.isImportDeclaration(statement)
			? statement.moduleSpecifier
			: ts.isExportDeclaration(statement)
				? statement.moduleSpecifier
				: undefined

		if (moduleSpecifier === undefined || !ts.isStringLiteral(moduleSpecifier)) continue
		if (RELATIVE_SPECIFIER.test(moduleSpecifier.text)) specifiers.push(moduleSpecifier.text)
	}

	return specifiers
}

/**
 * `undefined` when nothing on disk matches. The panel is display-only, so an import
 * that cannot be resolved is left out rather than failing the docs build.
 */
async function resolveSpecifier(fromDir: string, specifier: string): Promise<string | undefined> {
	const target = path.resolve(fromDir, specifier)

	const candidates = [
		target,
		...RESOLVABLE_EXTENSIONS.map((extension) => `${target}${extension}`),
		...INDEX_BASENAMES.map((basename) => path.join(target, basename)),
	]

	for (const candidate of candidates) {
		if (!isSupported(candidate)) continue
		if (await isFile(candidate)) return candidate
	}

	return undefined
}

/** JSON and other assets are not shown: the panel shows code the reader writes. */
function isSupported(filePath: string): boolean {
	return RESOLVABLE_EXTENSIONS.some((extension) => filePath.endsWith(extension))
}

async function isFile(filePath: string): Promise<boolean> {
	try {
		const stats = await stat(filePath)
		return stats.isFile()
	} catch {
		return false
	}
}

function isInside(root: string, target: string): boolean {
	const relative = path.relative(root, target)
	return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @ez-kit/docs test test/example-files.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 7: Lint and typecheck**

Run: `pnpm --filter @ez-kit/docs lint`
Run: `pnpm --filter @ez-kit/docs typecheck`
Expected: both clean. If `typecheck` fails with `Cannot find module 'collections/server'` or `'.source/server.ts' is not a module`, run `pnpm --filter @ez-kit/docs exec fumadocs-mdx` first — that is stale generated codegen, not your change.

- [ ] **Step 8: Commit**

```bash
git add apps/docs/components/example-file.ts apps/docs/components/example-files.ts apps/docs/test/example-files.test.ts apps/docs/test/fixtures
git commit -m "feat(docs): collect an example's files from its relative imports"
```

---

### Task 2: `SourcePanel` takes a file list and renders tabs

Switches the panel and everything above it from one source string to an `ExampleFile[]`, and adds the tab bar. Callers still pass a single-element array, so nothing changes on screen yet — this task is pure plumbing plus the new UI, verifiable on its own.

**Files:**

- Modify: `apps/docs/components/source-panel.tsx` (whole component)
- Modify: `apps/docs/components/example-preview.tsx` (whole component)
- Modify: `apps/docs/components/kit-example-client.tsx:22-118` (prop threading)
- Modify: `apps/docs/components/live-preview.tsx:1-30` (build a one-element array)
- Modify: `apps/docs/test/source-panel.test.tsx`
- Modify: `apps/docs/test/kit-example-client.test.tsx`
- Modify: `apps/docs/test/live-preview.test.tsx`

**Interfaces:**

- Consumes: `ExampleFile`, `DEFAULT_EXAMPLE_LANGUAGE` from `@/components/example-file` (Task 1).
- Produces:
  - `<SourcePanel files={ExampleFile[]} />` — `source` and `language` props are gone.
  - `<ExamplePreview view={ReactNode} files={ExampleFile[]} header?={ReactNode} />` — `source` and `language` props are gone.
  - `<KitExampleClient exampleId files={ExampleFile[]} defaultType? lockFlavor />` — `source` prop is gone.

Note: `DEFAULT_EXAMPLE_LANGUAGE` moves out of `source-panel.tsx` into `example-file.ts` (Task 1 already created it there). Delete the old declaration and re-point every import.

- [ ] **Step 1: Write the failing tests**

Rewrite the top of `apps/docs/test/source-panel.test.tsx` so the existing cases use the new prop, and add the tab cases. Replace the two source constants and every `render(<SourcePanel source={...} />)` call:

```tsx
import type { ExampleFile } from '../components/example-file'

const file = (name: string, source: string, language = 'tsx'): ExampleFile => ({
	name,
	path: name,
	source,
	language,
})

const SHORT_SOURCE = 'export const a = 1\n'
const LONG_SOURCE = Array.from({ length: 80 }, (_, i) => `const v${i.toString()} = ${i.toString()}`).join('\n') + '\n'

const SHORT_FILES = [file('Example.tsx', SHORT_SOURCE)]
const LONG_FILES = [file('Example.tsx', LONG_SOURCE)]
```

Each existing `render(<SourcePanel source={SHORT_SOURCE} />)` becomes `render(<SourcePanel files={SHORT_FILES} />)`; `LONG_SOURCE` likewise becomes `LONG_FILES`. The language case becomes:

```tsx
it('renders the code via DynamicCodeBlock with the file language', () => {
	render(<SourcePanel files={SHORT_FILES} />)

	const block = screen.getByTestId('mock-dyncode')
	expect(block).toHaveAttribute('data-lang', 'tsx')
	expect(block.textContent).toContain('export const a = 1')
})
```

Then append the new cases:

```tsx
const MULTI_FILES = [
	file('Example.tsx', 'export const entry = 1\n'),
	file('data.ts', 'export const columns = []\n', 'ts'),
]

describe('<SourcePanel /> file tabs', () => {
	it('renders no tablist for a single file', () => {
		render(<SourcePanel files={SHORT_FILES} />)
		expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
	})

	it('renders one tab per file, entry active first', () => {
		render(<SourcePanel files={MULTI_FILES} />)

		expect(screen.getByRole('tablist', { name: /example files/i })).toBeInTheDocument()
		expect(screen.getByRole('tab', { name: 'Example.tsx' })).toHaveAttribute('aria-selected', 'true')
		expect(screen.getByRole('tab', { name: 'data.ts' })).toHaveAttribute('aria-selected', 'false')
		expect(screen.getByTestId('mock-dyncode').textContent).toContain('export const entry = 1')
	})

	it('shows the selected file source and language when a tab is clicked', () => {
		render(<SourcePanel files={MULTI_FILES} />)

		fireEvent.click(screen.getByRole('tab', { name: 'data.ts' }))

		const block = screen.getByTestId('mock-dyncode')
		expect(block.textContent).toContain('export const columns = []')
		expect(block).toHaveAttribute('data-lang', 'ts')
	})

	it('copies the selected file', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)
		Object.assign(navigator, { clipboard: { writeText } })

		render(<SourcePanel files={MULTI_FILES} />)
		fireEvent.click(screen.getByRole('tab', { name: 'data.ts' }))
		fireEvent.click(screen.getByRole('button', { name: /^copy$/i }))

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('export const columns = []\n')
		})
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ez-kit/docs test test/source-panel.test.tsx`
Expected: FAIL — type error / `files` is not a prop, and no tablist is rendered.

- [ ] **Step 3: Rewrite `SourcePanel`**

Replace `apps/docs/components/source-panel.tsx` with:

```tsx
'use client'

import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { ExampleFile } from '@/components/example-file'

const COLLAPSED_HEIGHT_PX = 100
const COPY_FEEDBACK_MS = 2000
const FALLBACK_EXPANDED_PX = 4000

export type SourcePanelProps = {
	/** Entry file first; a single file renders without a tab bar. */
	files: readonly ExampleFile[]
}

export function SourcePanel({ files }: SourcePanelProps) {
	const first = files[0]
	const [activePath, setActivePath] = useState(first?.path ?? '')
	const active = files.find((file) => file.path === activePath) ?? first

	const contentRef = useRef<HTMLDivElement>(null)
	const [fullHeight, setFullHeight] = useState<number | null>(null)
	const [expanded, setExpanded] = useState(false)
	const [copied, setCopied] = useState(false)

	const code = active?.source ?? ''

	useEffect(() => {
		const el = contentRef.current

		if (!el) {
			return
		}

		const measure = () => {
			setFullHeight(el.scrollHeight)
		}

		measure()

		if (typeof ResizeObserver === 'undefined') {
			return
		}

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => {
			observer.disconnect()
		}
	}, [code])

	useEffect(() => {
		if (!copied) {
			return
		}

		const timer = window.setTimeout(() => {
			setCopied(false)
		}, COPY_FEEDBACK_MS)

		return () => {
			window.clearTimeout(timer)
		}
	}, [copied])

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(code)
			setCopied(true)
		} catch {
			setCopied(false)
		}
	}, [code])

	const handleToggle = useCallback(() => {
		setExpanded((value) => !value)
	}, [])

	if (!active) return null

	const overflowing = fullHeight !== null && fullHeight > COLLAPSED_HEIGHT_PX
	const showControls = overflowing
	const collapsedNow = showControls && !expanded
	const maxHeight = expanded
		? fullHeight !== null
			? `${String(fullHeight)}px`
			: `${String(FALLBACK_EXPANDED_PX)}px`
		: `${String(COLLAPSED_HEIGHT_PX)}px`

	const body = (
		<>
			<div
				className='relative overflow-hidden transition-[max-height] duration-200 ease-out'
				style={{ maxHeight }}
			>
				<div ref={contentRef}>
					<DynamicCodeBlock
						codeblock={{ className: 'border-none shadow-none rounded-none' }}
						lang={active.language}
						code={code.trimEnd()}
					/>
				</div>
				{collapsedNow ? (
					<div
						aria-hidden='true'
						className='pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-fd-card to-transparent'
					/>
				) : null}
			</div>
			{showControls ? (
				<div className='flex justify-center border-t border-fd-border/60 bg-fd-card py-2'>
					<button
						type='button'
						onClick={handleToggle}
						aria-expanded={expanded}
						className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-xs font-medium text-fd-muted-foreground shadow-sm transition-colors hover:bg-fd-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring'
					>
						{expanded ? 'Hide' : 'Show all'}
					</button>
				</div>
			) : null}
		</>
	)

	return (
		<div className='not-prose relative overflow-hidden bg-fd-card text-sm'>
			<button
				type='button'
				onClick={() => {
					void handleCopy()
				}}
				aria-live='polite'
				className='absolute right-2 top-2 z-20 rounded-md border border-fd-border bg-fd-card/90 px-2 py-1 text-xs font-medium text-fd-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-fd-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring'
			>
				{copied ? 'Copied' : 'Copy'}
			</button>
			{files.length > 1 ? (
				<Tabs
					value={active.path}
					onValueChange={setActivePath}
					className='gap-0'
				>
					<TabsList
						variant='line'
						aria-label='Example files'
						className='h-auto w-full justify-start overflow-x-auto rounded-none border-b border-fd-border bg-fd-card px-2 py-1'
					>
						{files.map((file) => (
							<TabsTrigger
								key={file.path}
								value={file.path}
								title={file.path}
								className='flex-none rounded-md px-2 py-1 text-xs'
							>
								{file.name}
							</TabsTrigger>
						))}
					</TabsList>
					<TabsContent value={active.path}>{body}</TabsContent>
				</Tabs>
			) : (
				body
			)}
		</div>
	)
}
```

Two details that matter: `active.path` is the `Tabs` value, so a file's identity is its root-relative path (basenames can collide, paths cannot), and the `TabsContent` is rendered once for whatever is active — that keeps a single measured node for the collapse logic instead of one per file.

- [ ] **Step 4: Update `ExamplePreview`**

Replace `apps/docs/components/example-preview.tsx` with:

```tsx
import { ExampleCard, ExampleShell } from '@/components/example-card'
import { SourcePanel } from '@/components/source-panel'

import type { ExampleFile } from '@/components/example-file'
import type { ReactNode } from 'react'

export type ExamplePreviewProps = {
	/** The rendered example itself — a component instance or an `<ExampleFrame />`. */
	view: ReactNode
	/** Every file the example is built from, entry first, already display-ready. */
	files: readonly ExampleFile[]
	/** Optional row above the card — a title caption or the flavor tabs. */
	header?: ReactNode
}

/**
 * The one wrapper every docs example is rendered through: optional header, the live
 * view, and the source panel below it.
 */
export function ExamplePreview({ view, files, header }: ExamplePreviewProps) {
	return (
		<ExampleShell>
			{header}
			<ExampleCard
				view={view}
				source={<SourcePanel files={files} />}
			/>
		</ExampleShell>
	)
}
```

- [ ] **Step 5: Thread the array through `KitExampleClient`**

In `apps/docs/components/kit-example-client.tsx`, change every `source: string` prop to `files: readonly ExampleFile[]` and pass it straight through. Add the import:

```tsx
import type { ExampleFile } from '@/components/example-file'
```

`ClientProps`, `UrlSwitcher` and `Switcher` each swap `source: string` for `files: readonly ExampleFile[]`. In `KitExampleClient`'s locked branch and in `Switcher`, replace `source={rewriteExampleImports(source, flavor)}` with `files={files}` for now — the per-file rewrite lands in Task 3. Delete the `rewriteExampleImports` import in this task only if nothing else in the file uses it; it comes back in Task 3, so leave the call site as `files={files}` and remove the now-unused import to keep lint green.

- [ ] **Step 6: Update `LivePreview` to pass a one-element array**

In `apps/docs/components/live-preview.tsx`, replace the `DEFAULT_EXAMPLE_LANGUAGE` import source and the returned props:

```tsx
import { DEFAULT_EXAMPLE_LANGUAGE } from '@/components/example-file'
```

```tsx
return (
	<ExamplePreview
		view={<Component />}
		files={[
			{
				name: `${path.basename(examplePath)}.tsx`,
				path: `${examplePath}.tsx`,
				source: source.trimEnd() + '\n',
				language: lang,
			},
		]}
		header={title ? <span className='text-xs text-fd-muted-foreground'>{title}</span> : null}
	/>
)
```

- [ ] **Step 7: Update the two neighbouring test files**

In `apps/docs/test/kit-example-client.test.tsx`, replace each `source={'const x = 1\n'}` with:

```tsx
files={[{ name: 'Example.tsx', path: 'Example.tsx', source: 'const x = 1\n', language: 'tsx' }]}
```

The existing assertions still hold: a single file renders no file tablist, so `queryByRole('tablist')` in the locked-flavor case still finds nothing, and `getByRole('tab', { name: /heroui/i })` still resolves to the flavor switcher.

`apps/docs/test/live-preview.test.tsx` needs no prop change (it renders `LivePreview`), but its `node:fs/promises` mock must also expose `stat`, since Task 3 will route it through the collector:

```tsx
vi.mock('node:fs/promises', () => {
	const readFile = vi.fn().mockResolvedValue('export default function Example() {\n\treturn <div>hi</div>\n}\n')
	const stat = vi.fn().mockRejectedValue(new Error('ENOENT'))
	return { default: { readFile, stat }, readFile, stat }
})
```

- [ ] **Step 8: Run the docs test suite**

Run: `pnpm --filter @ez-kit/docs test`
Expected: PASS — all files, including the four new tab cases.

- [ ] **Step 9: Lint and typecheck**

Run: `pnpm --filter @ez-kit/docs lint`
Run: `pnpm --filter @ez-kit/docs typecheck`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add apps/docs/components apps/docs/test
git commit -m "feat(docs): render the example source panel from a file list"
```

---

### Task 3: Fill the list with the example's real dependencies

Points both example pipelines at the collector. This is the task that makes `data.ts` appear on `/docs/data-grid/production`.

**Files:**

- Modify: `apps/docs/components/example-source.ts` (whole file)
- Modify: `apps/docs/components/kit-example.tsx:1-34`
- Modify: `apps/docs/components/kit-example-client.tsx` (re-add the per-file rewrite)
- Modify: `apps/docs/components/live-preview.tsx:1-30`
- Create: `apps/docs/test/example-source.test.ts`
- Modify: `apps/docs/test/live-preview.test.tsx`

**Interfaces:**

- Consumes: `collectExampleFiles` (Task 1), `<ExamplePreview files>` / `<KitExampleClient files>` (Task 2).
- Produces: `readExampleFiles(exampleId: string): Promise<ExampleFile[]>` from `@/components/example-source` — replaces `readExampleSource`.

- [ ] **Step 1: Write the failing test**

Create `apps/docs/test/example-source.test.ts`. It runs against the real example tree, so it doubles as the regression test for the production page:

```ts
import { describe, expect, it } from 'vitest'

import { readExampleFiles } from '../components/example-source'

describe('readExampleFiles', () => {
	it('lists the entry file and every file it imports relatively', async () => {
		const files = await readExampleFiles('production-orders')

		expect(files.map((file) => file.name)).toEqual(['ProductionExample.tsx', 'data.ts', 'use-orders.ts', 'server.ts'])
	})

	it('reports each dependency by its path under the example root', async () => {
		const files = await readExampleFiles('production-orders')

		expect(files[1]?.path).toBe('components/production/data.ts')
	})

	it('slices the entry file to the example export and leaves dependencies whole', async () => {
		const files = await readExampleFiles('production-orders')

		expect(files[0]?.source).toContain('export function ProductionExample')
		expect(files[1]?.source).toContain('orderColumns')
	})

	it('throws for an unknown example id', async () => {
		await expect(readExampleFiles('nope')).rejects.toThrow(/unknown example id/u)
	})
})
```

These strings come from the manifest as it stands today: id `production-orders`, `sourceFile` `components/production/ProductionExample.tsx`, `exportName` `ProductionExample`, and that file imports `./data` (which declares `orderColumns`) and `./use-orders` (which imports `./server`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/docs test test/example-source.test.ts`
Expected: FAIL — `readExampleFiles` is not exported.

- [ ] **Step 3: Rewrite `example-source.ts`**

```ts
import 'server-only'

import path from 'node:path'

import { collectExampleFiles } from '@/components/example-files'
import { extractExampleSource } from '@/components/extract-example-source'
import { EXAMPLE_SOURCE_DIRS, findExample } from '@/shared/examples-registry'

import type { ExampleFile } from '@/components/example-file'

/**
 * Every file the example's source panel shows: the entry file first, sliced down to the
 * one export `exampleId` names (some files hold several examples — see
 * `extractExampleSource`), then the files it imports, whole.
 */
export async function readExampleFiles(exampleId: string): Promise<ExampleFile[]> {
	const entry = findExample(exampleId)
	if (!entry) throw new Error(`readExampleFiles: unknown example id "${exampleId}"`)

	const root = path.join(process.cwd(), EXAMPLE_SOURCE_DIRS[entry.product])
	const [entryFile, ...dependencies] = await collectExampleFiles(path.join(root, entry.sourceFile), root)

	if (!entryFile) throw new Error(`readExampleFiles: no source for example id "${exampleId}"`)

	return [{ ...entryFile, source: extractExampleSource(entryFile.source, entry.exportName) }, ...dependencies]
}
```

- [ ] **Step 4: Point `KitExample` at it**

In `apps/docs/components/kit-example.tsx`, replace the import and the read:

```tsx
import { readExampleFiles } from '@/components/example-source'
```

```tsx
const files = await readExampleFiles(exampleId)

return (
	<KitExampleClient
		exampleId={exampleId}
		files={files}
		defaultType={defaultType}
		lockFlavor={lockFlavor ?? false}
	/>
)
```

- [ ] **Step 5: Re-add the per-file import rewrite**

In `apps/docs/components/kit-example-client.tsx`, restore the import and apply it to every file. Add a module-level helper so both the locked branch and `Switcher` use one implementation:

```tsx
import { rewriteExampleImports } from '@/components/rewrite-example-imports'
```

```tsx
function rewriteFiles(files: readonly ExampleFile[], flavor: DataGridDocsExampleFlavor): ExampleFile[] {
	return files.map((file) => ({ ...file, source: rewriteExampleImports(file.source, flavor) }))
}
```

Use `files={rewriteFiles(files, defaultType)}` in the locked branch and `files={rewriteFiles(files, flavor)}` in `Switcher`.

- [ ] **Step 6: Point `LivePreview` at the collector**

Replace the body of `apps/docs/components/live-preview.tsx`:

```tsx
import path from 'node:path'

import { ExamplePreview } from '@/components/example-preview'
import { collectExampleFiles } from '@/components/example-files'
import { DEFAULT_EXAMPLE_LANGUAGE } from '@/components/example-file'

import type { ComponentType } from 'react'

type LivePreviewProps = {
	path: string
	lang?: string
	title?: string
}

const EXAMPLES_ROOT = path.join(process.cwd(), 'shared/examples')

export async function LivePreview({ path: examplePath, lang = DEFAULT_EXAMPLE_LANGUAGE, title }: LivePreviewProps) {
	const mod = (await import(`@/shared/examples/${examplePath}`)) as { default: ComponentType }
	const Component = mod.default
	const [entryFile, ...dependencies] = await collectExampleFiles(
		path.join(EXAMPLES_ROOT, `${examplePath}.tsx`),
		EXAMPLES_ROOT,
	)

	if (!entryFile) throw new Error(`LivePreview: no source for example "${examplePath}"`)

	return (
		<ExamplePreview
			view={<Component />}
			files={[{ ...entryFile, language: lang }, ...dependencies]}
			header={title ? <span className='text-xs text-fd-muted-foreground'>{title}</span> : null}
		/>
	)
}
```

The `lang` prop keeps overriding the entry file's language, which is what the existing `live-preview.test.tsx` case asserts; dependencies keep the language their extension implies.

Fix `import/order` after this edit — `@/components/example-file` sorts before `@/components/example-files`, which sorts before `@/components/example-preview`.

- [ ] **Step 7: Run the full docs suite**

Run: `pnpm --filter @ez-kit/docs test`
Expected: PASS. `live-preview.test.tsx` still passes because its mocked entry source has no relative imports, so the collector returns exactly one file and `queryAllByRole('tab')` is still empty.

- [ ] **Step 8: Lint and typecheck**

Run: `pnpm --filter @ez-kit/docs lint`
Run: `pnpm --filter @ez-kit/docs typecheck`
Expected: clean. `readExampleSource` no longer exists — if typecheck reports another caller, update it to `readExampleFiles` the same way `kit-example.tsx` was updated.

- [ ] **Step 9: Commit**

```bash
git add apps/docs
git commit -m "feat(docs): show an example's imported files in its source panel"
```

---

### Task 4: Verify in the browser

The panel is rendered by a real Next.js route with a real file tree; the unit tests cannot tell you it looks right.

**Files:** none — verification only.

**Interfaces:**

- Consumes: everything from Tasks 1–3.
- Produces: nothing.

- [ ] **Step 1: Start the docs dev server**

Run: `pnpm docs:dev`
Expected: server on `http://localhost:3585` (check the printed port — the previous session used 3585).

- [ ] **Step 2: Check the multi-file case**

Open `http://localhost:3585/docs/data-grid/production?kit=heroui`.

Expected:

- Four tabs above the code: `ProductionExample.tsx`, `data.ts`, `use-orders.ts`, `server.ts`.
- `ProductionExample.tsx` is active on load and its source is the short entry component.
- Clicking `data.ts` shows `orderColumns`, highlighted as TypeScript.
- `Copy` copies the file currently shown, not the entry file.
- `Show all` / `Hide` still expands and collapses, and re-measures after a tab switch (switch to `server.ts` while expanded — the panel must not stay stuck at the previous file's height).
- The flavor switcher (`shadcn` / `HeroUI`) above the card still works and does not fight the file tabs.

- [ ] **Step 3: Check the single-file case is unchanged**

Open `http://localhost:3585/docs/data-grid/sorting` (any single-file grid example) and one `LivePreview` page — `http://localhost:3585/docs/zu-store`.

Expected: no file tab bar, panel identical to before.

- [ ] **Step 4: Check both themes**

Toggle the docs theme. Expected: the tab bar's active/inactive states are legible in light and dark; the bar sits on the card background, not a transparent strip.

- [ ] **Step 5: Run the repo gate**

Run: `pnpm --filter @ez-kit/docs lint`
Run: `pnpm --filter @ez-kit/docs typecheck`
Run: `pnpm --filter @ez-kit/docs test`
Expected: all clean.

- [ ] **Step 6: Commit any fixes from this task**

```bash
git add apps/docs
git commit -m "fix(docs): <what the browser check revealed>"
```

If nothing needed fixing, skip this step.
