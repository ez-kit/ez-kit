#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { generateRegistryManifest } from '../../../../scripts/generate-shadcn-registry-manifest.mjs'

const pkgDir = fileURLToPath(new URL('.', import.meta.url))
// On Vercel the origin comes from the deployment itself, so a domain attached in the dashboard
// needs no code change here; `site.config.json` is the answer everywhere else (local builds, CI)
// and the value `scripts/check-site-url.mjs` holds the docs' install command to.
const siteConfigPath = fileURLToPath(new URL('../../../../site.config.json', import.meta.url))
const homepage = process.env.VERCEL_PROJECT_PRODUCTION_URL
	? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
	: JSON.parse(readFileSync(siteConfigPath, 'utf8')).siteUrl
const reactPkgDir = fileURLToPath(new URL('../react', import.meta.url))
const reactPkgVersion = JSON.parse(readFileSync(`${reactPkgDir}/package.json`, 'utf8')).version
const corePkgDir = fileURLToPath(new URL('../../core', import.meta.url))
const corePkgVersion = JSON.parse(readFileSync(`${corePkgDir}/package.json`, 'utf8')).version

const outPath = generateRegistryManifest({
	pkgDir,
	name: 'data-grid',
	type: 'registry:block',
	title: 'Data Grid',
	description: '@ez-kit/data-grid shadcn UI blocks: cells, toolbar, filtering, pagination, editing and more.',
	registryName: 'ez-kit',
	homepage,
	// Only packages the copied files import directly (verify with:
	// grep -rho "from '[a-z][a-z0-9@/-]*'" src/{blocks,hooks,lib} src/data-grid.tsx | sort -u).
	// @ez-kit/data-grid-core is imported by a copied file: `data-grid.tsx` names
	// `allDataGridFeatures` from @ez-kit/data-grid-core/features/all, so the grid registers every
	// feature the moment it lands and the consumer writes no `features` to render one. Narrowing
	// that set — replacing the import with their own `tableFeatures({ … })` — is an edit to a file
	// they now own, and the helpers for it live on core too. It was listed here even before that
	// import existed, because relying on it being transitive through @ez-kit/data-grid-react was
	// only ever true for hoisting package managers and false under pnpm's strict layout.
	// @tanstack/react-table isn't imported at all (data-grid-react
	// depends on @tanstack/table-core + @tanstack/react-virtual instead), so it's correctly absent too.
	//
	// @ez-kit/data-grid-react is pinned to this repo's *current* published version, not a bare
	// name: a bare name resolves to npm `latest`, which lags behind whatever this registry item's
	// blocks were built against on unreleased HEAD (verified: installing unpinned pulled published
	// 0.1.1 against blocks written for a newer, unpublished API surface — 61 tsc errors). Pinning
	// doesn't fully solve drift between releases, only stops it from being silently unpinned.
	dependencies: [
		`@ez-kit/data-grid-react@^${reactPkgVersion}`,
		`@ez-kit/data-grid-core@^${corePkgVersion}`,
		'date-fns',
		'react-day-picker',
		'clsx',
		'tailwind-merge',
		'lucide-react',
		'radix-ui',
		'class-variance-authority',
	],
	srcDir: 'src',
	typeByTopDir: {
		blocks: 'registry:component',
		hooks: 'registry:hook',
		lib: 'registry:lib',
		// Shipped as our own files, not `registryDependencies`: several of these are hand-written
		// (e.g. action-bar.tsx) rather than unmodified upstream shadcn primitives, so there is no
		// matching item in the official registry to reference.
		components: 'registry:ui',
	},
	fileTypeOverrides: {
		'blocks/cell-types.ts': 'registry:lib',
		'blocks/icons.tsx': 'registry:lib',
		'styles.css': 'registry:file',
	},
	registryDependencies: [],
	targetPrefix: 'components/data-grid',
	rootFiles: ['data-grid.tsx', 'styles.css'],
	// The npm barrel (and its test) — only relevant to this repo's own internal `workspace:*`
	// consumption (apps/docs), not to registry consumers copying source into their own project.
	excludeTopLevel: ['index.ts', 'index.test.ts'],
})

console.log(`Wrote ${outPath}`)
