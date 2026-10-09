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
 * The names of the drag libraries this package must never reach for. The port is the insulation;
 * the implementation lives on a kit's own `/dnd` subpath.
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
	const allFiles = [...dataGridFiles, ...cellTypeFiles]

	it('emits no literal `className=` strings in data-grid/* or cell-types/*', () => {
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

	/*
	 * The drag-and-drop **port** lives here; no implementation ever does.
	 *
	 * The mechanics ship from a kit's own `/dnd` subpath with the drag library as an *optional*
	 * peer, so naming it in this package would make that peer a required install for every
	 * consumer of every kit — the thing the whole delivery shape exists to avoid. A well-meant
	 * refactor moving an import here is the failure mode, and it would not otherwise fail anything
	 * until a consumer's fresh install broke.
	 */
	it('imports no drag library anywhere in this package', () => {
		const offenders: { file: string; reason: string }[] = []
		for (const file of walkAll(SRC_DIR)) {
			const source = readFileSync(file, 'utf8')
			const rel = relative(SRC_DIR, file)
			// Raw source: an import cannot hide behind a comment-stripping mistake.
			if (DRAG_IMPORT_RE.test(source)) offenders.push({ file: rel, reason: 'imports a drag library' })
			// Stripped source: catches a type reference, a string, a lazy specifier built by hand.
			else if (DRAG_PACKAGES.some((name) => stripComments(source).includes(name))) {
				offenders.push({ file: rel, reason: 'names a drag library outside a comment' })
			}
		}
		expect(offenders).toEqual([])
	})

	/*
	 * The other half of the same rule: a dependency declared but not yet imported is the state a
	 * refactor passes through, and it is already a required install for every consumer of every
	 * kit. The source scan above cannot see it.
	 */
	it('declares no drag library as a dependency', () => {
		const manifest = JSON.parse(readFileSync(join(SRC_DIR, '..', 'package.json'), 'utf8')) as {
			dependencies?: Record<string, string>
			peerDependencies?: Record<string, string>
			devDependencies?: Record<string, string>
		}
		const declared = [
			...Object.keys(manifest.dependencies ?? {}),
			...Object.keys(manifest.peerDependencies ?? {}),
			...Object.keys(manifest.devDependencies ?? {}),
		]
		const offenders = declared.filter((name) => DRAG_PACKAGES.some((drag) => name.startsWith(drag)))
		expect(offenders).toEqual([])
	})
})
