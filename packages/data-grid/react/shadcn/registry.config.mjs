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
/*
 * The drag library's range is read from **this kit's own `peerDependencies`**, never written out
 * here, so the range a registry consumer installs and the range an npm consumer is checked against
 * can never disagree. That range is deliberately narrow — `^0.1.21` on a `0.x` version resolves to
 * `>=0.1.21 <0.2.0` — because `src/dnd.tsx` reads shapes of the library that are declared
 * structurally rather than imported (`source.sortable.initialIndex`, `setDropTarget`'s
 * `defaultPrevented`), each measured against 0.1.21. A minor release before 1.0 is free to rename
 * them, and the failure would be silent; a narrow peer range turns it into a message at install.
 */
const dndPeerRange = JSON.parse(readFileSync(`${pkgDir}/package.json`, 'utf8')).peerDependencies['@dnd-kit/react']

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
		/*
		 * The drag library, installed by **every** consumer of this block — including the ones who
		 * never drag anything. That is a deliberate trade and the reason is the registry format: a
		 * `registry-item` carries one `dependencies` list and `shadcn add` installs it, so there is no
		 * "optional" here the way `peerDependenciesMeta` gives the npm path. The two alternatives were
		 * worse. Shipping `dnd.tsx` without the library breaks the consumer's typecheck on install,
		 * for everyone. Withholding both leaves the shadcn path with no way to switch drag on at all,
		 * which is where it stood before this.
		 *
		 * What it costs, measured rather than guessed: six packages and ~1.7 MB unpacked in
		 * `node_modules`, plus one line in the consumer's `package.json`. It costs **no bundle
		 * bytes** — `dnd.tsx` is reachable only from a `createDataGrid({ dnd: adapter })` a consumer
		 * writes, so an unused module is tree-shaken like any other.
		 *
		 * The npm path is untouched and still pays nothing: `@dnd-kit/react` remains an *optional*
		 * peer of this kit and of the heroui one, and `apps/docs/test/tree-shaking.test.ts` still
		 * asserts it is unreachable from a kit root's bundle. This is a statement about the registry
		 * payload only.
		 *
		 * The follow-up that removes the trade is a second registry item — a `data-grid-dnd` block
		 * with its own files and its own dependencies, which the format allows and
		 * `scripts/generate-shadcn-registry-manifest.mjs` does not yet emit. Note it will not undo
		 * this for anyone who has already installed: `shadcn add` copies verbatim and there is no
		 * uninstall, so a consumer keeps the file and the dependency until they remove them by hand.
		 */
		`@dnd-kit/react@${dndPeerRange}`,
	],
	srcDir: 'src',
	typeByTopDir: {
		blocks: 'registry:component',
		hooks: 'registry:hook',
		lib: 'registry:lib',
		// Shipped as our own files, not `registryDependencies`: several of these carry this kit's
		// own modifications rather than being unmodified upstream shadcn primitives — `table.tsx`
		// most of all, which bakes in the grid-layout support the rest of the kit assumes. A
		// consumer resolving those from the official registry would get stock behaviour and lose
		// it silently, so there is no matching item to reference.
		components: 'registry:ui',
	},
	fileTypeOverrides: {
		'blocks/cell-types.ts': 'registry:lib',
		'blocks/icons.tsx': 'registry:lib',
		// A module exporting one adapter object, not a component — the same reason the two above are
		// `registry:lib` rather than taking `blocks`' default.
		'dnd.tsx': 'registry:lib',
		'styles.css': 'registry:file',
	},
	registryDependencies: [],
	targetPrefix: 'components/data-grid',
	rootFiles: ['data-grid.tsx', 'dnd.tsx', 'styles.css'],
	// The npm barrel (and its test) — only relevant to this repo's own internal `workspace:*`
	// consumption (apps/docs), not to registry consumers copying source into their own project.
	/*
	 * `index.ts` is the npm barrel, relevant only to this repo's own `workspace:*` consumption
	 * (`apps/docs`) and not to a consumer copying source into their project. The two `.test` entries
	 * are filtered out of the payload by the generator anyway; they are named here because
	 * `assertTopLevelCoverage` reads the directory raw and fails on any top-level entry it cannot
	 * account for — which is what stops a new file from being dropped silently.
	 *
	 * `dnd.tsx` **used to be listed here** and is now in `rootFiles`. It was excluded so that an
	 * optional peer stayed optional; the cost was that the shadcn path had no way to switch drag on
	 * at all, since this package is not published to npm and a file that is not copied cannot be
	 * imported. The trade was taken the other way deliberately — see the `@dnd-kit/react` entry in
	 * `dependencies` for what it costs and what it does not.
	 */
	excludeTopLevel: ['index.ts', 'index.test.ts', 'dnd.test.tsx'],
})

console.log(`Wrote ${outPath}`)
