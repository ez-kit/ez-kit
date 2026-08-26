import { createColumns } from '@ez-kit/data-grid-core'
import { act, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { renderWithComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { CellTypeDefinition } from '../cell-types-context'
import type { FieldState } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

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

type Row = { id: number; name: string }
const DATA: Row[] = [{ id: 1, name: 'Alice' }]
const SPY_TYPE = 'spy' as const
// The registry arrives at runtime via the `cellTypes` prop, so the second type argument is
// how this call site declares which custom types it means. Omitting it defaults to `never` —
// the unbound helper cannot know a registry it was never given.
const COLUMNS = createColumns<Row, typeof SPY_TYPE>([
	{ accessorKey: 'name', cell: { type: SPY_TYPE }, editing: {}, creating: {} },
])

function makeSpyCellTypes(seen: FieldState[]): Record<string, CellTypeDefinition> {
	const renderer = (field: FieldState): ReactNode => {
		seen.push(field)
		return (
			<input
				data-testid='spy-input'
				value={(field.value ?? '') as string}
				onChange={(e) => {
					field.onChange(e.target.value)
				}}
				onBlur={field.onBlur}
			/>
		)
	}
	return { spy: { edit: renderer, creating: renderer } }
}

describe('<DataGridCell> — FieldState propagation', () => {
	it('passes FieldState to creating renderer with errors + data-error attribute', () => {
		const seen: FieldState[] = []
		const cellTypes = makeSpyCellTypes(seen)

		const tableRef: { table: ReturnType<typeof useDataGrid<Row>> | null } = { table: null }
		function Harness() {
			const t = useDataGrid<Row>({
				data: DATA,
				columns: COLUMNS,
				creating: { onSave: () => Promise.resolve() },
			})
			tableRef.table = t
			return (
				<DataGrid<Row>
					table={t}
					cellTypes={cellTypes}
				/>
			)
		}
		const view = renderWithComponents(<Harness />)
		const { table } = tableRef
		if (!table) throw new Error('table not initialised')

		act(() => {
			table.table.creating.start()
			table.table.creating.setErrors({ name: ['too short', 'forbidden chars'] })
		})
		view.rerender(
			<DataGrid<Row>
				table={table}
				cellTypes={cellTypes}
			/>,
		)

		const last = seen[seen.length - 1]
		expect(last).toBeTruthy()
		expect(last?.errors).toEqual(['too short', 'forbidden chars'])
		expect(last?.error).toBe('too short')
		expect(typeof last?.onBlur).toBe('function')

		const td = screen.getByTestId('spy-input').closest('td')
		expect(td?.getAttribute('data-error')).toBe('true')
	})

	it('FieldState.onBlur in creating row triggers validateField with ctx.cell.columnId', () => {
		const validate = vi.fn().mockReturnValue(null)
		const seen: FieldState[] = []
		const cellTypes = makeSpyCellTypes(seen)

		const tableRef: { table: ReturnType<typeof useDataGrid<Row>> | null } = { table: null }
		function Harness() {
			const t = useDataGrid<Row>({
				data: DATA,
				columns: COLUMNS,
				creating: { validate, onSave: () => Promise.resolve() },
			})
			tableRef.table = t
			return (
				<DataGrid<Row>
					table={t}
					cellTypes={cellTypes}
				/>
			)
		}
		const view = renderWithComponents(<Harness />)
		const { table } = tableRef
		if (!table) throw new Error('table not initialised')

		act(() => {
			table.table.creating.start()
		})
		view.rerender(
			<DataGrid<Row>
				table={table}
				cellTypes={cellTypes}
			/>,
		)

		const last = seen[seen.length - 1]
		expect(last).toBeTruthy()
		act(() => {
			last?.onBlur()
		})

		expect(validate).toHaveBeenCalled()
		const ctx = validate.mock.calls.at(-1)?.[1] as { cell?: { columnId?: string } } | undefined
		expect(ctx?.cell?.columnId).toBe('name')
	})
})
