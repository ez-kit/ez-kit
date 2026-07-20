#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const docsRoot = resolve(__dirname, '..')

/**
 * Each kit-switched product pairs one example manifest with the docs section that is
 * supposed to reference it. Both directions are checked per product, so a form example can
 * never be satisfied by a data-grid page happening to mention its id.
 */
const PRODUCTS = [
	{
		name: 'data-grid',
		manifest: join(docsRoot, 'shared/data-grid/examples/manifest.json'),
		docsDir: join(docsRoot, 'content/docs/data-grid'),
	},
	{
		name: 'form',
		manifest: join(docsRoot, 'shared/form/examples/manifest.json'),
		docsDir: join(docsRoot, 'content/docs/form'),
	},
]

function walk(dir) {
	const out = []
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry)
		const s = statSync(full)
		if (s.isDirectory()) {
			out.push(...walk(full))
		} else if (entry.endsWith('.mdx')) {
			out.push(full)
		}
	}
	return out
}

let failed = false

for (const product of PRODUCTS) {
	const manifest = JSON.parse(readFileSync(product.manifest, 'utf-8'))
	const manifestIds = new Set(manifest.map((entry) => entry.id))

	const mdxFiles = walk(product.docsDir)
	const referencedIds = new Set()
	const idPattern = /exampleId\s*=\s*['"]([a-z0-9-]+)['"]/g
	const fileReferences = new Map()

	for (const file of mdxFiles) {
		const body = readFileSync(file, 'utf-8')
		let match
		while ((match = idPattern.exec(body)) !== null) {
			const id = match[1]
			referencedIds.add(id)
			const rel = relative(docsRoot, file)
			if (!fileReferences.has(id)) fileReferences.set(id, [])
			fileReferences.get(id).push(rel)
		}
	}

	const missing = [...manifestIds].filter((id) => !referencedIds.has(id)).sort()
	const unknown = [...referencedIds].filter((id) => !manifestIds.has(id)).sort()

	if (missing.length === 0 && unknown.length === 0) {
		console.log(
			`✓ ${product.name}: ${manifestIds.size}/${manifestIds.size} manifest examples referenced from ${mdxFiles.length} mdx files`,
		)
		continue
	}

	failed = true

	if (missing.length > 0) {
		console.error(`\n✗ ${product.name}: ${missing.length} manifest example(s) not referenced from any doc page:`)
		for (const id of missing) console.error(`  - ${id}`)
	}
	if (unknown.length > 0) {
		console.error(`\n✗ ${product.name}: ${unknown.length} unknown exampleId(s) referenced from doc pages:`)
		for (const id of unknown) {
			const sources = fileReferences.get(id) ?? []
			console.error(`  - ${id} (in: ${sources.join(', ')})`)
		}
	}
}

process.exit(failed ? 1 : 0)
