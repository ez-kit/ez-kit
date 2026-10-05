// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * What the shadcn registry payload ships, asserted rather than trusted to a config line.
 *
 * `apps/docs/public/r/<item>.json` is what `npx shadcn add` copies **verbatim** into a consumer's
 * project, and an item's one `dependencies` list is what that command installs. So every entry here
 * is a decision about other people's repositories, and there is no uninstall: a file or a dependency
 * that ships once stays in every project that ran the command until someone removes it by hand. That
 * asymmetry is why this file exists — the generator's own `assertTopLevelCoverage` only checks that a
 * top-level entry is *accounted for*, not which list it landed in, so moving a name between
 * `excludeTopLevel` and an item's `rootFiles` is a one-line edit with no failing check behind it.
 *
 * The kit publishes **two** items. `data-grid` is the grid; `data-grid-dnd` carries the drag adapter
 * and the only two dependencies that exist for one file. The adapter was excluded from the payload
 * for five phases on the grounds that shipping it turns an optional peer into a required install;
 * that trade was then taken the other way, because the shadcn path is not an npm package and a file
 * that is not copied cannot be imported — and the split is what finally makes it cost nothing:
 * `data-grid` mentions `@dnd-kit` nowhere, which is the assertion this phase's success criterion
 * names and which the cases below hold.
 *
 * Note this reads the **built** payloads, so it needs `registry:build` to have run — which
 * `apps/docs`' own `build` and `dev` scripts both chain, and which the turbo `test` task's
 * `dependsOn` covers through the same build.
 */

const OUTPUT_DIR = resolve(__dirname, '../public/r')
const INDEX = `${OUTPUT_DIR}/registry.json`
const SHADCN_PKG = resolve(__dirname, '../../../packages/data-grid/react/shadcn/package.json')

const GRID_ITEM = 'data-grid'
const DND_ITEM = 'data-grid-dnd'

type RegistryFile = { path: string; type: string; target: string; content?: string }
type Payload = {
	name: string
	files: RegistryFile[]
	dependencies: string[]
	registryDependencies: string[]
}
type IndexEntry = { name: string; type: string; title: string; description: string }
type Index = { name: string; homepage: string; items: IndexEntry[] }

function readIndex(): Index {
	return JSON.parse(readFileSync(INDEX, 'utf8')) as Index
}

function readPayload(itemName: string): Payload {
	return JSON.parse(readFileSync(`${OUTPUT_DIR}/${itemName}.json`, 'utf8')) as Payload
}

/** Every payload the build actually emitted, discovered through the index it wrote. */
function readAllPayloads(): Payload[] {
	return readIndex().items.map((item) => readPayload(item.name))
}

function peerRange(name: string): string {
	const pkg = JSON.parse(readFileSync(SHADCN_PKG, 'utf8')) as { peerDependencies: Record<string, string> }
	return pkg.peerDependencies[name] ?? ''
}

/** Names without their ranges: a scoped name's own leading `@` is not a separator, so the split is
 * on the *last* one and only when something precedes it. */
function dependencyNames(dependencies: string[]): string[] {
	return dependencies.map((dependency) => {
		const at = dependency.lastIndexOf('@')
		return at > 0 ? dependency.slice(0, at) : dependency
	})
}

describe('the shadcn registry index', () => {
	it('lists every item the kit publishes', () => {
		/*
		 * The index is rebuilt from the items the build actually emitted rather than from a name
		 * written beside the package — which is what it used to be, and which listed exactly one item
		 * however many the manifest declared. An item missing from here is invisible to anything
		 * browsing the registry, while still being installable by URL, so the inconsistency would not
		 * announce itself.
		 */
		expect(readIndex().items.map((item) => item.name)).toEqual([GRID_ITEM, DND_ITEM])
	})
})

describe('every emitted shadcn registry payload', () => {
	it('carries no package-internal import alias', () => {
		/*
		 * `@grid-shadcn/` is this package's own alias for its own dev and build, and it resolves to
		 * nothing in a consumer's project — `apps/docs/scripts/build-registry.mjs` rewrites it to the
		 * portable `@/` prefix shadcn's CLI remaps onto the consumer's own aliases.
		 *
		 * This asserts it over **every** emitted payload, which is the guard rather than the fix. That
		 * rewrite ran on one hardcoded output path per package, correct only while a package published
		 * exactly one item; with two it would have left the second carrying the alias, and silently —
		 * the build succeeds, and nothing in this repo compiles a payload. As it happens `dnd.tsx`
		 * imports no aliased module, so the defect was latent rather than live on the day of the split.
		 * That is luck about one file's imports, not a property of the build, and it is exactly why the
		 * assertion is written over the whole set instead of over the item that prompted it.
		 */
		for (const payload of readAllPayloads()) {
			const offenders = payload.files.filter((file) => (file.content ?? '').includes('@grid-shadcn/'))
			expect(offenders.map((file) => `${payload.name}: ${file.path}`)).toEqual([])
		}
	})

	it('ships no test file and no npm barrel', () => {
		// The barrel exists for this repo's own `workspace:*` consumption and means nothing in a
		// consumer's project; a test file would arrive with imports they do not have.
		for (const payload of readAllPayloads()) {
			const paths = payload.files.map((file) => file.path)
			expect(paths.filter((path) => path.includes('.test.'))).toEqual([])
			expect(paths).not.toContain('src/index.ts')
		}
	})
})

