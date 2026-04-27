import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const docsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = path.resolve(docsDir, '../..')
const examplesDir = path.join(docsDir, 'shared/data-grid/examples')
const examplesGeneratedDir = path.join(examplesDir, 'generated')
const generatedDir = path.join(docsDir, 'shared/data-grid/sandpack/generated')
const tmpDir = path.join(docsDir, '.sandpack-tmp')
const pnpmDir = path.join(repoDir, 'node_modules/.pnpm')

const manifest = JSON.parse(readFileSync(path.join(examplesDir, 'manifest.json'), 'utf8'))

const packageConfigs = [
	{
		name: '@ez-kit/data-grid-core',
		key: 'data-grid-core',
		dir: 'packages/data-grid/core',
		entry: 'src/index.ts',
	},
	{
		name: '@ez-kit/data-grid-react',
		key: 'data-grid-react',
		dir: 'packages/data-grid/react/react',
		entry: 'src/index.ts',
	},
	{
		name: '@ez-kit/data-grid-heroui',
		key: 'data-grid-heroui',
		dir: 'packages/data-grid/react/heroui',
		entry: 'src/index.ts',
		sandpackCss: 'heroui',
		external: ['use-sync-external-store'],
	},
	{
		name: '@ez-kit/data-grid-shadcn',
		key: 'data-grid-shadcn',
		dir: 'packages/data-grid/react/shadcn',
		entry: 'src/index.ts',
		sandpackCss: 'shadcn',
	},
]

const sharedExampleFiles = new Set([
	'components/_data.ts',
	'components/crud/CrudClientExample.tsx',
	'components/crud/columns.ts',
	'components/crud/use-employee-store.ts',
])

for (const entry of manifest) {
	sharedExampleFiles.add(entry.sourceFile)
}

rmSync(generatedDir, { recursive: true, force: true })
rmSync(examplesGeneratedDir, { recursive: true, force: true })
rmSync(tmpDir, { recursive: true, force: true })
mkdirSync(examplesGeneratedDir, { recursive: true })
mkdirSync(generatedDir, { recursive: true })
mkdirSync(tmpDir, { recursive: true })

const sharedPackageFiles = {}
const herouiPackageFiles = {}
const shadcnPackageFiles = {}

const SHARED_PACKAGE_NAMES = new Set(['@ez-kit/data-grid-core', '@ez-kit/data-grid-react'])

const findPnpmModuleFile = (folderPrefix, moduleRelativePath) => {
	const folder = readdirSync(pnpmDir).find((entry) => entry.startsWith(folderPrefix))

	if (!folder) {
		throw new Error(`Unable to resolve ${folderPrefix} from ${pnpmDir}`)
	}

	return path.join(pnpmDir, folder, 'node_modules', ...moduleRelativePath.split('/'))
}

