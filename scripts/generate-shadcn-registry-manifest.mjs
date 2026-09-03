#!/usr/bin/env node
// Generates a shadcn `registry.json` manifest (the INPUT to `shadcn build`) for a
// shadcn-flavour package. Reusable across packages: each package ships its own
// `registry.config.mjs` that calls `generateRegistryManifest(config)`.
//
// `shadcn build` (see `shadcn build --help`) then compiles this manifest into
// per-item JSON files consumers install with `npx shadcn add`.
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * @typedef {object} RegistryManifestConfig
 * @property {string} pkgDir - absolute path to the package root (contains `src/`)
 * @property {string} name - registry item name (e.g. "data-grid")
 * @property {'registry:block' | 'registry:component'} type
 * @property {string} title
 * @property {string} description
 * @property {string} registryName - top-level registry `name`
 * @property {string} homepage
 * @property {string[]} dependencies - npm package names the copied files require
 * @property {string} srcDir - directory (relative to pkgDir) to scan, e.g. "src"
 * @property {Record<string, 'registry:component' | 'registry:hook' | 'registry:lib' | 'registry:file' | 'registry:ui'>} typeByTopDir
 *   - maps a top-level dir under srcDir (e.g. "blocks", "hooks", "lib") to a registry file type
 * @property {Record<string, string>} fileTypeOverrides - path (relative to srcDir) -> type, for exceptions
 * @property {string[]} registryDependencies - official shadcn/ui primitive names this item depends on
 *   (only primitives genuinely vendored unmodified from the upstream registry belong here; anything
 *   hand-written or behaviourally overridden must ship as our own file instead, see `typeByTopDir`)
 * @property {string} targetPrefix - where copied files land in the consumer project, e.g. "components/data-grid"
 * @property {string[]} rootFiles - files directly under srcDir to include (e.g. "data-grid.tsx", "styles.css")
 * @property {string[]} [excludeTopLevel] - top-level entries under srcDir that exist but are
 *   intentionally NOT part of the registry (e.g. "index.ts", the package's own npm barrel).
 *   Anything under srcDir that is neither a `typeByTopDir` key, a `rootFiles` entry, nor listed
 *   here fails the build loudly instead of being silently dropped from the registry item.
 */

function listFilesRecursive(dir) {
	const out = []
	for (const entry of readdirSync(dir)) {
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

function resolveFileType(relPosixPath, config) {
	if (config.fileTypeOverrides[relPosixPath]) return config.fileTypeOverrides[relPosixPath]
	const topDir = relPosixPath.split('/')[0]
	return config.typeByTopDir[topDir] ?? 'registry:component'
}

function assertTopLevelCoverage(srcAbs, config) {
	const known = new Set([...Object.keys(config.typeByTopDir), ...config.rootFiles, ...(config.excludeTopLevel ?? [])])
	const actual = readdirSync(srcAbs)
	const unaccounted = actual.filter((entry) => !known.has(entry))
	if (unaccounted.length > 0) {
		throw new Error(
			`generateRegistryManifest: ${srcAbs} has top-level entries not accounted for by ` +
				`typeByTopDir, rootFiles, or excludeTopLevel: ${unaccounted.join(', ')}. ` +
				`Add each one to whichever it belongs to (or excludeTopLevel if it's deliberately ` +
				`not part of the registry) — silently scanning only known dirs would drop new ones.`,
		)
	}
}

function assertPathExists(abs, describedAs) {
	if (!existsSync(abs)) {
		throw new Error(`generateRegistryManifest: ${describedAs} does not exist: ${abs}`)
	}
}

/** @param {RegistryManifestConfig} config */
export function generateRegistryManifest(config) {
	assertPathExists(config.pkgDir, 'config.pkgDir')
	const srcAbs = join(config.pkgDir, config.srcDir)
	assertPathExists(srcAbs, 'config.srcDir')

	assertTopLevelCoverage(srcAbs, config)

	const scanDirs = Object.keys(config.typeByTopDir)
	for (const dir of scanDirs) assertPathExists(join(srcAbs, dir), `config.typeByTopDir key "${dir}"`)
	const files = scanDirs
		.map((dir) => join(srcAbs, dir))
		.flatMap((dirAbs) => listFilesRecursive(dirAbs))
		.filter((abs) => !isTestFile(abs))

	for (const f of config.rootFiles) assertPathExists(join(srcAbs, f), `config.rootFiles entry "${f}"`)
	const rootFiles = config.rootFiles.map((f) => join(srcAbs, f))

	const items = [...files, ...rootFiles].map((abs) => {
		const relToSrc = relative(srcAbs, abs).split(sep).join('/')
		const relToPkg = relative(config.pkgDir, abs).split(sep).join('/')
		return {
			path: relToPkg,
			type: resolveFileType(relToSrc, config),
			target: `${config.targetPrefix}/${relToSrc}`,
		}
	})

	const manifest = {
		$schema: 'https://ui.shadcn.com/schema/registry.json',
		name: config.registryName,
		homepage: config.homepage,
		items: [
			{
				$schema: 'https://ui.shadcn.com/schema/registry-item.json',
				name: config.name,
				type: config.type,
				title: config.title,
				description: config.description,
				dependencies: config.dependencies,
				registryDependencies: config.registryDependencies,
				files: items,
			},
		],
	}

	const outPath = join(config.pkgDir, 'registry.json')
	writeFileSync(outPath, `${JSON.stringify(manifest, null, '\t')}\n`)
	return outPath
}
