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

/**
 * Packages that publish a shadcn registry. Add an entry here to opt a new one in.
 *
 * No item name here: a package may publish SEVERAL items (the shadcn kit publishes `data-grid` and
 * `data-grid-dnd`), and which ones is said by its own `registry.config.mjs`. Naming one here would
 * be the same fact written twice, and the half that went stale would be this one — leaving a
 * second item compiled into `public/r` but never post-processed, which is precisely the defect
 * below. So the names are read back out of the manifest the config just generated.
 */
const PACKAGES = [{ dir: 'packages/data-grid/react/shadcn' }]

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
let registryMeta

for (const { dir } of PACKAGES) {
	const pkgAbsDir = `${repoRoot}/${dir}`

	execFileSync('node', ['registry.config.mjs'], { cwd: pkgAbsDir, stdio: 'inherit' })
	execFileSync('pnpm', ['exec', 'shadcn', 'build', './registry.json', '--cwd', pkgAbsDir, '--output', outputDir], {
		cwd: repoRoot,
		stdio: 'inherit',
	})

	// `shadcn build` emits one `<name>.json` per item in the manifest, so the alias rewrite has to
	// run over EVERY one of them. Rewriting a single hardcoded output path was correct only while a
	// package published exactly one item: with two, the second shipped carrying this package's own
	// `@grid-shadcn/*` imports, which resolve to nothing in a consumer's project — and it would have
	// shipped silently, since the build succeeds and nothing in this repo compiles the payload.
	// `apps/docs/test/registry-payload.test.ts` asserts no emitted payload contains that alias.
	const sourceManifest = JSON.parse(readFileSync(`${pkgAbsDir}/registry.json`, 'utf8'))
	registryMeta ??= { name: sourceManifest.name, homepage: sourceManifest.homepage }
	const aliasPrefix = packageAliasPrefix(pkgAbsDir)

	for (const { name: itemName } of sourceManifest.items) {
		const itemPath = `${outputDir}/${itemName}.json`
		rewriteAliasesInPlace(itemPath, aliasPrefix)

		const { name, type, title, description } = JSON.parse(readFileSync(itemPath, 'utf8'))
		items.push({ name, type, title, description })
	}
}

writeFileSync(`${outputDir}/registry.json`, `${JSON.stringify({ ...registryMeta, items }, null, '\t')}\n`)

console.log(`Built shadcn registry items: ${items.map((item) => item.name).join(', ')}`)
console.log(`Output: ${readdirSync(outputDir).join(', ')}`)
