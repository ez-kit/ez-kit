#!/usr/bin/env node
// Builds shadcn registry manifests for every opted-in shadcn-flavour package and
// publishes the compiled registry-item JSON into `apps/docs/public/r`, so
// `npx shadcn add https://ez-kit-docs.vercel.app/r/<name>.json` can install them.
//
// Pipeline per package:
//   1. run its `registry.config.mjs` to (re)generate `registry.json` from source
//   2. `shadcn build` compiles that into a registry-item JSON with file contents inlined
//   3. rewrite the package's internal import alias (e.g. "@grid-shadcn/") to the
//      portable "@/" prefix shadcn's CLI knows how to remap onto a consumer's own
//      aliases — our packages use a package-scoped alias for their own dev/build,
//      which is meaningless outside the monorepo.
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const docsDir = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const outputDir = `${docsDir}/public/r`

/** Packages that publish a shadcn registry. Add an entry here to opt a new one in. */
const PACKAGES = [{ dir: 'packages/data-grid/react/shadcn', itemName: 'data-grid' }]

function packageAliasPrefix(pkgAbsDir) {
	const componentsJsonPath = `${pkgAbsDir}/components.json`
	let componentsJson
	try {
		componentsJson = JSON.parse(readFileSync(componentsJsonPath, 'utf8'))
	} catch (error) {
		throw new Error(`build-registry: couldn't read/parse ${componentsJsonPath}`, { cause: error })
	}
	const componentsAlias = componentsJson.aliases?.components
	if (typeof componentsAlias !== 'string') {
		throw new Error(`build-registry: ${componentsJsonPath} has no "aliases.components" string`)
	}
	return componentsAlias.replace(/\/components$/, '')
}

function escapeRegExp(literal) {
	return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Only rewrites the alias when it opens an import/export specifier (immediately after a quote:
 * `from '@grid-shadcn/x'`, `import('@grid-shadcn/x')`) — not a plain `String.prototype.replaceAll`
 * over the whole file, which would also corrupt an unrelated string literal or comment that
 * happens to contain the same substring.
 */
function rewriteAliasImports(content, aliasPrefix) {
	const pattern = new RegExp(`(['"])${escapeRegExp(aliasPrefix)}/`, 'g')
	return content.replace(pattern, '$1@/')
}

function rewriteAliasesInPlace(itemJsonPath, aliasPrefix) {
	const item = JSON.parse(readFileSync(itemJsonPath, 'utf8'))
	for (const file of item.files ?? []) {
		if (typeof file.content === 'string') {
			file.content = rewriteAliasImports(file.content, aliasPrefix)
		}
	}
	writeFileSync(itemJsonPath, `${JSON.stringify(item, null, '\t')}\n`)
}

// `shadcn build` writes both `<item>.json` AND an index `registry.json` into `--output`. Building
// packages one at a time into the same `outputDir` means each run's index overwrites the last —
// so instead of trusting it, we rebuild the index ourselves once, after every item is built, from
// the compiled items themselves (which is also how we already know each build actually produced
// the file it claimed to).
const items = []

for (const { dir, itemName } of PACKAGES) {
	const pkgAbsDir = `${repoRoot}/${dir}`

	execFileSync('node', ['registry.config.mjs'], { cwd: pkgAbsDir, stdio: 'inherit' })
	execFileSync('pnpm', ['exec', 'shadcn', 'build', './registry.json', '--cwd', pkgAbsDir, '--output', outputDir], {
		cwd: repoRoot,
		stdio: 'inherit',
	})

	const itemPath = `${outputDir}/${itemName}.json`
	rewriteAliasesInPlace(itemPath, packageAliasPrefix(pkgAbsDir))

	const { name, type, title, description } = JSON.parse(readFileSync(itemPath, 'utf8'))
	items.push({ name, type, title, description })
}

const sourceManifest = JSON.parse(readFileSync(`${repoRoot}/${PACKAGES[0].dir}/registry.json`, 'utf8'))
writeFileSync(
	`${outputDir}/registry.json`,
	`${JSON.stringify({ name: sourceManifest.name, homepage: sourceManifest.homepage, items }, null, '\t')}\n`,
)

console.log(`Built shadcn registry for: ${PACKAGES.map((p) => p.itemName).join(', ')}`)
console.log(`Output: ${readdirSync(outputDir).join(', ')}`)
