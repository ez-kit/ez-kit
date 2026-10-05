// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * What the shadcn registry payload ships, asserted rather than trusted to a config line.
 *
 * `apps/docs/public/r/data-grid.json` is what `npx shadcn add` copies **verbatim** into a consumer's
 * project, and its one `dependencies` list is what that command installs. So every entry here is a
 * decision about other people's repositories, and there is no uninstall: a file or a dependency that
 * ships once stays in every project that ran the command until someone removes it by hand. That
 * asymmetry is why this file exists — the generator's own `assertTopLevelCoverage` only checks that a
 * top-level entry is *accounted for*, not which list it landed in, so moving a name from
 * `excludeTopLevel` to `rootFiles` is a one-line edit with no failing check behind it.
 *
 * The drag adapter is the case that made it worth writing. It was excluded for five phases on the
 * grounds that shipping it turns an optional peer into a required install; that trade was then taken
 * the other way deliberately, because the shadcn path is not an npm package and a file that is not
 * copied cannot be imported — so withholding it left that path with no way to switch drag on at all.
 * The pair of assertions below is that decision written where a change to it fails.
 *
 * Note this reads the **built** payload, so it needs `registry:build` to have run — which
 * `apps/docs`' own `build` and `dev` scripts both chain, and which the turbo `test` task's
 * `dependsOn` covers through the same build.
 */

const PAYLOAD = resolve(__dirname, '../public/r/data-grid.json')
const SHADCN_PKG = resolve(__dirname, '../../../packages/data-grid/react/shadcn/package.json')

type RegistryFile = { path: string; type: string; target: string }
type Payload = { files: RegistryFile[]; dependencies: string[] }

function readPayload(): Payload {
	return JSON.parse(readFileSync(PAYLOAD, 'utf8')) as Payload
}

describe('the shadcn registry payload', () => {
	it('ships the drag adapter, as a lib, at the path its docblock tells consumers to import', () => {
		const { files } = readPayload()
		const adapter = files.find((file) => file.path === 'src/dnd.tsx')

		// The `@/components/data-grid/dnd` in the adapter's own docblock is this target, so the two
		// have to move together — a consumer following that import is following this line.
		expect(adapter).toMatchObject({ type: 'registry:lib', target: 'components/data-grid/dnd.tsx' })
	})

	it('declares the drag library at exactly the range the kit declares as its peer', () => {
		const { dependencies } = readPayload()
		const peerRange = (JSON.parse(readFileSync(SHADCN_PKG, 'utf8')) as { peerDependencies: Record<string, string> })
			.peerDependencies['@dnd-kit/react']

		/*
		 * One range, two delivery paths. A registry consumer installs what this list says; an npm
		 * consumer of the heroui kit is checked against its peer range. Letting them drift would mean
		 * one of the two running the adapter against a version it was never measured on — and the
		 * measurements that matter here are on shapes the adapter declares structurally rather than
		 * imports, so a mismatch fails silently rather than at the type level.
		 */
		expect(dependencies).toContain(`@dnd-kit/react@${String(peerRange)}`)
	})

	it('declares the drag library’s dom package too, at that package’s own peer range', () => {
		const { dependencies } = readPayload()
		const peerRange = (JSON.parse(readFileSync(SHADCN_PKG, 'utf8')) as { peerDependencies: Record<string, string> })
			.peerDependencies['@dnd-kit/dom']

		/*
		 * A second name for one library, and the reason is that `@dnd-kit/react` re-exports only the
		 * manager and the two sensors from `@dnd-kit/dom` — no plugin among them — while the adapter
		 * passes a `plugins` array of five. Pinned to the kit's own peer range, like its sibling above,
		 * so a registry consumer and an npm consumer cannot end up on different versions of the package
		 * the adapter's plugin list resolves through.
		 */
		expect(dependencies).toContain(`@dnd-kit/dom@${String(peerRange)}`)
	})

	it('ships no test file and no npm barrel', () => {
		const { files } = readPayload()
		const paths = files.map((file) => file.path)

		// The barrel exists for this repo's own `workspace:*` consumption and means nothing in a
		// consumer's project; a test file would arrive with imports they do not have.
		expect(paths.filter((path) => path.includes('.test.'))).toEqual([])
		expect(paths).not.toContain('src/index.ts')
	})

	it('names every dependency the copied files actually import, and nothing else', () => {
		const { dependencies } = readPayload()

		/*
		 * A list, not a pattern: the point is that adding a dependency is visible in a diff of this
		 * test. Each name here is installed into every consumer's project by one `shadcn add`, so the
		 * list growing is a thing to notice rather than to discover later.
		 */
		// Names without their ranges: a scoped name's own leading `@` is not a separator, so the split
		// is on the *last* one and only when something precedes it.
		const names = dependencies.map((dependency) => {
			const at = dependency.lastIndexOf('@')
			return at > 0 ? dependency.slice(0, at) : dependency
		})

		expect(names.sort()).toMatchInlineSnapshot(`
			[
			  "@dnd-kit/dom",
			  "@dnd-kit/react",
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
