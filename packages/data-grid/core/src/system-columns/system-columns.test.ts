import { describe, expect, it } from 'vitest'

import { RowActionsVariant } from '../features/row-actions'

import {
	buildColumnList,
	extractPinningState,
	ACTIONS_COLUMN_ID,
	EXPAND_COLUMN_ID,
	SELECTION_COLUMN_ID,
} from './system-columns'

import type { TanStackColumnDef } from '../column/types'

type Row = {
	id: number
	name: string
}

const USER_COL: TanStackColumnDef<Row> = { id: 'name', header: 'Name', meta: {} }

describe('buildColumnList', () => {
	it('returns only user columns when no system columns needed', () => {
		const cols = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: false,
			pinning: false,
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
		})
		expect(cols[cols.length - 1]?.id).toBe(ACTIONS_COLUMN_ID)
	})

	it('actions column has columnPinning: { side: "right" } in meta', () => {
		const cols = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: true,
			pinning: false,
		})
		const actions = cols.find((c) => c.id === ACTIONS_COLUMN_ID)
		expect(actions?.meta?.columnPinning).toEqual({ side: 'right' })
	})

	it('appends __actions__ when only row pinning is enabled', () => {
		const cols = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: false,
			pinning: true,
		})
		expect(cols[cols.length - 1]?.id).toBe(ACTIONS_COLUMN_ID)
	})

	it('actions column width grows with the number of inline actions', () => {
		const sizeOf = (opts: { editing: boolean; deleting: boolean; pinning: boolean }) =>
			buildColumnList([USER_COL], { selection: false, expanding: false, ...opts }).find(
				(c) => c.id === ACTIONS_COLUMN_ID,
			)?.size

		const onePin = sizeOf({ editing: false, deleting: false, pinning: true })
		const editDelete = sizeOf({ editing: true, deleting: true, pinning: false })
		const all = sizeOf({ editing: true, deleting: true, pinning: true })

		expect(onePin).toBeLessThan(editDelete ?? 0)
		expect(editDelete).toBeLessThan(all ?? 0)
		// Never TanStack's 150px default, which is far too wide for icon buttons.
		expect(all).toBeLessThan(150)
	})

	it('menu variant collapses the actions column to a single trigger', () => {
		const inline = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: true,
			pinning: true,
			rowActionsVariant: RowActionsVariant.Inline,
		}).find((c) => c.id === ACTIONS_COLUMN_ID)?.size
		const menu = buildColumnList([USER_COL], {
			selection: false,
			expanding: false,
			editing: false,
			deleting: true,
			pinning: true,
			rowActionsVariant: RowActionsVariant.Menu,
		}).find((c) => c.id === ACTIONS_COLUMN_ID)?.size

		expect(menu).toBeLessThan(inline ?? 0)
	})

	it('full order: [selection, expand, user..., actions]', () => {
		const cols = buildColumnList([USER_COL], {
			selection: true,
			expanding: true,
			editing: true,
			deleting: true,
			pinning: false,
		})
		const ids = cols.map((c) => c.id)
		expect(ids).toEqual([SELECTION_COLUMN_ID, EXPAND_COLUMN_ID, 'name', ACTIONS_COLUMN_ID])
	})
})

describe('extractPinningState', () => {
	it('extracts columns with static pin position', () => {
		const cols: TanStackColumnDef<Row>[] = [
			{ id: 'a', meta: { columnPinning: { side: 'left' } } },
			{ id: 'b', meta: { columnPinning: { side: 'right' } } },
			{ id: 'c', meta: {} },
		]
		const { left, right } = extractPinningState(cols)
		expect(left).toContain('a')
		expect(right).toContain('b')
		expect(left).not.toContain('c')
	})

	it('extracts columns with initialSide position', () => {
		const cols: TanStackColumnDef<Row>[] = [
			{ id: 'd', meta: { columnPinning: { initialSide: 'left' } } },
			{ id: 'e', meta: { columnPinning: { initialSide: 'right' } } },
		]
		const { left, right } = extractPinningState(cols)
		expect(left).toContain('d')
		expect(right).toContain('e')
	})

	it('skips columns with columnPinning: false', () => {
		const cols: TanStackColumnDef<Row>[] = [{ id: 'f', meta: { columnPinning: false } }]
		const { left, right } = extractPinningState(cols)
		expect(left).not.toContain('f')
		expect(right).not.toContain('f')
	})
})
