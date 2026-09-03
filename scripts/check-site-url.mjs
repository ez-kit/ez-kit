#!/usr/bin/env node
// Fails when published prose names an ez-kit origin other than the one in `site.config.json`.
//
// The site itself resolves its origin from Vercel at build time (see `apps/docs/lib/shared.ts`),
// but npm READMEs and the install commands inside docs code fences are literal text a human copies
// — no substitution reaches them. This check is what keeps that text honest: `https://ez-kit.dev`
// sat in a dozen files while the domain resolved nowhere (`getaddrinfo ENOTFOUND`), including the
// `npx shadcn add …` command the data-grid install page tells consumers to run.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const { siteUrl } = JSON.parse(readFileSync(join(repoRoot, 'site.config.json'), 'utf8'))
const expectedOrigin = siteUrl.replace(/\/$/, '')

// Any origin that looks like this project's own site. A link to some unrelated .dev or .vercel.app
// is not this check's business.
const OWN_ORIGIN_PATTERN = /https:\/\/ez-kit[a-z0-9-]*\.(?:dev|vercel\.app)/g
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.source', '.turbo', 'dist', '.omc', 'public'])
const CHECKED_EXTENSIONS = /\.mdx?$/

function* walk(dir) {
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue
		const full = join(dir, entry)
		if (statSync(full).isDirectory()) yield* walk(full)
		else if (CHECKED_EXTENSIONS.test(entry)) yield full
	}
}

const offenders = []
for (const file of walk(repoRoot)) {
	const lines = readFileSync(file, 'utf8').split('\n')
	lines.forEach((line, i) => {
		for (const match of line.matchAll(OWN_ORIGIN_PATTERN)) {
			if (match[0] !== expectedOrigin) {
				offenders.push(`${relative(repoRoot, file)}:${i + 1}: ${match[0]}`)
			}
		}
	})
}

if (offenders.length > 0) {
	console.error(
		`check-site-url: ${offenders.length} reference(s) to an origin other than ${expectedOrigin} ` +
			`(from site.config.json):\n${offenders.map((o) => `  ${o}`).join('\n')}\n\n` +
			`Either update these to ${expectedOrigin}, or — if the site moved — change site.config.json first.`,
	)
	process.exit(1)
}

console.log(`check-site-url: all .md/.mdx references use ${expectedOrigin}`)
