import { createColumns } from '@ez-kit/data-grid-core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { defineCellType } from '../cell-types-context'
import { renderGrid, TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

import type { BaseCellTypes, ColumnDef, FieldState, InputComponentProps } from '@ez-kit/data-grid-core'

/**
 * `filtering.config` / `editing.config` / `creating.config` laid over `cell.config`: what each
 * surface's renderer is handed. A `probe` cell type records the `config` of all four of its
 * renderers, so one column shows what every surface sees.
 */

type Row = { id: number; name: string; status: string }

const ROWS: Row[] = [{ id: 1, name: 'Ann', status: 'open' }]

type Seen = Record<'view' | 'editing' | 'creating' | 'filtering', unknown[]>

function probeCellType(seen: Seen) {
	return defineCellType<Record<string, unknown>>()({
		view: ({ config }) => {
			seen.view.push(config)
			return null
		},
		editing: (props: FieldState) => {
			seen.editing.push(props.config)
			return null
		},
		creating: (props: FieldState) => {
			seen.creating.push(props.config)
			return null
		},
		filtering: (props: FieldState) => {
			seen.filtering.push(props.config)
			return null
		},
	})
}

type ProbeRegistry = BaseCellTypes & { probe: ReturnType<typeof probeCellType> }

function emptySeen(): Seen {
	return { view: [], editing: [], creating: [], filtering: [] }
}

function probeGrid(column: object, extra: Record<string, unknown> = {}) {
	const seen = emptySeen()
	const result = renderGrid<Row>({
		data: ROWS,
		getRowId: (row) => String(row.id),
		columns: createColumns<Row, ProbeRegistry>([{ accessorKey: 'name', header: 'Name', ...column }]),
		cellTypes: { probe: probeCellType(seen) },
		filtering: true,
		editing: { mode: 'row', onSave: () => undefined },
		...extra,
	})
	return { seen, ...result }
}

function openCreateForm(columns: ColumnDef<Row, ProbeRegistry>[], seen: Seen, mode: 'row' | 'modal') {
	render(
		<DataGrid
			features={TEST_FEATURES}
			data={ROWS}
			columns={columns}
			components={testComponents}
			cellTypes={{ probe: probeCellType(seen) }}
			creating={{ mode, onSave: () => undefined }}
		>
			<DataGrid.Toolbar end={<DataGrid.CreateTrigger />} />
			<DataGrid.Table />
		</DataGrid>,
	)
	fireEvent.click(screen.getByText('+ Add'))
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('config layers — the filter', () => {
	it('lays filtering.config over cell.config, which the cell alone keeps', () => {
		const { seen } = probeGrid({ cell: { type: 'probe', config: { decimals: 2 } }, filtering: { config: { step: 5 } } })

		expect(seen.filtering.at(-1)).toEqual({ decimals: 2, step: 5 })
		expect(seen.view.at(-1)).toEqual({ decimals: 2 })
	})

	it('hands a filtering.component the same merged config', () => {
		const received: InputComponentProps[] = []
		function Filter(props: InputComponentProps) {
			received.push(props)
			return null
		}
		probeGrid({
			cell: { type: 'probe', config: { decimals: 2 } },
			filtering: { component: Filter, config: { step: 5 } },
		})

		expect(received.at(-1)?.config).toEqual({ decimals: 2, step: 5 })
	})

	it('tells two columns sharing one component apart by their own layer', () => {
		const received: InputComponentProps[] = []
		function Filter(props: InputComponentProps) {
			received.push(props)
			return null
		}
		renderGrid<Row>({
			data: ROWS,
			filtering: true,
			columns: createColumns<Row, ProbeRegistry>([
				{ accessorKey: 'name', header: 'Name', filtering: { component: Filter, config: { creatable: true } } },
				{ accessorKey: 'status', header: 'Status', filtering: { component: Filter, config: { creatable: false } } },
			]),
		})

		const creatable = received.map((props) => (props.config as Record<string, unknown> | undefined)?.creatable)
		expect(creatable).toContain(true)
		expect(creatable).toContain(false)
	})

	it('puts the filter’s own list on top of its layer', () => {
		const received: InputComponentProps[] = []
		function Filter(props: InputComponentProps) {
			received.push(props)
			return null
		}
		renderGrid<Row>({
			data: ROWS,
			filtering: true,
			columns: createColumns<Row, ProbeRegistry>([
				{
					accessorKey: 'status',
					header: 'Status',
					cell: { type: 'select', config: { items: [{ value: 'a', label: 'A' }] } },
					filtering: { component: Filter, items: [{ value: 'b', label: 'B' }], config: { creatable: true } },
				},
			]),
		})

		expect(received.at(-1)?.config).toEqual({ items: [{ value: 'b', label: 'B' }], creatable: true })
	})

	it('puts a hook-loaded list on top of its layer', () => {
		const received: InputComponentProps[] = []
		function Filter(props: InputComponentProps) {
			received.push(props)
			return null
		}
		const loaded = [{ value: 'h', label: 'H' }]
		renderGrid<Row>({
			data: ROWS,
			filtering: true,
			columns: createColumns<Row, ProbeRegistry>([
				{
					accessorKey: 'status',
					header: 'Status',
					cell: { type: 'select', config: { items: [] } },
					filtering: {
						component: Filter,
						useItems: () => ({ items: loaded, isLoading: false, error: undefined }),
						config: { creatable: true },
					},
				},
			]),
		})

		expect(received.at(-1)?.config).toEqual({ items: loaded, creatable: true })
	})

	it('drops a list a layer holds, keeping the column’s own', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const received: InputComponentProps[] = []
		function Filter(props: InputComponentProps) {
			received.push(props)
			return null
		}
		const column = {
			id: 'listed-status',
			accessorKey: 'status',
			header: 'Status',
			cell: { type: 'select', config: { items: [{ value: 'a', label: 'A' }] } },
			filtering: { component: Filter, config: { items: [{ value: 'x', label: 'X' }], creatable: true } },
		}
		renderGrid<Row>({ data: ROWS, filtering: true, columns: [column as never] })

		expect(received.at(-1)?.config).toEqual({ items: [{ value: 'a', label: 'A' }], creatable: true })
	})

	it('hands a column with no config and no layer no config at all', () => {
		const received: InputComponentProps[] = []
		function Filter(props: InputComponentProps) {
			received.push(props)
			return null
		}
		renderGrid<Row>({
			data: ROWS,
			filtering: true,
			columns: createColumns<Row, ProbeRegistry>([
				{ accessorKey: 'name', header: 'Name', filtering: { component: Filter } },
			]),
		})

		expect(received.at(-1)).not.toHaveProperty('config')
	})
})

describe('config layers — the editor', () => {
	it('replaces a base key whole rather than merging into it', () => {
		const { seen, table } = probeGrid({
			cell: { type: 'probe', config: { format: { unit: 'kg', digits: 1 } } },
			editing: { config: { format: { unit: 't' } } },
		})

		act(() => {
			table.editing.start('1')
		})

		expect(seen.editing.at(-1)).toEqual({ format: { unit: 't' } })
	})

	it('does not see the filter’s layer, nor does the cell', () => {
		const { seen, table } = probeGrid({
			cell: { type: 'probe', config: { base: 1 } },
			filtering: { config: { creatable: true } },
		})

		act(() => {
			table.editing.start('1')
		})

		expect(seen.editing.at(-1)).toEqual({ base: 1 })
		expect(seen.view.at(-1)).toEqual({ base: 1 })
	})

	it('does not see the create field’s layer', () => {
		const { seen, table } = probeGrid({
			cell: { type: 'probe', config: { base: 1 } },
			editing: { config: { mask: 'phone' } },
			creating: { config: { hint: 'new' } },
		})

		act(() => {
			table.editing.start('1')
		})

		expect(seen.editing.at(-1)).toEqual({ base: 1, mask: 'phone' })
	})

	it('reaches the editor of the modal form, without the create field’s layer', () => {
		const { seen, table } = probeGrid(
			{
				cell: { type: 'probe', config: { base: 1 } },
				editing: { config: { mask: 'phone' } },
				creating: { config: { hint: 'new' } },
			},
			{ editing: { mode: 'modal', onSave: () => undefined } },
		)
		seen.editing.length = 0

		act(() => {
			table.editing.start('1')
		})

		expect(seen.editing.length).toBeGreaterThan(0)
		expect(seen.editing.at(-1)).toEqual({ base: 1, mask: 'phone' })
	})

	it('drops a list the editor’s layer holds', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { seen, table } = probeGrid({
			cell: { type: 'probe', config: { base: 1 } },
			editing: { config: { items: [{ value: 'x', label: 'X' }], useItems: () => undefined, mask: 'phone' } },
		})

		act(() => {
			table.editing.start('1')
		})

		expect(seen.editing.at(-1)).toEqual({ base: 1, mask: 'phone' })
	})

	it('hands the same config object to every render while the column stays the same', () => {
		const { seen, table } = probeGrid({
			cell: { type: 'probe', config: { base: 1 } },
			editing: { config: { mask: 'phone' } },
		})

		act(() => {
			table.editing.start('1')
		})
		act(() => {
			table.editing.setValue('name', 'Bob')
		})

		expect(seen.editing.length).toBeGreaterThan(1)
		expect(new Set(seen.editing).size).toBe(1)
	})

	it('treats a null layer as none rather than throwing', () => {
		const { seen, table } = probeGrid({
			cell: { type: 'probe', config: { base: 1 } },
			editing: { config: null as never },
		})

		act(() => {
			table.editing.start('1')
		})

		expect(seen.editing.at(-1)).toEqual({ base: 1 })
	})

	it('hands an editing.component the merged config', () => {
		const received: FieldState[] = []
		function Editor(props: FieldState) {
			received.push(props)
			return null
		}
		const { table } = probeGrid({ editing: { component: Editor, config: { mask: 'phone' } } })

		act(() => {
			table.editing.start('1')
		})

		expect(received.at(-1)?.config).toEqual({ mask: 'phone' })
	})
})

