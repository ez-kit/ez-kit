import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = __dirname

/**
 * Files that may legitimately contain literal `style={{ ... }}` because they
 * write CSS custom properties or runtime-computed numeric values that cannot
 * move to CSS. Everything outside this set must emit `data-*` attributes
 * instead and rely on `src/styles/global.css` for layout.
 */
const INLINE_STYLE_WHITELIST = new Set([
	'data-grid/body.tsx',
	'data-grid/pin-shadow-overlay.tsx',
	'data-grid/table.tsx',
	'data-grid/virtual-body.tsx',
])

const SKIP_FILES = new Set(['test-utils.tsx', 'headless-contract.test.ts'])

function walk(dir: string, exts: readonly string[]): string[] {
	const results: string[] = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.')) continue
		if (entry.name === 'styles' || entry.name === 'utils') continue
		const full = join(dir, entry.name)
		if (entry.isDirectory()) {
			results.push(...walk(full, exts))
			continue
		}
		if (entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.ts')) continue
		if (SKIP_FILES.has(entry.name)) continue
		if (exts.some((e) => entry.name.endsWith(e))) results.push(full)
	}
	return results
}

/**
 * Every source file under `src`, including the two directories {@link walk} skips and excluding
 * only tests. Used by the drag-library guard, which has to see the whole package rather than the
 * two component directories the style rules apply to.
 */
function walkAll(dir: string): string[] {
	const results: string[] = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.')) continue
		const full = join(dir, entry.name)
		if (entry.isDirectory()) {
			results.push(...walkAll(full))
			continue
		}
		if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue
		if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) results.push(full)
	}
	return results
}

/**
 * Drag libraries are isolated behind the optional dnd-kit entry. Ordinary sources
 * depend only on the library-independent port.
 */
const DRAG_PACKAGES = ['@dnd-kit', 'react-dnd', '@hello-pangea/dnd', 'react-beautiful-dnd', 'sortablejs']

/**
 * An import, dynamic import or require of one of {@link DRAG_PACKAGES}, matched on **raw** source.
 *
 * Prose cannot satisfy this shape, so it needs no comment stripping — which matters, because
 * {@link stripComments} is regex-based and has a known blind spot (see its docblock). This pattern
 * is the guarantee; the stripped scan below is the wider net over anything that is not an import.
 */
const DRAG_IMPORT_RE = new RegExp(
	// Only true regex metacharacters are escaped — `@`, `/` and `-` are literals outside a
	// character class, and escaping them would emit identity escapes that a `u`-flagged pattern
	// would later reject.
	`(?:from|import|require)\\s*\\(?\\s*['"](?:${DRAG_PACKAGES.map((name) =>
		name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
	).join('|')})`,
)

/**
 * Block and line comments removed, so a docblock *describing* a drag library is not mistaken for a
 * dependency on it. `apps/docs/test/e2e-slots.test.ts` strips comments for exactly this reason —
 * prose that explains a thing is not the same as code addressing it.
 *
 * **Regex-based, therefore approximate in one direction**: a `/*` inside a string literal opens a
 * match that runs to the next real `*` + `/`, taking the code between with it. That is why the
 * import scan above runs on raw source rather than on this output — a stripper that can swallow
 * code must never be the only thing standing between this package and a required peer dependency.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('headless contract', () => {
	const dataGridFiles = walk(join(SRC_DIR, 'data-grid'), ['.tsx'])
	const cellTypeFiles = walk(join(SRC_DIR, 'cell-types'), ['.tsx'])
	const allFiles = [...dataGridFiles, ...cellTypeFiles, ...walk(join(SRC_DIR, 'dnd-kit'), ['.tsx'])]

	it('emits no literal `className=` strings in grid components or the adapter', () => {
		const offenders: { file: string; match: string }[] = []
		const re = /className=['"][^'"\n]+['"]/g
		for (const file of allFiles) {
			const content = readFileSync(file, 'utf8')
			let m: RegExpExecArray | null
			while ((m = re.exec(content))) {
				offenders.push({ file: relative(SRC_DIR, file), match: m[0] })
			}
		}
		expect(offenders).toEqual([])
	})

	it('emits no literal `style={{ ... }}` outside the runtime-math whitelist', () => {
		const offenders: { file: string }[] = []
		for (const file of allFiles) {
			const rel = relative(SRC_DIR, file)
			if (INLINE_STYLE_WHITELIST.has(rel)) continue
			const content = readFileSync(file, 'utf8')
			if (content.includes('style={{')) {
				offenders.push({ file: rel })
			}
		}
		expect(offenders).toEqual([])
	})

	/* Ordinary entries stay library-independent; only the canonical implementation imports peers.
	 * Built consumer tests in docs additionally prove that emitted runtime/declaration graphs
	 * cannot reach the optional adapter from an ordinary entry.
	 */
	it('imports drag libraries only from the canonical optional adapter', () => {
		const offenders: { file: string; reason: string }[] = []
		for (const file of walkAll(SRC_DIR)) {
			const source = readFileSync(file, 'utf8')
			const rel = relative(SRC_DIR, file)
			if (rel === 'dnd-kit/adapter.tsx') continue
			// Raw source: an import cannot hide behind a comment-stripping mistake.
			if (DRAG_IMPORT_RE.test(source)) offenders.push({ file: rel, reason: 'imports a drag library' })
			// Stripped source: catches a type reference, a string, a lazy specifier built by hand.
			else if (DRAG_PACKAGES.some((name) => stripComments(source).includes(name))) {
				offenders.push({ file: rel, reason: 'names a drag library outside a comment' })
			}
		}
		expect(offenders).toEqual([])
	})

	it('keeps the optional adapter unreachable from ordinary source imports', () => {
		const offenders: string[] = []
		const adapterImport = /(?:from|import|require)\s*\(?\s*['"][^'"]*dnd-kit(?:\/[^'"]*)?['"]/
		for (const file of walkAll(SRC_DIR)) {
			const rel = relative(SRC_DIR, file)
			if (rel.startsWith('dnd-kit/')) continue
			if (adapterImport.test(stripComments(readFileSync(file, 'utf8')))) offenders.push(rel)
		}
		expect(offenders).toEqual([])
	})

	it('declares drag libraries only as optional peers and development dependencies', () => {
		const manifest = JSON.parse(readFileSync(join(SRC_DIR, '..', 'package.json'), 'utf8')) as {
			dependencies?: Record<string, string>
			peerDependencies?: Record<string, string>
			peerDependenciesMeta?: Record<string, { optional?: boolean }>
			devDependencies?: Record<string, string>
		}
		const isDrag = (name: string) => DRAG_PACKAGES.some((drag) => name.startsWith(drag))
		expect(Object.keys(manifest.dependencies ?? {}).filter(isDrag)).toEqual([])
		const supported = ['@dnd-kit/dom', '@dnd-kit/react']
		expect(
			Object.keys(manifest.peerDependencies ?? {})
				.filter(isDrag)
				.sort(),
		).toEqual(supported)
		expect(
			Object.keys(manifest.devDependencies ?? {})
				.filter(isDrag)
				.sort(),
		).toEqual(supported)
		for (const name of supported) expect(manifest.peerDependenciesMeta?.[name]?.optional).toBe(true)
	})
})
