import { createColumns, defaultMessages } from '@ez-kit/data-grid-core'
import { act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderGrid } from '../test-utils'

import { buildColumnMenuSections, ColumnActionId } from './column-menu-sections'
import { DataGrid } from './data-grid'

import type { RenderGridResult } from '../test-utils'
import type { GridFeatures, DataTable } from '../types'

type Row = {
	id: number
	region: string
	manager: string
	amount: number
}

const ROWS: Row[] = [
	{ id: 1, region: 'EMEA', manager: 'Ivanov', amount: 50 },
	{ id: 2, region: 'APAC', manager: 'Chen', amount: 100 },
]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'region', header: 'Region' },
	{ accessorKey: 'manager', header: 'Manager' },
	{ accessorKey: 'amount', header: 'Amount' },
])

const withBar = (grouping: unknown = true): RenderGridResult<Row> =>
	renderGrid<Row>(
		{ data: ROWS, columns: COLUMNS, grouping } as Parameters<typeof renderGrid<Row>>[0],
		<DataGrid.Toolbar start={<DataGrid.GroupByBar />} />,
	)

const chips = (container: HTMLElement): HTMLElement[] => [
	...container.querySelectorAll<HTMLElement>('[data-slot="group-by-chip"]'),
]

const chipLabels = (container: HTMLElement): (string | null)[] =>
	[...container.querySelectorAll('[data-slot="group-by-chip-label"]')].map((el) => el.textContent)

describe('GroupByBar', () => {
	it('renders nothing when no level is grouped', () => {
		const { container } = withBar()

		expect(container.querySelector('[data-slot="group-by-bar"]')).toBeNull()
	})

	it('renders one chip per level, outermost first', () => {
		const { container } = withBar({ by: ['region', 'manager'] })

		expect(container.querySelector('[data-slot="group-by-bar"]')).not.toBeNull()
		expect(chipLabels(container)).toEqual(['Region', 'Manager'])
	})

	it('numbers each chip with its nesting depth', () => {
		const { container } = withBar({ by: ['region', 'manager'] })

		expect(chips(container).map((c) => c.getAttribute('data-level'))).toEqual(['0', '1'])
		expect(chips(container).map((c) => c.getAttribute('data-column-id'))).toEqual(['region', 'manager'])
	})

	it('appears and disappears as the grouping changes', () => {
		const { container, table } = withBar()

		expect(container.querySelector('[data-slot="group-by-bar"]')).toBeNull()

		act(() => {
			table.setGrouping(['region'])
		})
		expect(chipLabels(container)).toEqual(['Region'])

		act(() => {
			table.setGrouping([])
		})
		expect(container.querySelector('[data-slot="group-by-bar"]')).toBeNull()
	})

	it('names itself as a group for a screen reader', () => {
		const { container } = withBar({ by: ['region'] })

		const bar = container.querySelector('[data-slot="group-by-bar"]')
		expect(bar?.getAttribute('role')).toBe('group')
		expect(bar?.getAttribute('aria-label')).toBe(defaultMessages.groupBar.label)
	})

	it('falls back to the column id when the header is not plain text', () => {
		const columns = createColumns<Row>([
			{ accessorKey: 'region', header: () => 'Region' },
			{ accessorKey: 'manager', header: 'Manager' },
		])
		const { container } = renderGrid<Row>(
			{ data: ROWS, columns, grouping: { by: ['region'] } },
			<DataGrid.Toolbar start={<DataGrid.GroupByBar />} />,
		)

		expect(chipLabels(container)).toEqual(['region'])
	})
})

/** The fixture kit's `Menu` renders its entries unconditionally as buttons labelled by the
 * entry's own wording, so a chip's controls are driven by clicking the real `onAction` rather
 * than by reproducing what it would have done. */
const chipAt = (container: HTMLElement, level: number): HTMLElement => {
	const found = chips(container)[level]
	if (!found) throw new Error(`no chip at level ${String(level)}`)

	return found
}

const entry = (chip: HTMLElement, label: string): HTMLButtonElement => {
	const found = [...chip.querySelectorAll('button')].find((b) => b.textContent === label)
	if (!found) throw new Error(`no \`${label}\` entry on this chip`)

	return found
}

