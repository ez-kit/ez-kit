import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { FEATURE_MATRIX, FeatureStatus } from '../components/feature-matrix.data'

const DOCS_DATA_GRID_DIR = resolve(__dirname, '../content/docs/data-grid')

/**
 * Resolves a doc slug to an existing .mdx file path, or null if neither exists.
 * Checks `<slug>.mdx` first, then `<slug>/index.mdx` to handle
 * fumadocs directory sections (e.g. "editing" → editing/index.mdx).
 */
function resolveDocSlug(slug: string): string | null {
	const direct = resolve(DOCS_DATA_GRID_DIR, `${slug}.mdx`)
	if (existsSync(direct)) return direct

	const indexFile = resolve(DOCS_DATA_GRID_DIR, `${slug}/index.mdx`)
	if (existsSync(indexFile)) return indexFile

	return null
}

describe('FEATURE_MATRIX manifest', () => {
	it('has no duplicate feature names', () => {
		const names = FEATURE_MATRIX.map((row) => row.feature)
		const unique = new Set(names)
		expect(unique.size).toBe(names.length)
	})

	it('every doc slug resolves to an existing .mdx file on disk', () => {
		for (const row of FEATURE_MATRIX) {
			if (row.doc === undefined) continue
			const { doc } = row
			const resolved = resolveDocSlug(doc)
			expect(
				resolved,
				`doc "${doc}" for feature "${row.feature}" not found as ${doc}.mdx or ${doc}/index.mdx`,
			).not.toBeNull()
		}
	})

	it('Planned rows have no doc', () => {
		const plannedWithDoc = FEATURE_MATRIX.filter((row) => row.status === FeatureStatus.Planned && row.doc !== undefined)
		expect(plannedWithDoc).toEqual([])
	})

	it('non-Planned rows all have a doc', () => {
		const nonPlannedWithoutDoc = FEATURE_MATRIX.filter(
			(row) => row.status !== FeatureStatus.Planned && row.doc === undefined,
		)
		expect(nonPlannedWithoutDoc).toEqual([])
	})
})
