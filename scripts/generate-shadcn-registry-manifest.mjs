#!/usr/bin/env node
// Generates a shadcn `registry.json` manifest (the INPUT to `shadcn build`) for a
// shadcn-flavour package. Reusable across packages: each package ships its own
// `registry.config.mjs` that calls `generateRegistryManifest(config)`.
//
// `shadcn build` (see `shadcn build --help`) then compiles this manifest into
// per-item JSON files consumers install with `npx shadcn add`.
//
// A package may publish MORE THAN ONE item, and the manifest's `items` is where that is said.
// `shadcn add` cannot pick one item out of a multi-item document — a URL argument is parsed
// against the registry *item* schema, so pointing it at this manifest fails with
// `Invalid discriminator value`. This file is build input only; `shadcn build` writes one
// `<name>.json` per item and those are the URLs consumers install from. An item that wants
// another one installed alongside it names that item's URL in its `registryDependencies`.
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * @typedef {object} RegistryManifestItemConfig
 * @property {string} name - registry item name (e.g. "data-grid"); also the emitted `<name>.json`
 * @property {'registry:block' | 'registry:component'} type
 * @property {string} title
 * @property {string} description
 * @property {string[]} dependencies - npm package names the copied files require
 * @property {Record<string, 'registry:component' | 'registry:hook' | 'registry:lib' | 'registry:file' | 'registry:ui'>} typeByTopDir
 *   - maps a top-level dir under srcDir (e.g. "blocks", "hooks", "lib") to a registry file type.
 *     The dir is scanned recursively and every source file in it belongs to THIS item.
 * @property {Record<string, string>} fileTypeOverrides - path (relative to srcDir) -> type, for exceptions
 * @property {string[]} registryDependencies - other registry items this one needs. Either an
 *   official shadcn/ui primitive name (only primitives genuinely vendored unmodified from the
 *   upstream registry belong here; anything hand-written or behaviourally overridden must ship as
 *   our own file instead, see `typeByTopDir`), or the full URL of another item in this registry —
 *   which is how one `shadcn add` installs a pair of our own items.
 * @property {string} targetPrefix - where copied files land in the consumer project, e.g. "components/data-grid"
 * @property {string[]} rootFiles - files directly under srcDir that belong to this item
 *   (e.g. "data-grid.tsx", "styles.css")
 */

/**
 * @typedef {object} RegistryManifestConfig
 * @property {string} pkgDir - absolute path to the package root (contains `src/`)
 * @property {string} registryName - top-level registry `name`
 * @property {string} homepage
 * @property {string} srcDir - directory (relative to pkgDir) to scan, e.g. "src"
 * @property {RegistryManifestItemConfig[]} items - the items this package publishes. Every
 *   top-level entry under srcDir must belong to exactly one of them, or to `excludeTopLevel`.
 * @property {string[]} [excludeTopLevel] - top-level entries under srcDir that exist but are
 *   intentionally NOT part of the registry (e.g. "index.ts", the package's own npm barrel).
 *   Anything under srcDir that is neither a `typeByTopDir` key of some item, a `rootFiles` entry
 *   of some item, nor listed here fails the build loudly instead of being silently dropped.
 */

// The registry payload is whatever this scan returns, copied verbatim into every consumer's
// project — so it ships only files we recognise as source. Anything a tool happens to drop under
// `src/` (editor scratch files, agent/session state in a dot-dir, `.DS_Store`) would otherwise be
// published to consumers; that is not hypothetical, a stray `.omc/state/*.jsonl` was picked up here.
const SOURCE_FILE_PATTERN = /\.(tsx?|css)$/

function listFilesRecursive(dir) {
	const out = []
	for (const entry of readdirSync(dir)) {
		if (entry.startsWith('.')) continue
		const full = join(dir, entry)
		if (statSync(full).isDirectory()) {
			out.push(...listFilesRecursive(full))
		} else {
			out.push(full)
		}
	}
	return out
}

function isTestFile(path) {
	return /\.test\.tsx?$/.test(path)
}

function resolveFileType(relPosixPath, itemConfig) {
	if (itemConfig.fileTypeOverrides[relPosixPath]) return itemConfig.fileTypeOverrides[relPosixPath]
	const topDir = relPosixPath.split('/')[0]
	return itemConfig.typeByTopDir[topDir] ?? 'registry:component'
}

// Two properties, and the second only becomes possible once a package publishes more than one item:
//   1. every top-level entry under srcDir is ACCOUNTED FOR by something — some item's
//      `typeByTopDir` or `rootFiles`, or `excludeTopLevel`. Scanning only the dirs we already know
//      about would drop a newly added one from the payload silently.
//   2. nothing is accounted for TWICE. A file claimed by two items ships in both payloads, and a
//      consumer who installs both (which `registryDependencies` makes the normal case) gets two
//      items writing to one target — last one wins, silently. Claiming a file in an item *and* in
//      `excludeTopLevel` is the same contradiction read the other way.
function assertTopLevelCoverage(srcAbs, config) {
	const owners = new Map()
	const claim = (entry, owner) => owners.set(entry, [...(owners.get(entry) ?? []), owner])
	for (const item of config.items) {
		for (const dir of Object.keys(item.typeByTopDir)) claim(dir, `item "${item.name}" typeByTopDir`)
		for (const file of item.rootFiles) claim(file, `item "${item.name}" rootFiles`)
	}
	for (const entry of config.excludeTopLevel ?? []) claim(entry, 'excludeTopLevel')

	const actual = readdirSync(srcAbs)
	const unaccounted = actual.filter((entry) => !owners.has(entry))
	if (unaccounted.length > 0) {
		throw new Error(
			`generateRegistryManifest: ${srcAbs} has top-level entries not accounted for by any ` +
				`item's typeByTopDir or rootFiles, or by excludeTopLevel: ${unaccounted.join(', ')}. ` +
				`Add each one to whichever it belongs to (or excludeTopLevel if it's deliberately ` +
				`not part of the registry) — silently scanning only known dirs would drop new ones.`,
		)
	}

	const doubleClaimed = [...owners.entries()].filter(([, claimants]) => claimants.length > 1)
	if (doubleClaimed.length > 0) {
		throw new Error(
			`generateRegistryManifest: top-level entries claimed more than once: ` +
				doubleClaimed.map(([entry, claimants]) => `"${entry}" (${claimants.join(', ')})`).join('; ') +
				`. Every entry belongs to exactly one item, or to excludeTopLevel: two items shipping ` +
				`one file means a consumer who installs both has two payloads writing the same target.`,
		)
	}
}

