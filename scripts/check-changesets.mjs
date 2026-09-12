#!/usr/bin/env node
// Fails when a pending changeset names a package listed in `.changeset/config.json`'s `ignore`
// beside one that is not.
//
// Changesets rejects that combination outright ("Mixed changesets that contain both ignored and
// not ignored packages are not allowed"), and nothing in the PR gate notices: the failure surfaces
// in the `version` job after the merge, where it silently stops the release PR from being written.
// `@ez-kit/data-grid-shadcn` left the npm release contour when the kit became a shadcn registry
// item, and it has been written back into changeset frontmatter twice since.
//
// A changeset naming ONLY ignored packages is the other half: `changeset version` neither consumes
// nor reports it, so it sits in `.changeset/` forever. Since such a changeset can never produce a
// release entry, it is a mistake too.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const changesetDir = join(repoRoot, '.changeset')
const { ignore = [] } = JSON.parse(readFileSync(join(changesetDir, 'config.json'), 'utf8'))
const ignored = new Set(ignore)

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/
const PACKAGE_LINE = /^\s*['"]?(@?[^'":]+?)['"]?\s*:\s*(major|minor|patch)\s*$/

const problems = []

for (const file of readdirSync(changesetDir).filter((name) => name.endsWith('.md'))) {
	if (file === 'README.md') continue
	const frontmatter = FRONTMATTER.exec(readFileSync(join(changesetDir, file), 'utf8'))?.[1]
	if (!frontmatter) continue

	const packages = frontmatter
		.split(/\r?\n/)
		.map((line) => PACKAGE_LINE.exec(line)?.[1])
		.filter((name) => name !== undefined)
	if (packages.length === 0) continue

	const named = packages.filter((name) => ignored.has(name))
	if (named.length === 0) continue

	problems.push(
		named.length === packages.length
			? `${file}: names only ignored package(s) ${named.join(', ')} — this changeset can never ` +
					`be released. Delete it, or move the note onto a package that ships.`
			: `${file}: mixes ignored package(s) ${named.join(', ')} with ` +
					`${packages.filter((name) => !ignored.has(name)).join(', ')}. ` +
					`Drop the ignored one from the frontmatter.`,
	)
}

if (problems.length > 0) {
	console.error(`Changeset frontmatter names packages that are ignored in .changeset/config.json:\n`)
	for (const problem of problems) console.error(`  ${problem}`)
	console.error(`\nIgnored: ${[...ignored].join(', ')}`)
	process.exit(1)
}
