// @vitest-environment node
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { describeCountMismatch, describeHostSlot, hostSlotKey, readHostSlots } from './composition-slots/host-slots'

import type { HostSlot, HostSlotIdentity } from './composition-slots/host-slots'

/**
 * Guards that composing a data grid never requires hand-writing one of its host elements.
 *
 * A `data-slot` literal is the contract between the react package and the kits' stylesheets, and
 * it belongs in the package. Until the header slot components existed, `<div
 * data-slot='header-main'>` was written out at eleven call sites — every layout preset, example
 * and docs snippet that composes a `HeaderCell` — because the render function is all-or-nothing
 * and there was nothing else to return. Renaming that slot would have gone red in two
 * stylesheets and silent in all eleven.
 *
 * So: under the roots where a *consumer* composes a grid, no host element carries a `data-slot`
 * that is not on record below.
 */

const REPO_ROOT = resolve(__dirname, '../../..')

/** Where a grid is composed rather than implemented: docs examples, docs prose, the presets. */
const COMPOSITION_ROOTS = [
	'apps/docs/shared/data-grid',
	'apps/docs/content/docs/data-grid',
	'packages/data-grid/react/react/src/layouts',
].map((path) => resolve(REPO_ROOT, path))

type HostSlotLicence = HostSlotIdentity & {
	/** How many of this exact element that file is expected to contain. */
	readonly count: number
}

/**
 * The hand-written hosts that are correct as they stand.
 *
 * Both are `composition.mdx` teaching a reader to *add* to what a slot rendered — a summary row
 * appended to `<DataGrid.Body>`'s `content`, a drag-handle cell prepended to `<DataGrid.Row>`'s.
 * Those additions belong in the reader's own tree, and they carry the slot for the reader's own
 * sake: the grid's rows and cells are stamped `data-slot='tr'` / `'td'`, and targeting those
 * slots is the documented way an application styles a grid — it is what both kits do. A summary
 * row without the attribute is a stranger in its own `<tbody>`: every app-level rule written
 * against `[data-slot='tr']` skips it, silently, and only for that one row. So the snippets are
 * right and these two licences are legitimate.
 *
 * **A licence is keyed on file, tag and slot — deliberately not on a line.** A line number is a
 * fine thing to *print* and a bad thing to key on: inserting a paragraph anywhere above the
 * snippet would fail this suite on an edit that changed nothing about it, and the message would
 * name a line rather than the edit. The count is what keeps the licence honest instead — adding
 * a second raw `<tr>` to this file fails, and deleting the licensed one fails too, so the
 * exception cannot spread and cannot go stale.
 */
const ALLOWED_HOST_SLOTS: readonly HostSlotLicence[] = [
	{ file: 'apps/docs/content/docs/data-grid/layout/composition.mdx', tag: 'tr', slot: 'tr', count: 1 },
	{ file: 'apps/docs/content/docs/data-grid/layout/composition.mdx', tag: 'td', slot: 'td', count: 1 },
]

const hosts = readHostSlots(COMPOSITION_ROOTS, REPO_ROOT)

function groupByKey(found: readonly HostSlot[]): ReadonlyMap<string, readonly HostSlot[]> {
	const grouped = new Map<string, HostSlot[]>()
	for (const host of found) {
		const key = hostSlotKey(host)
		grouped.set(key, [...(grouped.get(key) ?? []), host])
	}
	return grouped
}

describe('composition never hand-writes a slot', () => {
	/**
	 * One assertion covers all three failures, because they are one question — does the tree hold
	 * exactly the hand-written hosts on record? A new raw element is a key with no licence, a
	 * second copy is a count above its licence, and a deleted one is a count below it. That last
	 * case is also what keeps the scan honest: a regex that silently stopped matching would leave
	 * an empty offender list, and fails here instead.
	 */
	it('holds exactly the hand-written hosts on record', () => {
		const found = groupByKey(hosts)
		const recorded = new Map(ALLOWED_HOST_SLOTS.map((licence) => [hostSlotKey(licence), licence]))
		const identityOf = (key: string): HostSlotIdentity =>
			recorded.get(key) ?? (found.get(key) ?? []).at(0) ?? { file: key, tag: '?', slot: '?' }

		const mismatches = [...new Set([...found.keys(), ...recorded.keys()])].sort().flatMap((key) => {
			const occurrences = found.get(key) ?? []
			const count = recorded.get(key)?.count ?? 0
			if (occurrences.length === count) return []

			return [describeCountMismatch({ identity: identityOf(key), recorded: count, found: occurrences })]
		})

		expect(mismatches).toEqual([])
	})
})

describe('hostSlotKey', () => {
	it('separates the same slot on a different tag, so one licence cannot cover both', () => {
		const onTr = hostSlotKey({ file: 'a.mdx', tag: 'tr', slot: 'tr' })
		const onTd = hostSlotKey({ file: 'a.mdx', tag: 'td', slot: 'tr' })

		expect(onTr).not.toBe(onTd)
	})

	it('carries no line number, so an edit above the element cannot change it', () => {
		expect(hostSlotKey({ file: 'a.mdx', tag: 'tr', slot: 'tr' })).not.toMatch(/:\d/u)
	})
})

describe('describeHostSlot', () => {
	it('names the component to use when the slot has one', () => {
		const message = describeHostSlot({ slot: 'header-main', tag: 'div', file: 'a/b.tsx', at: 'a/b.tsx:12' })

		expect(message).toContain('a/b.tsx:12')
		expect(message).toContain('<DataGrid.HeaderMain>')
	})

	it('says so when the slot has none, rather than inventing a remedy', () => {
		const message = describeHostSlot({ slot: 'tr', tag: 'tr', file: 'a/b.mdx', at: 'a/b.mdx:3' })

		expect(message).toContain('no namespace component renders this slot')
	})
})

describe('describeCountMismatch', () => {
	const identity: HostSlotIdentity = { file: 'a/b.mdx', tag: 'tr', slot: 'tr' }

	it('names both counts and every occurrence, so a second copy is identifiable', () => {
		const message = describeCountMismatch({
			identity,
			recorded: 1,
			found: [
				{ ...identity, at: 'a/b.mdx:12' },
				{ ...identity, at: 'a/b.mdx:40' },
			],
		})

		expect(message).toContain('recorded 1, found 2')
		expect(message).toContain('a/b.mdx:12, a/b.mdx:40')
	})

	it('says where a stale licence points, rather than printing an empty list', () => {
		const message = describeCountMismatch({ identity, recorded: 1, found: [] })

		expect(message).toContain('recorded 1, found 0 at nowhere')
	})
})
