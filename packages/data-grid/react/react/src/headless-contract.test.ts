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
})
