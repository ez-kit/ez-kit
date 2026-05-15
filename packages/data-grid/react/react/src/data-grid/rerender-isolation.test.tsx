import { defineColumns } from '@ez-kit/data-grid-core'
import { act, render } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { testComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type {
	GridComponents,
	PageSizerProps,
	PaginationProps,
	TbodyProps,
	TdProps,
	TheadProps,
	ToolbarProps,
} from '../types'
import type { ReactElement } from 'react'

// JSDOM lacks ResizeObserver; the table layout effect needs one.
beforeAll(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class StubResizeObserver {
			observe(): void {}
			unobserve(): void {}
			disconnect(): void {}
		},
	)
})

type Row = { id: number; name: string; email: string }
const DATA: Row[] = [
	{ id: 1, name: 'Alice', email: 'a@x' },
	{ id: 2, name: 'Bob', email: 'b@x' },
	{ id: 3, name: 'Carol', email: 'c@x' },
]
const COLUMNS = defineColumns<Row>([
	{ accessorKey: 'name', editing: {} },
	{ accessorKey: 'email', editing: {} },
])

type Counters = {
	tbody: number
	td: number
	thead: number
	toolbar: number
	pagination: number
	pageSizer: number
}

function makeCountingComponents(counters: Counters): Required<GridComponents> {
	function CountingTbody(props: TbodyProps): ReactElement {
		counters.tbody += 1
		return <tbody {...props} />
	}
	function CountingTd(props: TdProps): ReactElement {
		counters.td += 1
		return <td {...props} />
	}
	function CountingThead(props: TheadProps): ReactElement {
		counters.thead += 1
		return <thead {...props} />
	}
	function CountingToolbar({ children, left, right, ...rest }: ToolbarProps): ReactElement {
		counters.toolbar += 1
		return (
			<div role='toolbar' {...rest}>
				{left}
				{children}
				{right}
			</div>
		)
	}
	const InnerPagination = testComponents.Pagination
	const InnerPageSizer = testComponents.PageSizer
	function CountingPagination(props: PaginationProps): ReactElement {
		counters.pagination += 1
		return <InnerPagination {...props} />
	}
	function CountingPageSizer(props: PageSizerProps): ReactElement {
		counters.pageSizer += 1
		return <InnerPageSizer {...props} />
	}
	return {
		...testComponents,
		Tbody: CountingTbody,
		Td: CountingTd,
		Thead: CountingThead,
		Toolbar: CountingToolbar,
		Pagination: CountingPagination,
		PageSizer: CountingPageSizer,
	}
}

type Instance = ReturnType<typeof useDataGrid<Row>>

function renderGrid(config?: Partial<Parameters<typeof useDataGrid<Row>>[0]>) {
	const counters: Counters = { tbody: 0, td: 0, thead: 0, toolbar: 0, pagination: 0, pageSizer: 0 }
	const components = makeCountingComponents(counters)
	const ref: { instance: Instance | null } = { instance: null }

	function Harness(): ReactElement {
		const t = useDataGrid<Row>({
			data: DATA,
			columns: COLUMNS,
			editing: { onSave: () => Promise.resolve() },
			...config,
		})
		ref.instance = t
		return <DataGrid<Row> table={t} />
	}

	render(
		<GridComponentsProvider components={components}>
			<Harness />
		</GridComponentsProvider>,
	)

	const instance = ref.instance
	if (!instance) throw new Error('instance not initialised')
	return { counters, instance }
}

describe('rerender isolation', () => {
	it('start editing a row does NOT re-render the Body', () => {
		const { counters, instance } = renderGrid()
		const tbodyBefore = counters.tbody

		act(() => {
			instance.table.editing.start('1')
		})

		expect(counters.tbody).toBe(tbodyBefore)
	})

	it('start editing a row does NOT re-render the Header (Thead)', () => {
		const { counters, instance } = renderGrid()
		const theadBefore = counters.thead

		act(() => {
			instance.table.editing.start('1')
		})

		expect(counters.thead).toBe(theadBefore)
	})

	it('start editing a row does NOT re-render Pagination', () => {
		const { counters, instance } = renderGrid({ pagination: { pageSize: 2 } })
		const before = counters.pagination

		act(() => {
			instance.table.editing.start('1')
		})

		expect(counters.pagination).toBe(before)
	})

	it('start editing a row does NOT re-render PageSizer', () => {
		const { counters, instance } = renderGrid({ pageSizer: { items: [10, 25] } })
		const before = counters.pageSizer

		act(() => {
			instance.table.editing.start('1')
		})

		expect(counters.pageSizer).toBe(before)
	})

	it('start editing a row does NOT re-render the Toolbar', () => {
		// Toolbar needs at least one control to render; pageSizer suffices.
		const { counters, instance } = renderGrid({ pageSizer: { items: [10, 25] } })
		const toolbarBefore = counters.toolbar

		act(() => {
			instance.table.editing.start('1')
		})

		expect(counters.toolbar).toBe(toolbarBefore)
	})

	it('start editing only re-mounts cells for the targeted row', () => {
		const { counters, instance } = renderGrid()
		const tdBefore = counters.td

		act(() => {
			instance.table.editing.start('1')
		})

		// Row 1 has 2 data cells (name + email) that flipped to EditingCell.
		// Each new EditingCell renders one Td. No other Tds re-render because
		// every other cell's `isEditing` selector stably returns false.
		expect(counters.td - tdBefore).toBe(2)
	})

	it('setValue on an editing field re-renders only that one cell', () => {
		const { counters, instance } = renderGrid()
		act(() => {
			instance.table.editing.start('1')
		})
		const tbodyAfterStart = counters.tbody
		const tdAfterStart = counters.td

		act(() => {
			instance.table.editing.setValue('name', 'A')
		})
		act(() => {
			instance.table.editing.setValue('name', 'AB')
		})

		// Body is not subscribed to `editing` — must not re-render on setValue.
		expect(counters.tbody).toBe(tbodyAfterStart)
		// Only the EditingCell for column 'name' re-renders (once per setValue).
		// The EditingCell for 'email' is subscribed to `values.email` (unchanged)
		// and `errors.email` (still undefined) — stable, no re-render.
		expect(counters.td - tdAfterStart).toBe(2)
	})

	it('cancel editing restores view cells without re-rendering Body', () => {
		const { counters, instance } = renderGrid()
		act(() => {
			instance.table.editing.start('1')
		})
		const tbodyAfterStart = counters.tbody

		act(() => {
			instance.table.editing.cancel()
		})

		expect(counters.tbody).toBe(tbodyAfterStart)
	})

	it('sorting still re-renders the Body (regression)', () => {
		const { counters, instance } = renderGrid({ sorting: true })
		const tbodyBefore = counters.tbody

		act(() => {
			instance.table.setSorting([{ id: 'name', desc: true }])
		})

		expect(counters.tbody).toBeGreaterThan(tbodyBefore)
	})

	it('pagination still re-renders the Body (regression)', () => {
		const { counters, instance } = renderGrid({ pagination: { pageSize: 2 } })
		const tbodyBefore = counters.tbody

		act(() => {
			instance.table.setPageIndex(1)
		})

		expect(counters.tbody).toBeGreaterThan(tbodyBefore)
	})
})
