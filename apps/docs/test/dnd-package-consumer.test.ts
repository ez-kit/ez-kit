// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { build } from 'esbuild'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '../../..')
const REACT = resolve(ROOT, 'packages/data-grid/react/react')
const KITS = ['react', 'heroui', 'shadcn'] as const
const VALUES = [
	'adapter',
	'AnchorSide',
	'dragActivationConstraints',
	'hasTravelled',
	'toDragAnchor',
	'toDragOverEvent',
	'toDropEvent',
]
const TYPES = [
	'DragActivationConstraints',
	'DragActivationEvent',
	'DragActivationSource',
	'SortableDragEndEvent',
	'SortableDragStartEvent',
	'AnchorSide',
	'DragAnchor',
	'SortableManager',
	'DropContext',
	'SortableDragOverEvent',
]
type Manifest = {
	name: string
	version: string
	exports: Record<string, string | { import: string; types: string }>
	dependencies: Record<string, string>
	peerDependencies: Record<string, string>
}
function manifest(directory: string): Manifest {
	return JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8')) as Manifest
}

/** Refuse peer resolution instead of relying on an accidentally hoisted installation. */
function typecheck(file: string, allowDrag: boolean): string[] {
	const options: ts.CompilerOptions = {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		jsx: ts.JsxEmit.ReactJSX,
		strict: true,
		skipLibCheck: true,
		noEmit: true,
		types: [],
	}
	const host = ts.createCompilerHost(options)
	host.resolveModuleNameLiterals = (names, containingFile) =>
		names.map(({ text: name }) => {
			if (!allowDrag && name.startsWith('@dnd-kit/')) throw new Error(`Unexpected drag declaration import: ${name}`)
			return ts.resolveModuleName(name, containingFile, options, host)
		})
	return ts
		.getPreEmitDiagnostics(ts.createProgram([file], options, host))
		.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
}

async function bundle(file: string, allowDrag: boolean) {
	return build({
		entryPoints: [file],
		bundle: true,
		write: false,
		format: 'esm',
		platform: 'node',
		logLevel: 'silent',
		plugins: [
			{
				name: 'optional-drag-boundary',
				setup(builder) {
					builder.onResolve({ filter: /^@dnd-kit\// }, (args) => {
						if (!allowDrag) throw new Error(`Unexpected drag runtime import: ${args.path}`)
						return { path: args.path, external: true }
					})
					builder.onResolve({ filter: /^[^./]/ }, (args) =>
						args.path.startsWith('@ez-kit/') || args.path.startsWith('@dnd-kit/')
							? null
							: { path: args.path, external: true },
					)
				},
			},
		],
	})
}

function linkDependency(base: string, name: string, source: string) {
	const target = resolve(base, 'node_modules', name)
	mkdirSync(dirname(target), { recursive: true })
	symlinkSync(source, target, 'dir')
}

function withConsumer(run: (directory: string) => Promise<void>) {
	const directory = mkdtempSync(resolve(tmpdir(), 'ez-grid-dnd-'))
	return run(directory).finally(() => {
		rmSync(directory, { recursive: true, force: true })
	})
}