describe.each(['row', 'modal'] as const)('config layers — the create form (%s)', (mode) => {
	it('inherits the editor’s layer when it states none', () => {
		const seen = emptySeen()
		openCreateForm(
			createColumns<Row, ProbeRegistry>([
				{ accessorKey: 'name', cell: { type: 'probe', config: { base: 1 } }, editing: { config: { mask: 'phone' } } },
			]),
			seen,
			mode,
		)

		expect(seen.creating.at(-1)).toEqual({ base: 1, mask: 'phone' })
	})

	it('overrides one key of the editor’s layer and keeps the rest', () => {
		const seen = emptySeen()
		openCreateForm(
			createColumns<Row, ProbeRegistry>([
				{
					accessorKey: 'name',
					cell: 'probe',
					editing: { config: { mask: 'phone', hint: 'a' } },
					creating: { config: { hint: 'b' } },
				},
			]),
			seen,
			mode,
		)

		expect(seen.creating.at(-1)).toEqual({ mask: 'phone', hint: 'b' })
	})

	it('keeps the filter’s layer out of the create field', () => {
		const seen = emptySeen()
		openCreateForm(
			createColumns<Row, ProbeRegistry>([
				{
					accessorKey: 'name',
					cell: { type: 'probe', config: { base: 1 } },
					filtering: { config: { creatable: true } },
				},
			]),
			seen,
			mode,
		)

		expect(seen.creating.at(-1)).toEqual({ base: 1 })
	})

	it('takes its own layer when the column is not editable', () => {
		const seen = emptySeen()
		openCreateForm(
			createColumns<Row, ProbeRegistry>([
				{
					accessorKey: 'name',
					cell: { type: 'probe', config: { base: 1 } },
					editing: false,
					creating: { config: { hint: 'new' } },
				},
			]),
			seen,
			mode,
		)

		expect(seen.creating.at(-1)).toEqual({ base: 1, hint: 'new' })
	})

	it('drops a list its layer holds', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const seen = emptySeen()
		const column = {
			accessorKey: 'name',
			cell: { type: 'probe', config: { base: 1 } },
			creating: { config: { items: [{ value: 'x', label: 'X' }], hint: 'new' } },
		}
		openCreateForm([column as never], seen, mode)

		expect(seen.creating.at(-1)).toEqual({ base: 1, hint: 'new' })
	})
})
