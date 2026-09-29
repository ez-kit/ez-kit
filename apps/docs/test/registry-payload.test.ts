// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PAYLOAD = resolve(__dirname, '../public/r/data-grid.json')

/**
 * What `npx shadcn add` copies into a consumer's project.
 *
 * The shadcn kit's `src` **is** the registry payload — the generator walks it and emits one item,
 * so a file added there reaches every consumer verbatim. That is fine for a block and wrong for the
 * drag adapter: `src/dnd.tsx` is the one module naming `@dnd-kit/react`, an *optional* peer, and
 * copying it would make that peer a required install for everyone who adds the grid, drag or no
 * drag. `registry.config.mjs` keeps it out through `excludeTopLevel`; this is what says so from the
 * outside.
 *
 * The generator throws on an unaccounted top-level entry, so forgetting the exclusion fails loudly.
 * What it cannot catch is the same file listed in `rootFiles` by mistake, which would include it
 * silently — and that is the case this test exists for.
 */
describe('the shadcn registry payload', () => {
	it('names no drag library', () => {
		if (!existsSync(PAYLOAD)) {
			throw new Error(`${PAYLOAD} is missing — run \`pnpm --filter @ez-kit/docs registry:build\` first.`)
		}

		expect(readFileSync(PAYLOAD, 'utf8')).not.toContain('@dnd-kit')
	})

	it('does not ship the adapter module', () => {
		// `data-grid.json` is the item itself — `files` at the top level. The `items` wrapper lives
		// in `registry.json` beside it, which is the index rather than the payload.
		const payload = JSON.parse(readFileSync(PAYLOAD, 'utf8')) as { files: { path: string }[] }
		const paths = payload.files.map((file) => file.path)

		expect(paths.filter((path) => path.endsWith('dnd.tsx'))).toEqual([])
		// The *block* is payload-safe and must stay: it imports the port from
		// `@ez-kit/data-grid-react`, never the drag library, so a consumer who adds the grid gets a
		// handle that renders nothing until they bind an adapter themselves.
		expect(paths.some((path) => path.endsWith('RowDragHandle.tsx'))).toBe(true)
	})
})
