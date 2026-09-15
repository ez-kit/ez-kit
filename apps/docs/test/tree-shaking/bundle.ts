import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

import { build } from 'esbuild'

import type { Plugin } from 'esbuild'

/**
 * Resolves the workspace's own packages and leaves every other specifier external.
 *
 * What a consumer's bundler pulls out of `@ez-kit/*` is the subject here; `react`, `zustand`,
 * `valtio` and friends are peers it already has, and following them would measure their tree
 * shaking rather than ours. Naming them would go stale the moment a package gains a dependency,
 * so the rule is stated the other way round.
 */
const workspaceOnly: Plugin = {
	name: 'workspace-only',
	setup(build) {
		build.onResolve({ filter: /.*/ }, (args) => {
			if (args.kind === 'entry-point') return null
			const isOurs = args.path.startsWith('.') || args.path.startsWith('/') || args.path.startsWith('@ez-kit/')

			return isOurs ? null : { path: args.path, external: true }
		})
	},
}

/** Nearest ancestor `package.json` of `file`, which names the package a bundled module came from. */
function packageNameOf(file: string): string {
	let directory = dirname(file)

	while (directory !== sep) {
		const manifest = join(directory, 'package.json')
		if (existsSync(manifest)) return (JSON.parse(readFileSync(manifest, 'utf8')) as { name: string }).name
		directory = dirname(directory)
	}

	throw new Error(`No package.json above ${file}`)
}

/**
 * The import specifier a bundled module belongs to — `@ez-kit/store-core`, `@ez-kit/store-core/cache`.
 *
 * A build emits shared code into hash-named chunks (`dist/chunk-BM4M2N6B.js`), so a module's own
 * path is not something a test can name: the hash moves whenever the package's code does. Folding
 * every module onto the entry point it sits under gives a name that is stable, and that a reader
 * recognises — it is what they would have to write to import the thing.
 */
function entryPointOf(file: string): string {
	const name = packageNameOf(file)
	const [, afterDist] = file.split(`${sep}dist${sep}`)
	const subpath = dirname(afterDist ?? '.')

	return subpath === '.' ? name : `${name}/${subpath.split(sep).join('/')}`
}

/**
 * Bundles `imports` from a package's built entry and reports which entry points came along.
 *
 * `entry` is the **built** file rather than the source: tree shaking is a property of what ships,
 * and an annotation that enables it has to survive the build to do a consumer any good. Passing no
 * imports bundles the whole surface, which is what the narrow cases are read against.
 */
export async function entryPointsPulledBy(entry: string, imports?: readonly string[]): Promise<string[]> {
	const specifier = JSON.stringify(entry)
	const contents = imports
		? `import { ${imports.join(', ')} } from ${specifier}\nexport default [${imports.join(', ')}]\n`
		: `import * as everything from ${specifier}\nexport default everything\n`

	const result = await build({
		stdin: { contents, resolveDir: process.cwd(), loader: 'js' },
		bundle: true,
		format: 'esm',
		write: false,
		metafile: true,
		plugins: [workspaceOnly],
		// The entry's `'use client'` is not a directive esbuild acts on, and it warns about it.
		logLevel: 'silent',
	})

	const output = Object.values(result.metafile.outputs)[0]
	const modules = Object.keys(output?.inputs ?? {}).filter((module) => !module.startsWith('<'))

	// Metafile paths are relative to esbuild's working directory, not to the repo.
	return [...new Set(modules.map((module) => entryPointOf(resolve(process.cwd(), module))))].sort()
}
