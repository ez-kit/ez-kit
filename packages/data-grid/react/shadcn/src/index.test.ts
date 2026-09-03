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
	// The defect this guards: a kit registers `select` / `number` / … under the same ids the
	// shipped contract uses, and the old `CellDef` had an open `custom` arm that swallowed them.
	// A kit-bound `createColumns` then accepted `{ type: 'select' }` with no `config` and
	// `config: { anyTypoAtAll: 1 }` on every type — compiling, running, checking nothing.
	//
	// `@ts-expect-error` is the assertion: each line fails `pnpm typecheck` if it ever compiles
	// again.
	it('checks cell.config against the registered cell type', () => {
		type Item = { id: number; name: string; qty: number; status: string }

		const valid = createColumns<Item>([
			{ accessorKey: 'qty', cell: { type: 'number', config: { decimals: 2, suffix: ' kg' } } },
			{ accessorKey: 'status', cell: { type: 'select', config: { items: [{ value: 'a', label: 'A' }] } } },
			{ accessorKey: 'name', cell: { type: 'link' } },
		])
		expect(valid).toHaveLength(3)

		createColumns<Item>([
			// @ts-expect-error — 'bogusKey' is not part of NumberCellConfig
			{ accessorKey: 'qty', cell: { type: 'number', config: { bogusKey: 1 } } },
		])
		createColumns<Item>([
			// @ts-expect-error — `select` declares a required `items`, so `config` is required
			{ accessorKey: 'status', cell: { type: 'select' } },
		])
		createColumns<Item>([
			// @ts-expect-error — 'raiting' is not a registered cell type
			{ accessorKey: 'name', cell: { type: 'raiting' } },
		])
		createColumns<Item>([
			// @ts-expect-error — `link` declares no config, so it takes none
			{ accessorKey: 'name', cell: { type: 'link', config: { any: 1 } } },
		])

		const createColumn = createColumnHelper<Item>()
		// @ts-expect-error — same rule through the builder: `select` needs its config
		createColumn.select({ accessorKey: 'status' })
		// @ts-expect-error — and a typo in a config key is caught there too
		createColumn.number({ accessorKey: 'qty', config: { decimalz: 2 } })

		expect(createColumn.badge({ accessorKey: 'status', config: { items: [] } }).cell).toEqual({
			type: 'badge',
			config: { items: [] },
		})
	})

	// The kit-bound helpers are typed to the **registry** this kit registers, not merely to its
	// key union: the registry is what carries each type's own `cell.config`. Annotating with the
	// headless helpers here would compile while checking nothing.
	it('types a consumer that imports from the kit alone', () => {
		type KitCellTypes = typeof cellTypes
		const columns: ColumnDef<User, KitCellTypes>[] = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])
		const helper: ColumnHelper<User, KitCellTypes> = createColumnHelper<User>()
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
