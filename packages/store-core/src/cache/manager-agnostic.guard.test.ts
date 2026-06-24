import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/** Pure-core modules that MUST NOT depend on React or any store manager. */
const PURE_CORE_FILES = ['instance-cache.ts', 'cache-utils.ts', 'to-tree.ts', 'cache-types.ts'] as const

/** Banned import specifiers (matched against the module string of an `import` statement). */
const BANNED_SPECIFIERS = ['react', 'zustand', 'valtio'] as const

function importSpecifiers(source: string): string[] {
	// Matches `import ... from '<spec>'` and bare `import '<spec>'`.
	const fromImports = [...source.matchAll(/import\b[^'"]*?from\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
	const bareImports = [...source.matchAll(/import\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
	return [...fromImports, ...bareImports].filter((s): s is string => s !== undefined)
}

describe('pure cache core is manager-agnostic', () => {
	for (const file of PURE_CORE_FILES) {
		it(`${file} imports neither React nor a store manager`, () => {
			// Resolve against the package root (vitest cwd) — `import.meta.url` is a Vite virtual path here.
			const path = join(process.cwd(), 'src', 'cache', file)
			const source = readFileSync(path, 'utf8')
			const specifiers = importSpecifiers(source)
			for (const banned of BANNED_SPECIFIERS) {
				const offending = specifiers.filter((spec) => spec === banned || spec.startsWith(`${banned}/`))
				expect(offending, `${file} must not import "${banned}"`).toEqual([])
			}
		})
	}
})
