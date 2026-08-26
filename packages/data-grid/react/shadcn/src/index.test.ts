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
	//
	// `KitCellType` is the point of the kit-bound helpers: they are typed to the cell types
	// this kit registers, so `cell: { type: … }` is checked against them. The headless
	// helpers the star export used to supply resolve `TCustomCellTypes` to `never`, and
	// annotating with them here would compile while checking nothing.
	it('types a consumer that imports from the kit alone', () => {
		type KitCellType = Extract<keyof typeof cellTypes, string>
		const columns: ColumnDef<User, KitCellType>[] = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])
		const helper: ColumnHelper<User, KitCellType> = createColumnHelper<User>()
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

// ── surface parity with the adapter ───────────────────────────────────────

describe('@ez-kit/data-grid-shadcn — adapter surface parity', () => {
	it('carries every runtime value the adapter exports', async () => {
		const adapter = await import('@ez-kit/data-grid-react')
		const kit = await import('./index')
		const missing = Object.keys(adapter).filter((name) => !(name in kit))
		expect(missing).toEqual([])
	})

	it('keeps the shadcn-bound names, not the adapter ones', async () => {
		const adapter = await import('@ez-kit/data-grid-react')
		const kit = await import('./index')
		// An explicit re-export shadows a star of the same name — this is what makes
		// `export * from '@ez-kit/data-grid-react'` safe next to the bound exports.
		expect(kit.DataGrid).not.toBe(adapter.DataGrid)
		expect(kit.useDataGrid).not.toBe(adapter.useDataGrid)
		// The two that used to slip through: with no explicit re-export the star supplied the
		// headless core helpers, typed `TCustomCellTypes = never`, so a column's
		// `cell: { type: 'my-type' }` silently stopped being checked against the kit registry.
		expect(kit.createColumns).not.toBe(adapter.createColumns)
		expect(kit.createColumnHelper).not.toBe(adapter.createColumnHelper)
	})

	it('the bound DataGrid carries the full compound namespace', async () => {
		const adapter = await import('@ez-kit/data-grid-react')
		const kit = await import('./index')
		for (const member of Object.keys(adapter.DataGrid) as (keyof typeof adapter.DataGrid)[]) {
			expect(kit.DataGrid[member], `DataGrid.${member} missing from the kit bundle`).toBeDefined()
		}
	})
	// Type-level guard for the whole point of the bound factory: `cell.type` must be checked
	// against the kit's own registry. Two things had to hold at once and neither did — the kit
	// exported `cellTypes` under a widening `: CellTypeRegistry` annotation (so the key union
	// collapsed to `string`), and `CellDef`'s basic arm was derived from `CellType`, whose
	// `string & {}` tail accepted every string regardless. A typo compiled cleanly.
	it('checks cell.type against the kit registry', () => {
		type User = { id: number; name: string }

		const ok = createColumns<User>([{ accessorKey: 'name', cell: { type: 'badge', config: { items: [] } } }])
		expect(ok).toHaveLength(1)

		createColumns<User>([
			// @ts-expect-error 'raiting' is not a registered cell type — this must not compile
			{ accessorKey: 'name', cell: { type: 'raiting' } },
		])
	})
})