const toImportPath = (fromDir, targetPath) => {
	const relativePath = path.relative(fromDir, targetPath).split(path.sep).join('/')

	return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

const tailwindNodeModuleUrl = pathToFileURL(
	findPnpmModuleFile('@tailwindcss+node@', '@tailwindcss/node/dist/index.mjs'),
).href
const tailwindOxideModuleUrl = pathToFileURL(
	findPnpmModuleFile('@tailwindcss+oxide@', '@tailwindcss/oxide/index.js'),
).href

const { compile } = await import(tailwindNodeModuleUrl)
const { Scanner } = await import(tailwindOxideModuleUrl)

const validateResolvedCss = (packageName, css) => {
	for (const directive of ['@import', '@source', '@theme', '@apply']) {
		if (css.includes(directive)) {
			throw new Error(`${packageName} Sandpack CSS still contains unresolved ${directive}`)
		}
	}
}

const buildHeroUiSandpackCss = () => {
	const css = readFileSync(
		findPnpmModuleFile('@heroui+styles@', '@heroui/styles/dist/heroui.min.css'),
		'utf8',
	)

	validateResolvedCss('@ez-kit/data-grid-heroui', css)

	if (css.length < 100_000) {
		throw new Error('HeroUI Sandpack CSS is unexpectedly small')
	}

	return css
}

const buildShadcnSandpackCss = async () => {
	const entryPath = path.join(tmpDir, 'shadcn-sandpack.css')
	const shadcnGlobalCssPath = path.join(repoDir, 'packages/data-grid/react/shadcn/src/global.css')
	const shadcnSourceGlob = toImportPath(tmpDir, path.join(repoDir, 'packages/data-grid/react/shadcn/src'))
	const examplesSourceGlob = toImportPath(
		tmpDir,
		path.join(repoDir, 'apps/docs/shared/data-grid/examples/components'),
	)

	const syntheticEntry = [
		"@import 'tailwindcss';",
		"@import 'tw-animate-css';",
		`@import '${toImportPath(tmpDir, shadcnGlobalCssPath)}';`,
		`@source '${shadcnSourceGlob}/**/*.{ts,tsx}';`,
		`@source '${examplesSourceGlob}/**/*.{ts,tsx}';`,
		'',
	].join('\n')

	writeFileSync(entryPath, syntheticEntry)

	const source = readFileSync(entryPath, 'utf8')
	const compiler = await compile(source, { base: tmpDir, onDependency() {} })
	const scanner = new Scanner({ sources: compiler.sources })
	const css = compiler.build(scanner.scan())

	validateResolvedCss('@ez-kit/data-grid-shadcn', css)

	for (const selector of ['.rounded-lg', '.text-muted-foreground', '.hover\\:bg-muted\\/50']) {
		if (!css.includes(selector)) {
			throw new Error(`Shadcn Sandpack CSS is missing expected selector: ${selector}`)
		}
	}

	return css
}

for (const config of packageConfigs) {
	const packageDir = path.join(repoDir, config.dir)

	execFileSync(
		'pnpm',
		[
			'exec',
			'tsup',
			`--entry.${config.key}=${path.join(packageDir, config.entry)}`,
			'--format',
			'esm',
			'--platform',
			'browser',
			'--external',
			'react',
			'--external',
			'react-dom',
			'--external',
			'react/jsx-runtime',
			'--external',
			'@ez-kit/data-grid-core',
			'--external',
			'@ez-kit/data-grid-react',
			...((config.external ?? []).flatMap((external) => ['--external', external])),
			'--out-dir',
			tmpDir,
			'--clean=false',
			'--no-splitting',
			'--silent',
		],
		{ cwd: repoDir, stdio: 'inherit' },
	)

	const builtFile = path.join(tmpDir, `${config.key}.mjs`)
	const targetFiles = SHARED_PACKAGE_NAMES.has(config.name)
		? sharedPackageFiles
		: config.name === '@ez-kit/data-grid-heroui'
			? herouiPackageFiles
			: shadcnPackageFiles

	targetFiles[`/node_modules/${config.name}/index.js`] = readFileSync(builtFile, 'utf8')
	targetFiles[`/node_modules/${config.name}/package.json`] = JSON.stringify(
		{
			name: config.name,
			type: 'module',
			main: './index.js',
			module: './index.js',
			exports: {
				'.': './index.js',
				...(config.sandpackCss ? { './sandpack.css': './sandpack.css' } : {}),
			},
		},
		null,
		2,
	)

	if (config.sandpackCss === 'heroui') {
		herouiPackageFiles[`/node_modules/${config.name}/sandpack.css`] = buildHeroUiSandpackCss()
	}

	if (config.sandpackCss === 'shadcn') {
		shadcnPackageFiles[`/node_modules/${config.name}/sandpack.css`] = await buildShadcnSandpackCss()
	}
}

// React 19 ships useSyncExternalStore natively. Provide ESM shims so the
// heroui bundle (which externalises use-sync-external-store) can resolve it
// inside the Sandpack browser environment without hitting CJS require().
herouiPackageFiles['/node_modules/use-sync-external-store/package.json'] = JSON.stringify(
	{
		name: 'use-sync-external-store',
		version: '1.6.0',
		type: 'module',
		main: './index.js',
		exports: {
			'.': './index.js',
			'./shim': './shim/index.js',
			'./shim/index.js': './shim/index.js',
			'./with-selector': './with-selector/index.js',
			'./with-selector/index.js': './with-selector/index.js',
		},
	},
	null,
	2,
)
herouiPackageFiles['/node_modules/use-sync-external-store/index.js'] =
	"export { useSyncExternalStore } from 'react'\n"
herouiPackageFiles['/node_modules/use-sync-external-store/shim/index.js'] =
	"export { useSyncExternalStore } from 'react'\n"
herouiPackageFiles['/node_modules/use-sync-external-store/with-selector/index.js'] =
	"export { useSyncExternalStore } from 'react'\nexport function useSyncExternalStoreWithSelector(subscribe, getSnapshot, _getServerSnapshot, selector, isEqual) {\n\tconst value = useSyncExternalStore(subscribe, getSnapshot)\n\tconst [selection, setSelection] = [value, (v) => v]\n\treturn selector(value)\n}\n"

for (const [packageName, files] of /** @type {[string, Record<string,string>][]} */ ([
	['@ez-kit/data-grid-heroui', herouiPackageFiles],
	['@ez-kit/data-grid-shadcn', shadcnPackageFiles],
])) {
	const css = files[`/node_modules/${packageName}/sandpack.css`]

	if (typeof css !== 'string' || css.length === 0) {
		throw new Error(`Missing generated Sandpack CSS for ${packageName}`)
	}

	validateResolvedCss(packageName, css)
}

const transformExampleSource = (source) =>
	source
		.replace(/^\s*['"]use client['"];?\s*\n+/u, '')
		.replaceAll("from 'shared/DataGrid'", "from '/src/DataGrid'")
		.replaceAll('from "shared/DataGrid"', 'from "/src/DataGrid"')
		.replaceAll("from '@ez-kit/data-grid-react'", "from '/src/DataGrid'")
		.replaceAll('from "@ez-kit/data-grid-react"', 'from "/src/DataGrid"')

const exampleFiles = {}

for (const relativeFile of [...sharedExampleFiles].sort()) {
	const sourcePath = path.join(examplesDir, relativeFile)
	const sandpackPath = `/src/examples/${relativeFile}`
	const source = transformExampleSource(readFileSync(sourcePath, 'utf8'))

	if (source.includes('shared/DataGrid')) {
		throw new Error(`Unrewritten shared/DataGrid import in ${relativeFile}`)
	}

	exampleFiles[sandpackPath] = source
}

const appFilesByExample = {}

for (const entry of manifest) {
	if (!entry.id || !entry.label || !entry.sourceFile || !entry.exportName) {
		throw new Error(`Invalid manifest entry: ${JSON.stringify(entry)}`)
	}

	const entryPath = `/src/examples/${entry.sourceFile}`
	if (!exampleFiles[entryPath]) {
		throw new Error(`Missing entry source for ${entry.id}: ${entry.sourceFile}`)
	}

	appFilesByExample[entry.id] = `import { ${entry.exportName} } from '${entryPath}'\n\nexport default function App() {\n\treturn <${entry.exportName} />\n}\n`
}

const header = `/* eslint-disable */\n// Generated by apps/docs/scripts/build-sandpack.mjs. Do not edit manually.\n\n`

const primitiveImports = manifest
	.map((entry, index) => {
		const importPath = `../${entry.sourceFile.replace(/\.[^.]+$/u, '')}`

		return `import { ${entry.exportName} as Example${index} } from '${importPath}'`
	})
	.join('\n')

const primitiveRegistryEntries = manifest
	.map((entry, index) => `\t'${entry.id}': Example${index},`)
	.join('\n')

writeFileSync(
	path.join(examplesGeneratedDir, 'data-grid-primitive.tsx'),
	header +
		`${primitiveImports}\n` +
		`import type { ComponentType } from 'react'\n\n` +
		`export const dataGridExamplesManifest = ${JSON.stringify(manifest, null, 2)} as const\n\n` +
		`export type DataGridExampleId = (typeof dataGridExamplesManifest)[number]['id']\n\n` +
		`export const dataGridPrimitiveExamples: Record<DataGridExampleId, ComponentType> = {\n${primitiveRegistryEntries}\n}\n`,
)

writeFileSync(
	path.join(generatedDir, 'data-grid.ts'),
	header +
		`export const dataGridSandpackManifest = ${JSON.stringify(manifest, null, 2)} as const\n\n` +
		`export type DataGridSandpackExampleId = (typeof dataGridSandpackManifest)[number]['id']\n\n` +
		`export const dataGridSandpackExampleFiles: Record<string, string> = ${JSON.stringify(exampleFiles, null, 2)}\n\n` +
		`export const dataGridSandpackAppFiles: Record<DataGridSandpackExampleId, string> = ${JSON.stringify(appFilesByExample, null, 2)}\n\n` +
		`export const dataGridSandpackSharedPackageFiles: Record<string, string> = ${JSON.stringify(sharedPackageFiles, null, 2)}\n`,
)

writeFileSync(
	path.join(generatedDir, 'data-grid-heroui.ts'),
	header +
		`export const dataGridSandpackHeroUIPackageFiles: Record<string, string> = ${JSON.stringify(herouiPackageFiles, null, 2)}\n`,
)

writeFileSync(
	path.join(generatedDir, 'data-grid-shadcn.ts'),
	header +
		`export const dataGridSandpackShadcnPackageFiles: Record<string, string> = ${JSON.stringify(shadcnPackageFiles, null, 2)}\n`,
)
rmSync(tmpDir, { recursive: true, force: true })

console.log(`Generated ${manifest.length} data-grid Sandpack examples.`)
