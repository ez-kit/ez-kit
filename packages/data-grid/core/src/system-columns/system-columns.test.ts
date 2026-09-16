import { describe, expect, it } from 'vitest'

import { RowActionsPlacement } from '../features/row-actions'

import {
	buildColumnList,
	extractPinningState,
	ACTIONS_COLUMN_ID,
	EXPAND_COLUMN_ID,
	SELECTION_COLUMN_ID,
} from './system-columns'

import type { MappedColumnDef } from '../column/types'

type Row = {
	id: number
	name: string
}

const USER_COL: MappedColumnDef<Row> = { id: 'name', header: 'Name', meta: {} }

describe('buildColumnList', () => {
	it('returns only user columns when no system columns needed', () => {
		const cols = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: false,
			pinning: false,
			ordering: false,
			creating: false,
			customRowActions: false,
		})
		expect(cols).toHaveLength(1)
		expect(cols[0]?.id).toBe('name')
	})

	it('prepends __selection__ when selection is true', () => {
		const cols = buildColumnList([USER_COL], {
			selection: true,
			expanding: false,
			editing: false,
			deleting: false,
			pinning: false,
			ordering: false,
			creating: false,
			customRowActions: false,
		})
		expect(cols[0]?.id).toBe(SELECTION_COLUMN_ID)
		expect(cols[1]?.id).toBe('name')
	})

	it('prepends __expand__ after __selection__', () => {
		const cols = buildColumnList([USER_COL], {
			selection: true,
			expanding: true,
			editing: false,
			deleting: false,
			pinning: false,
			ordering: false,
			creating: false,
			customRowActions: false,
		})
		expect(cols[0]?.id).toBe(SELECTION_COLUMN_ID)
		expect(cols[1]?.id).toBe(EXPAND_COLUMN_ID)
		expect(cols[2]?.id).toBe('name')
	})

	it('appends __actions__ when editing or deleting', () => {
		const cols = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: true,
			deleting: false,
			pinning: false,
			ordering: false,
			creating: false,
			customRowActions: false,
		})
		expect(cols[cols.length - 1]?.id).toBe(ACTIONS_COLUMN_ID)
	})

	it('actions column has pinning: { side: "end" } in meta', () => {
		const cols = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: true,
			pinning: false,
			ordering: false,
			creating: false,
			customRowActions: false,
		})
		const actions = cols.find((c) => c.id === ACTIONS_COLUMN_ID)
		expect(actions?.meta?.pinning).toEqual({ side: 'end' })
	})

	it('appends __actions__ when only row pinning is enabled', () => {
		const cols = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: false,
			pinning: true,
			ordering: false,
			creating: false,
			customRowActions: false,
		})
		expect(cols[cols.length - 1]?.id).toBe(ACTIONS_COLUMN_ID)
	})

	it('actions column width grows with the number of inline actions', () => {
		const sizeOf = (opts: { editing: boolean; deleting: boolean; pinning: boolean }) =>
			buildColumnList([USER_COL], {
				selection: false,
				expanding: false,
				ordering: false,
				creating: false,
				customRowActions: false,
				...opts,
			}).find((c) => c.id === ACTIONS_COLUMN_ID)?.size

		const onePin = sizeOf({ editing: false, deleting: false, pinning: true })
		const editDelete = sizeOf({ editing: true, deleting: true, pinning: false })
		const all = sizeOf({ editing: true, deleting: true, pinning: true })

		expect(onePin).toBeLessThan(editDelete ?? 0)
		expect(editDelete).toBeLessThan(all ?? 0)
		// Never TanStack's 150px default, which is far too wide for icon buttons.
		expect(all).toBeLessThan(150)
	})

	it('menu placement collapses the actions column to a single trigger', () => {
		const inline = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: true,
			pinning: true,
			ordering: false,
			creating: false,
			customRowActions: false,
			rowActionsPlacement: RowActionsPlacement.Inline,
		}).find((c) => c.id === ACTIONS_COLUMN_ID)?.size
		const menu = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: true,
			pinning: true,
			ordering: false,
			creating: false,
			customRowActions: false,
			rowActionsPlacement: RowActionsPlacement.Menu,
		}).find((c) => c.id === ACTIONS_COLUMN_ID)?.size

		expect(menu).toBeLessThan(inline ?? 0)
	})

	it('injects the actions column for a grid whose only action is a custom one', () => {
		const cols = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: false,
			pinning: false,
			ordering: false,
			creating: false,
			customRowActions: true,
		})

		expect(cols.map((c) => c.id)).toEqual(['name', ACTIONS_COLUMN_ID])
	})

	it('reserves the overflow trigger width for custom actions', () => {
		const base = {
			selection: false,
			expanding: false,
			editing: false,
			deleting: true,
			pinning: false,
			ordering: false,
			creating: false,
			customRowActions: false,
		}
		const sizeOf = (customRowActions: boolean) =>
			buildColumnList([USER_COL], { ...base, customRowActions }).find((c) => c.id === ACTIONS_COLUMN_ID)?.size

		// Delete button alone vs. delete button + the menu trigger the custom entries live behind.
		expect(sizeOf(true)).toBeGreaterThan(sizeOf(false) ?? 0)
	})

	it('full order: [selection, expand, user..., actions]', () => {
		const cols = buildColumnList([USER_COL], {
			selection: true,
			expanding: true,
			editing: true,
			deleting: true,
			pinning: false,
			ordering: false,
			creating: false,
			customRowActions: false,
		})
		const ids = cols.map((c) => c.id)
		expect(ids).toEqual([SELECTION_COLUMN_ID, EXPAND_COLUMN_ID, 'name', ACTIONS_COLUMN_ID])
	})
})

describe('extractPinningState', () => {
	it('extracts columns with static pin position', () => {
		const cols: MappedColumnDef<Row>[] = [
			{ id: 'a', meta: { pinning: { side: 'start' } } },
			{ id: 'b', meta: { pinning: { side: 'end' } } },
			{ id: 'c', meta: {} },
		]
		const { start, end } = extractPinningState(cols)
		expect(start).toContain('a')
		expect(end).toContain('b')
		expect(start).not.toContain('c')
	})

	it('extracts columns with initialSide position', () => {
		const cols: MappedColumnDef<Row>[] = [
			{ id: 'd', meta: { pinning: { initialSide: 'start' } } },
			{ id: 'e', meta: { pinning: { initialSide: 'end' } } },
		]
		const { start, end } = extractPinningState(cols)
		expect(start).toContain('d')
		expect(end).toContain('e')
	})

	it('skips columns with meta.pinning: false', () => {
		const cols: MappedColumnDef<Row>[] = [{ id: 'f', meta: { pinning: false } }]
		const { start, end } = extractPinningState(cols)
		expect(start).not.toContain('f')
		expect(end).not.toContain('f')
	})
})
