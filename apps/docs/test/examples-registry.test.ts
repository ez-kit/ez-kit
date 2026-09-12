// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { exampleModules as dataGridModules } from '../shared/data-grid/examples/registry'
import { EXAMPLE_SOURCE_DIRS, ExampleProduct, exampleEntries } from '../shared/examples-registry'
import { exampleModules as formModules } from '../shared/form/examples/registry'

import type { ComponentType } from 'react'

/**
 * The manifest → registry → source chain that `<ExampleRenderer />` walks, checked statically.
 *
 * Every link in it fails at *render* time and nowhere else: a manifest entry whose `sourceFile`
 * is missing from the hand-maintained registry throws `has no registry entry for "…"`, and a
 * typo'd `exportName` throws `has no export "…"` — both inside a `next/dynamic` boundary, while
 * lint, typecheck and build stay green (see AGENTS.md, "Two example conventions"). The browser
 * smoke spec catches these too, but it needs a dev server and minutes; this runs in the normal
 * suite and names the offending entry.
 */

const docsRoot = fileURLToPath(new URL('..', import.meta.url))

const MODULE_REGISTRIES: Record<ExampleProduct, Record<string, () => Promise<Record<string, ComponentType>>>> = {
	[ExampleProduct.DataGrid]: dataGridModules,
	[ExampleProduct.Form]: formModules,
}

/** `export function <Name>Example()` — the declaration form both registries rely on. */
function exportsFunction(source: string, exportName: string): boolean {
	return new RegExp(`export\\s+function\\s+${exportName}\\s*\\(`).test(source)
}

function sourcePathOf(product: ExampleProduct, sourceFile: string): string {
	return join(docsRoot, EXAMPLE_SOURCE_DIRS[product], sourceFile)
}

describe('example manifests', () => {
	it('names an id at most once across products', () => {
		const seen = new Map<string, number>()
		for (const { id } of exampleEntries) seen.set(id, (seen.get(id) ?? 0) + 1)
		expect([...seen].filter(([, count]) => count > 1).map(([id]) => id)).toEqual([])
	})

	it('gives every entry a registry entry for its source file', () => {
		const missing = exampleEntries
			.filter(({ product, sourceFile }) => !MODULE_REGISTRIES[product][sourceFile])
			.map(({ id, product, sourceFile }) => `${id} (${product}) — no registry entry for "${sourceFile}"`)
		expect(missing).toEqual([])
	})

	it('points every entry at a source file that exists', () => {
		const missing = exampleEntries
			.filter(({ product, sourceFile }) => !existsSync(sourcePathOf(product, sourceFile)))
			.map(({ id, sourceFile }) => `${id} — no file at "${sourceFile}"`)
		expect(missing).toEqual([])
	})

	it('names an export each source file actually declares', () => {
		const missing = exampleEntries
			.filter(({ product, sourceFile, exportName }) => {
				const path = sourcePathOf(product, sourceFile)
				return existsSync(path) && !exportsFunction(readFileSync(path, 'utf8'), exportName)
			})
			.map(({ id, sourceFile, exportName }) => `${id} — "${sourceFile}" declares no "${exportName}"`)
		expect(missing).toEqual([])
	})
})

describe('example registries', () => {
	/**
	 * An orphan key is dead weight that also reads as coverage: it keeps a source file wired up
	 * long after the manifest stopped naming it, so nothing renders it and nothing notices.
	 */
	it.each([
		[ExampleProduct.DataGrid, dataGridModules],
		[ExampleProduct.Form, formModules],
	])('has no %s key the manifest never asks for', (product, modules) => {
		const wanted = new Set(exampleEntries.filter((entry) => entry.product === product).map((e) => e.sourceFile))
		expect(Object.keys(modules).filter((key) => !wanted.has(key))).toEqual([])
	})
})