// `shadcn add` rewrites an item's `@/`-prefixed imports by matching the import's BASENAME against
// the item's files, ignoring the directory — so two files sharing one basename make that rewrite
// ambiguous and it silently picks the wrong target. `blocks/pagination/pagination.tsx` importing
// `@/components/ui/pagination` resolved to itself: a circular import alias in every consumer's
// project (TS2303), with the real primitive shipped but imported by nothing. Nothing in this repo
// catches that — the sources typecheck fine here, the break only exists after `shadcn add`.
//
// Checked across the WHOLE payload rather than per item, which is the stricter of the two and the
// right one here on two grounds. A target collision between items is consumer-visible on its own:
// one `shadcn add` installs both (that is what `registryDependencies` is for), so two items
// writing different files to one target means one overwrites the other. And the basename rewrite
// is resolved against the files on disk after an install, not against one item's list, so two
// items contributing the same basename reproduces exactly the ambiguity above.
//
// Case-SENSITIVE on purpose. `blocks/core/Checkbox.tsx` and `components/ui/checkbox.tsx` differ
// only by case and coexist fine: verified in a real `shadcn add` install (on a case-insensitive
// macOS filesystem, so the matching is done against the item's file list, not by probing disk) —
// the installed block imports the ui primitive, which is also imported by two other blocks. Making
// this check case-insensitive would fail the build on that benign pair every time.
function assertUniqueBasenames(files) {
	const byBasename = new Map()
	for (const file of files) {
		const key = file.target
			.split('/')
			.pop()
			.replace(/\.[^.]+$/, '')
		byBasename.set(key, [...(byBasename.get(key) ?? []), file.target])
	}
	const collisions = [...byBasename.entries()].filter(([, targets]) => targets.length > 1)
	if (collisions.length > 0) {
		throw new Error(
			`generateRegistryManifest: files sharing a basename: ` +
				collisions.map(([name, targets]) => `"${name}" (${targets.join(', ')})`).join('; ') +
				`. \`shadcn add\` resolves @/ imports by basename alone, so one of these would be ` +
				`silently rewritten to the other in every consumer's project. Rename one to a ` +
				`distinct basename (e.g. PaginationBar.tsx).`,
		)
	}
}

function assertPathExists(abs, describedAs) {
	if (!existsSync(abs)) {
		throw new Error(`generateRegistryManifest: ${describedAs} does not exist: ${abs}`)
	}
}

function collectItemFiles(srcAbs, config, itemConfig) {
	const scanDirs = Object.keys(itemConfig.typeByTopDir)
	for (const dir of scanDirs) {
		assertPathExists(join(srcAbs, dir), `item "${itemConfig.name}" typeByTopDir key "${dir}"`)
	}
	const scanned = scanDirs
		.map((dir) => join(srcAbs, dir))
		.flatMap((dirAbs) => listFilesRecursive(dirAbs))
		.filter((abs) => SOURCE_FILE_PATTERN.test(abs) && !isTestFile(abs))

	for (const f of itemConfig.rootFiles) {
		assertPathExists(join(srcAbs, f), `item "${itemConfig.name}" rootFiles entry "${f}"`)
	}
	const rootFiles = itemConfig.rootFiles.map((f) => join(srcAbs, f))

	return [...scanned, ...rootFiles].map((abs) => {
		const relToSrc = relative(srcAbs, abs).split(sep).join('/')
		const relToPkg = relative(config.pkgDir, abs).split(sep).join('/')
		return {
			path: relToPkg,
			type: resolveFileType(relToSrc, itemConfig),
			target: `${itemConfig.targetPrefix}/${relToSrc}`,
		}
	})
}

/** @param {RegistryManifestConfig} config */
export function generateRegistryManifest(config) {
	assertPathExists(config.pkgDir, 'config.pkgDir')
	const srcAbs = join(config.pkgDir, config.srcDir)
	assertPathExists(srcAbs, 'config.srcDir')

	if (!Array.isArray(config.items) || config.items.length === 0) {
		throw new Error('generateRegistryManifest: config.items must be a non-empty array')
	}

	assertTopLevelCoverage(srcAbs, config)

	const items = config.items.map((itemConfig) => ({
		$schema: 'https://ui.shadcn.com/schema/registry-item.json',
		name: itemConfig.name,
		type: itemConfig.type,
		title: itemConfig.title,
		description: itemConfig.description,
		dependencies: itemConfig.dependencies,
		registryDependencies: itemConfig.registryDependencies,
		files: collectItemFiles(srcAbs, config, itemConfig),
	}))

	assertUniqueBasenames(items.flatMap((item) => item.files))

	const manifest = {
		$schema: 'https://ui.shadcn.com/schema/registry.json',
		name: config.registryName,
		homepage: config.homepage,
		items,
	}

	const outPath = join(config.pkgDir, 'registry.json')
	writeFileSync(outPath, `${JSON.stringify(manifest, null, '\t')}\n`)
	return outPath
}