describe('a chip reorders and removes its level', () => {
	it('disables the outward move on the first level and the inward move on the last', () => {
		// Both entries stay listed at the ends rather than disappearing — the same convention the
		// column-move pair follows, so the menu does not jump under the pointer.
		const { container } = withBar({ by: ['region', 'manager'] })
		const first = chipAt(container, 0)
		const last = chipAt(container, 1)

		expect(entry(first, defaultMessages.groupBar.moveOuter).disabled).toBe(true)
		expect(entry(first, defaultMessages.groupBar.moveInner).disabled).toBe(false)
		expect(entry(last, defaultMessages.groupBar.moveOuter).disabled).toBe(false)
		expect(entry(last, defaultMessages.groupBar.moveInner).disabled).toBe(true)
	})

	it('moves a level outward', async () => {
		const user = userEvent.setup()
		const { container, table } = withBar({ by: ['region', 'manager'] })

		await user.click(entry(chipAt(container, 1), defaultMessages.groupBar.moveOuter))

		expect(table.store.state.grouping).toEqual(['manager', 'region'])
		expect(chipLabels(container)).toEqual(['Manager', 'Region'])
	})

	it('moves a level inward', async () => {
		const user = userEvent.setup()
		const { container, table } = withBar({ by: ['region', 'manager'] })

		await user.click(entry(chipAt(container, 0), defaultMessages.groupBar.moveInner))

		expect(table.store.state.grouping).toEqual(['manager', 'region'])
	})

	it('removes a level', async () => {
		const user = userEvent.setup()
		const { container, table } = withBar({ by: ['region', 'manager'] })

		await user.click(entry(chipAt(container, 0), defaultMessages.groupBar.remove))

		expect(table.store.state.grouping).toEqual(['manager'])
		expect(chipLabels(container)).toEqual(['Manager'])
	})

	it('drops the whole bar when the last level is removed', async () => {
		const user = userEvent.setup()
		const { container } = withBar({ by: ['region'] })

		await user.click(entry(chipAt(container, 0), defaultMessages.groupBar.remove))

		expect(container.querySelector('[data-slot="group-by-bar"]')).toBeNull()
	})
})

describe('the column menu groups and ungroups', () => {
	const sectionsFor = (table: DataTable<GridFeatures, Row>, columnId: string) => {
		const header = table.getHeaderGroups()[0]?.headers.find((h) => h.column.id === columnId)
		if (!header) throw new Error(`no header for ${columnId}`)

		return buildColumnMenuSections(
			header,
			{ canSort: false, canPin: false, canHide: false, canMove: false, canGroup: header.column.getCanGroup() },
			defaultMessages.columnMenu,
		)
	}

	it('offers Group by on an ungrouped column', () => {
		const { table } = withBar()

		const grouping = sectionsFor(table, 'region').find((s) => s.id === 'grouping')
		expect(grouping?.items.map((i) => i.id)).toEqual([ColumnActionId.GroupBy])
	})

	/**
	 * **A grouped column has no header, so it has no menu either** — `groupedColumnMode: 'remove'`
	 * takes it out of the column list while it is a level, which is what stops its value being
	 * shown twice. So the menu's `Ungroup` entry is unreachable in practice and dropping a level
	 * is the bar's job. Asserted rather than left implicit, because the design document specifies
	 * both entries and only this says which one a user can actually reach.
	 */
	it('leaves a grouped column with no header to hang a menu on', () => {
		const { table } = withBar({ by: ['manager'] })

		const headers = table.getHeaderGroups()[0]?.headers.map((h) => h.column.id) ?? []
		expect(headers).not.toContain('manager')
		expect(headers).toContain('region')
	})

	it('adds the level when Group by is chosen', () => {
		const { table } = withBar()

		const item = sectionsFor(table, 'region').find((s) => s.id === 'grouping')?.items[0]
		act(() => {
			if (item && 'onAction' in item) item.onAction()
		})

		expect(table.store.state.grouping).toEqual(['region'])
	})

	it('offers no grouping section on a column that opted out', () => {
		const columns = createColumns<Row>([
			{ accessorKey: 'region', header: 'Region', grouping: false },
			{ accessorKey: 'manager', header: 'Manager' },
		])
		const { table } = renderGrid<Row>({ data: ROWS, columns, grouping: true })

		expect(sectionsFor(table, 'region').find((s) => s.id === 'grouping')).toBeUndefined()
		expect(sectionsFor(table, 'manager').find((s) => s.id === 'grouping')).not.toBeUndefined()
	})

	it('offers no grouping section when the table does not group at all', () => {
		const { table } = renderGrid<Row>({ data: ROWS, columns: COLUMNS })

		expect(sectionsFor(table, 'region').find((s) => s.id === 'grouping')).toBeUndefined()
	})
})
