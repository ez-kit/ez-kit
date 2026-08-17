import { describe, expect, it } from 'vitest'

import {
	cellTypes,
	CellTypesProvider,
	createColumnHelper,
	DataGrid,
	DataGridOptionsProvider,
	createColumns,
	extendDataGrid,
	extractState,
	GridComponentsProvider,
	parseState,
	useDataGrid,
	useDataGridOptions,
	useExtractedState,
	ValidationError,
} from './index'

import type {
	ColumnDef,
	ColumnFiltersState,
	ColumnHelper,
	DataGridProps,
	DateRangePreset,
	SortingState,
	TableState,
} from './index'

type User = {
	id: number
	name: string
}

describe('@ez-kit/data-grid-shadcn', () => {
	it('exports the shadcn-bound DataGrid bundle', () => {
		expect(DataGrid).toBeTypeOf('function')
		expect(useDataGrid).toBeTypeOf('function')
		expect(GridComponentsProvider).toBeTypeOf('function')
		expect(extendDataGrid).toBeTypeOf('function')
		expect(cellTypes.badge).toBeDefined()
		expect(cellTypes.select).toBeDefined()
	})

	// The kit must carry the whole consumer surface on its own: installing a kit and also
	// depending on `@ez-kit/data-grid-react` to reach `createColumns` is the thing #66 removes.
	it('re-exports the adapter consumer surface', () => {
		expect(createColumns).toBeTypeOf('function')
		expect(createColumnHelper).toBeTypeOf('function')
		expect(extractState).toBeTypeOf('function')
		expect(parseState).toBeTypeOf('function')
		expect(useExtractedState).toBeTypeOf('function')
		expect(CellTypesProvider).toBeTypeOf('function')
		expect(DataGridOptionsProvider).toBeTypeOf('function')
		expect(useDataGridOptions).toBeTypeOf('function')
		expect(ValidationError).toBeTypeOf('function')
	})

	// Type-level half of the same guarantee: these annotations are the assertion — the test
	// fails at `pnpm typecheck` if the kit stops carrying a type an example relies on.
	it('types a consumer that imports from the kit alone', () => {
		const columns: ColumnDef<User>[] = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])
		const helper: ColumnHelper<User> = createColumnHelper<User>()
		const sorting: SortingState = [{ id: 'name', desc: false }]
		const columnFilters: ColumnFiltersState = [{ id: 'name', value: 'Ada' }]
		const state: Partial<TableState> = { sorting, columnFilters }
		const preset: DateRangePreset = {
			id: 'today',
			label: 'Today',
			getRange: () => ({ from: '2026-05-14', to: '2026-05-14' }),
		}
		const props: DataGridProps<User> = { data: [{ id: 1, name: 'Ada' }], columns }

		expect(columns).toHaveLength(1)
		expect(helper).toBeDefined()
		expect(state.sorting).toEqual(sorting)
		expect(preset.getRange()).toEqual({ from: '2026-05-14', to: '2026-05-14' })
		expect(props.columns).toBe(columns)
	})
})
