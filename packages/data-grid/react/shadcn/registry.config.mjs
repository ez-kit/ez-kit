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
const dndPeers = JSON.parse(readFileSync(`${pkgDir}/package.json`, 'utf8')).peerDependencies
const dndPeerRange = dndPeers['@dnd-kit/react']
/*
 * The second half of the same install, and necessary rather than sloppy: the five plugins
 * `src/dnd.tsx` passes as `plugins` live only on `@dnd-kit/dom`'s own root, because `@dnd-kit/react`
 * re-exports exactly three names from it — `DragDropManager`, `KeyboardSensor`, `PointerSensor` — and
 * no plugin among them. It is already in every tree as `@dnd-kit/react`'s own dependency, so naming
 * it downloads nothing new; what makes the declaration unavoidable is pnpm's isolated layout, under
 * which a transitive dependency is simply unresolvable from a package that has not declared it.
 * Read from the same `peerDependencies` for the same reason as the range above.
 */
const dndDomPeerRange = dndPeers['@dnd-kit/dom']

// The grid item's name, which is also the `<name>.json` `shadcn build` emits and therefore the URL
// a consumer installs from. Held in a const because the drag item below names that URL in its
// `registryDependencies`, and the two must not drift.
const GRID_ITEM_NAME = 'data-grid'

const outPath = generateRegistryManifest({
	pkgDir,
	registryName: 'ez-kit',
	homepage,
	srcDir: 'src',
	/*
	 * Two items, and the split is drag-shaped because the dependency is. `src/dnd.tsx` is the only
	 * copied file that brings a library of its own, and it is reachable only from a
	 * `createDataGrid({ dnd: adapter })` a consumer writes — so while it rode along in the grid item,
	 * every consumer installed `@dnd-kit` and most never dragged anything. Split out, the grid item
	 * mentions `@dnd-kit` nowhere, and `apps/docs/test/registry-payload.test.ts` asserts exactly
	 * that — in its `dependencies` and inside every file's content.
	 *
	 * This helps **future** installs only. `shadcn add` copies verbatim and has no uninstall, so
	 * anyone who already ran the old command keeps the file and the two packages until they remove
	 * them by hand.
	 *
	 * Nothing couples the two items in the source: `dnd.tsx` imports no `@grid-shadcn/*` file, and
	 * no file in the grid item imports `dnd.tsx`. The dependency between them below is a convenience
	 * we choose so that one command still installs everything, not one the imports force.
	 */
	items: [
		{
			name: GRID_ITEM_NAME,
			type: 'registry:block',
			title: 'Data Grid',
			description: '@ez-kit/data-grid shadcn UI blocks: cells, toolbar, filtering, pagination, editing and more.',
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
				'styles.css': 'registry:file',
			},
			registryDependencies: [],
			targetPrefix: 'components/data-grid',
			rootFiles: ['data-grid.tsx', 'styles.css'],
		},
		{
			name: 'data-grid-dnd',
			type: 'registry:block',
			title: 'Data Grid drag and drop',
			description:
				'The @dnd-kit adapter for @ez-kit/data-grid: pass it to createDataGrid({ dnd }) to drag rows and columns. Installs the data grid alongside it.',
			/*
			 * The drag library, and the whole reason this item exists: a `registry-item` carries one
			 * `dependencies` list and `shadcn add` installs all of it, so there is no "optional" here
			 * the way `peerDependenciesMeta` gives the npm path — the only way to make it optional is a
			 * separate item a consumer chooses. What it costs the consumer who does choose it, measured
			 * rather than guessed: six packages and ~1.7 MB unpacked in `node_modules`, plus one line in
			 * their `package.json`. It costs **no bundle bytes** — `dnd.tsx` is reachable only from a
			 * `createDataGrid({ dnd: adapter })` they write, so an unused module is tree-shaken like any
			 * other.
			 *
			 * The npm path is untouched and still pays nothing: `@dnd-kit/react` remains an *optional*
			 * peer of this kit and of the heroui one, and `apps/docs/test/tree-shaking.test.ts` still
			 * asserts it is unreachable from a kit root's bundle. This is a statement about the registry
			 * payload only.
			 *
			 * `@ez-kit/data-grid-react` is imported by `dnd.tsx` too and is deliberately **not** repeated
			 * here: the grid item that `registryDependencies` installs alongside this one declares it
			 * into the same consumer `package.json`, so it is a direct dependency of their project
			 * rather than a transitive one — which is the thing pnpm's isolated layout cannot resolve.
			 */
			dependencies: [`@dnd-kit/react@${dndPeerRange}`, `@dnd-kit/dom@${dndDomPeerRange}`],
			typeByTopDir: {},
			// A module exporting one adapter object, not a component — the same reason
			// `blocks/cell-types.ts` and `blocks/icons.tsx` are `registry:lib` in the item above.
			fileTypeOverrides: { 'dnd.tsx': 'registry:lib' },
			/*
			 * The grid item's own URL, so one `npx shadcn add` installs both items and both dependency
			 * lists land in the consumer's `package.json` — confirmed by running the repo's own `shadcn`
			 * against a two-item build served over localhost. A URL rather than a bare name, because a
			 * bare name resolves against the official shadcn registry rather than ours. The origin comes
			 * from `site.config.json` (or the Vercel deployment) by the same rule as `homepage` above: an
			 * origin written out by hand is what `scripts/check-site-url.mjs` exists to catch.
			 */
			registryDependencies: [`${homepage}/r/${GRID_ITEM_NAME}.json`],
			targetPrefix: 'components/data-grid',
			rootFiles: ['dnd.tsx'],
		},
	],
	/*
	 * `index.ts` is the npm barrel, relevant only to this repo's own `workspace:*` consumption
	 * (`apps/docs`) and not to a consumer copying source into their project. The two `.test` entries
	 * are filtered out of the payload by the generator anyway; they are named here because
	 * `assertTopLevelCoverage` reads the directory raw and fails on any top-level entry it cannot
	 * account for — which is what stops a new file from being dropped silently.
	 *
	 * `dnd.tsx` **used to be listed here** and now belongs to the `data-grid-dnd` item above. It was
	 * excluded so that an optional peer stayed optional; the cost was that the shadcn path had no way
	 * to switch drag on at all, since this package is not published to npm and a file that is not
	 * copied cannot be imported. Its own item is what resolves that both ways.
	 */
	excludeTopLevel: ['index.ts', 'index.test.ts', 'dnd.test.tsx'],
})

console.log(`Wrote ${outPath}`)