describe('built optional adapter consumers', () => {
	it.each(KITS)('imports and type-checks every ordinary %s entry with drag resolution forbidden', async (kit) => {
		await withConsumer(async (directory) => {
			const pkgDir = resolve(ROOT, 'packages/data-grid/react', kit)
			const pkg = manifest(pkgDir)
			linkDependency(directory, pkg.name, pkgDir)
			const entries = Object.entries(pkg.exports).filter(
				([name, target]) => name !== './dnd' && name !== './dnd-kit' && typeof target === 'object',
			)
			const source = entries
				.map(
					([name], i) =>
						`import * as entry${String(i)} from '${pkg.name}${name === '.' ? '' : name.slice(1)}'; export { entry${String(i)} };`,
				)
				.join('\n')
			const file = resolve(directory, 'consumer.ts')
			writeFileSync(file, source)
			expect((await bundle(file, false)).outputFiles[0]?.text).not.toContain('@dnd-kit/')
			expect(typecheck(file, false)).toEqual([])
		})
	})

	it('the installed registry wrapper requires and resolves the release supplying the subpath', async () => {
		await withConsumer(async (directory) => {
			// Synthetic versions model the normal minor changeset without changing workspace manifests.
			const current = manifest(REACT)
			const [major = '0', minor = '0'] = current.version.split('.')
			const supplying = `${major}.${String(Number(minor) + 1)}.0`
			const packageDir = resolve(directory, 'node_modules/@ez-kit/data-grid-react')
			mkdirSync(packageDir, { recursive: true })
			cpSync(resolve(REACT, 'dist'), resolve(packageDir, 'dist'), { recursive: true })
			const old = { ...current, exports: { ...current.exports } }
			delete old.exports['./dnd-kit']
			writeFileSync(resolve(packageDir, 'package.json'), JSON.stringify(old))
			for (const name of new Set([
				...Object.keys(current.dependencies),
				...Object.keys(current.peerDependencies),
				'react-dom',
			])) {
				linkDependency(directory, name, resolve(REACT, 'node_modules', name))
			}

			// Run the actual registry config against a release fixture, using real payload sources.
			const kitDir = resolve(directory, 'packages/data-grid/react/shadcn')
			mkdirSync(kitDir, { recursive: true })
			symlinkSync(resolve(ROOT, 'packages/data-grid/react/shadcn/src'), resolve(kitDir, 'src'), 'dir')
			cpSync(resolve(ROOT, 'packages/data-grid/react/shadcn/package.json'), resolve(kitDir, 'package.json'))
			const fixtureReact = resolve(directory, 'packages/data-grid/react/react')
			const fixtureCore = resolve(directory, 'packages/data-grid/core')
			mkdirSync(fixtureReact, { recursive: true })
			mkdirSync(fixtureCore, { recursive: true })
			writeFileSync(resolve(fixtureReact, 'package.json'), JSON.stringify({ version: supplying }))
			cpSync(resolve(ROOT, 'packages/data-grid/core/package.json'), resolve(fixtureCore, 'package.json'))
			cpSync(resolve(ROOT, 'site.config.json'), resolve(directory, 'site.config.json'))
			const generator = pathToFileURL(resolve(ROOT, 'scripts/generate-shadcn-registry-manifest.mjs')).href
			const config = readFileSync(resolve(ROOT, 'packages/data-grid/react/shadcn/registry.config.mjs'), 'utf8').replace(
				'../../../../scripts/generate-shadcn-registry-manifest.mjs',
				generator,
			)
			writeFileSync(resolve(kitDir, 'registry.config.mjs'), config)
			execFileSync(process.execPath, [resolve(kitDir, 'registry.config.mjs')])
			const registry = JSON.parse(readFileSync(resolve(kitDir, 'registry.json'), 'utf8')) as {
				items: { name: string; dependencies: string[] }[]
			}
			const range = registry.items
				.find((item) => item.name === 'data-grid')
				?.dependencies.find((dep) => dep.startsWith('@ez-kit/data-grid-react@'))
			expect(range).toBe(`@ez-kit/data-grid-react@^${supplying}`)
			expect(supplying).not.toBe(current.version)

			const payload = JSON.parse(readFileSync(resolve(ROOT, 'apps/docs/public/r/data-grid-dnd.json'), 'utf8')) as {
				files: { content: string }[]
			}
			const wrapper = resolve(directory, 'dnd.tsx')
			writeFileSync(wrapper, payload.files[0]?.content ?? '')
			await expect(bundle(wrapper, true)).rejects.toThrow(/Could not resolve/)
			expect(typecheck(wrapper, true).join('\n')).toContain('@ez-kit/data-grid-react/dnd-kit')

			writeFileSync(resolve(packageDir, 'package.json'), JSON.stringify({ ...current, version: supplying }))
			const consumer = resolve(directory, 'consumer.tsx')
			writeFileSync(
				consumer,
				`import * as local from './dnd'; import * as shared from '@ez-kit/data-grid-react/dnd-kit';\n${TYPES.map((name) => `const check${name}: shared.${name} = null as unknown as local.${name}; export { check${name} };`).join('\n')}\nexport { local, shared };`,
			)
			expect(typecheck(consumer, true)).toEqual([])
			const output = (await bundle(consumer, true)).outputFiles[0]?.text ?? ''
			expect(output).toContain('@dnd-kit/react/sortable')
			// Execute the installed wrapper against real supported peers, asserting every public identity.
			const installed = (await import(pathToFileURL(resolve(packageDir, 'dist/dnd-kit/index.js')).href)) as Record<
				string,
				unknown
			>
			const bundledWrapper = resolve(directory, 'wrapper.mjs')
			await build({
				entryPoints: [wrapper],
				outfile: bundledWrapper,
				bundle: true,
				format: 'esm',
				platform: 'node',
				packages: 'external',
			})
			const compatible = (await import(pathToFileURL(bundledWrapper).href)) as Record<string, unknown>
			expect(Object.keys(compatible).sort()).toEqual([...VALUES].sort())
			for (const name of VALUES) expect(compatible[name]).toBe(installed[name])
		})
	})
})