describe('the data-grid registry payload', () => {
	it('mentions the drag library nowhere at all', () => {
		/*
		 * The point of splitting the drag adapter into its own item, and the one assertion that says
		 * so. A consumer who installs the grid and never drags anything installs no drag library:
		 * not through `dependencies`, and not by receiving a file that imports it and then fails to
		 * typecheck. Both halves are checked, because either one alone would pass while the other
		 * reintroduced the cost — a file naming `@dnd-kit` with no dependency behind it is worse than
		 * the arrangement this replaced, not better.
		 *
		 * This helps future installs only. `shadcn add` has no uninstall, so anyone who ran the
		 * command before the split keeps both packages until they remove them by hand.
		 */
		const { dependencies, files } = readPayload(GRID_ITEM)

		expect(dependencies.filter((dependency) => dependency.includes('@dnd-kit'))).toEqual([])
		const offenders = files.filter((file) => (file.content ?? '').includes('@dnd-kit'))
		expect(offenders.map((file) => file.path)).toEqual([])
	})

	it('names every dependency the copied files actually import, and nothing else', () => {
		const { dependencies } = readPayload(GRID_ITEM)

		/*
		 * A list, not a pattern: the point is that adding a dependency is visible in a diff of this
		 * test. Each name here is installed into every consumer's project by one `shadcn add`, so the
		 * list growing is a thing to notice rather than to discover later. It shrank by two when the
		 * drag adapter moved to its own item; those two are asserted on that item below.
		 */
		expect(dependencyNames(dependencies).sort()).toMatchInlineSnapshot(`
			[
			  "@ez-kit/data-grid-core",
			  "@ez-kit/data-grid-react",
			  "class-variance-authority",
			  "clsx",
			  "date-fns",
			  "lucide-react",
			  "radix-ui",
			  "react-day-picker",
			  "tailwind-merge",
			]
		`)
	})
})

describe('the data-grid-dnd registry payload', () => {
	it('ships the drag adapter, as a lib, at the path its docblock tells consumers to import', () => {
		const { files } = readPayload(DND_ITEM)
		const adapter = files.find((file) => file.path === 'src/dnd.tsx')

		// The `@/components/data-grid/dnd` in the adapter's own docblock is this target, so the two
		// have to move together — a consumer following that import is following this line. The target
		// is unchanged by the split: the file lands where it always did, from a different item.
		expect(adapter).toMatchObject({ type: 'registry:lib', target: 'components/data-grid/dnd.tsx' })
	})

	it('ships the drag adapter and nothing else', () => {
		/*
		 * One file is the whole item. Anything else arriving here would be a file the grid item lost
		 * without anyone noticing — the generator's coverage check now refuses a file claimed by both
		 * items, but a file silently *moved* from one to the other passes it.
		 */
		expect(readPayload(DND_ITEM).files.map((file) => file.path)).toEqual(['src/dnd.tsx'])
	})

	it('declares the drag library at exactly the range the kit declares as its peer', () => {
		const { dependencies } = readPayload(DND_ITEM)

		/*
		 * One range, two delivery paths. A registry consumer installs what this list says; an npm
		 * consumer of the heroui kit is checked against its peer range. Letting them drift would mean
		 * one of the two running the adapter against a version it was never measured on — and the
		 * measurements that matter here are on shapes the adapter declares structurally rather than
		 * imports, so a mismatch fails silently rather than at the type level.
		 */
		expect(dependencies).toContain(`@dnd-kit/react@${peerRange('@dnd-kit/react')}`)
	})

	it('declares the drag library’s dom package too, at that package’s own peer range', () => {
		const { dependencies } = readPayload(DND_ITEM)

		/*
		 * A second name for one library, and the reason is that `@dnd-kit/react` re-exports only the
		 * manager and the two sensors from `@dnd-kit/dom` — no plugin among them — while the adapter
		 * passes a `plugins` array of five. Pinned to the kit's own peer range, like its sibling above,
		 * so a registry consumer and an npm consumer cannot end up on different versions of the package
		 * the adapter's plugin list resolves through.
		 */
		expect(dependencies).toContain(`@dnd-kit/dom@${peerRange('@dnd-kit/dom')}`)
	})

	it('names only the drag library, and installs the grid item by URL', () => {
		const { dependencies, registryDependencies } = readPayload(DND_ITEM)

		// `@ez-kit/data-grid-react` is imported by the adapter and deliberately absent: the grid item
		// installed alongside it declares that name into the same consumer `package.json`, so it is a
		// direct dependency of their project rather than the transitive one pnpm cannot resolve.
		expect(dependencyNames(dependencies).sort()).toEqual(['@dnd-kit/dom', '@dnd-kit/react'])

		/*
		 * One command still installs everything: `registryDependencies` resolves a URL, so pointing at
		 * the grid item's own URL brings both items and both dependency lists into the consumer's
		 * project. A bare name would resolve against the official shadcn registry instead of ours.
		 *
		 * Checked as origin plus path rather than as a literal string. The origin is whatever this
		 * build was given — `site.config.json` locally and in CI, the deployment's own domain on
		 * Vercel — which is the same value the index's `homepage` carries, so comparing them catches an
		 * origin written out by hand in the config without pinning the test to one environment. The
		 * path pins the thing that can actually drift: which item is named.
		 */
		expect(registryDependencies).toEqual([`${readIndex().homepage}/r/${GRID_ITEM}.json`])
		expect(new URL(registryDependencies[0] ?? '').pathname).toBe(`/r/${GRID_ITEM}.json`)
	})
})
