#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const docsRoot = resolve(__dirname, '..')

const MANIFEST = join(docsRoot, 'shared/data-grid/examples/manifest.json')
const DOCS_DIR = join(docsRoot, 'content/docs/data-grid')

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'))
const manifestIds = new Set(manifest.map((entry) => entry.id))

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

const mdxFiles = walk(DOCS_DIR)
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
		`✓ verify-manifest-coverage: ${manifestIds.size}/${manifestIds.size} manifest examples referenced from ${mdxFiles.length} mdx files`,
	)
	process.exit(0)
}

if (missing.length > 0) {
	console.error(`\n✗ ${missing.length} manifest example(s) not referenced from any doc page:`)
	for (const id of missing) console.error(`  - ${id}`)
}
if (unknown.length > 0) {
	console.error(`\n✗ ${unknown.length} unknown exampleId(s) referenced from doc pages:`)
	for (const id of unknown) {
		const sources = fileReferences.get(id) ?? []
		console.error(`  - ${id} (in: ${sources.join(', ')})`)
	}
}

process.exit(1)
