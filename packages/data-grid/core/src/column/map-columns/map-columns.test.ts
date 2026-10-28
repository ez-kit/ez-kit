import { describe, expect, it, vi } from 'vitest'

import { defaultOperators } from '../../operators/entry'

import { mapColumns } from './map-columns'

import type { ColumnDef, ColumnFilteringMeta, MappedColumnDef } from '../types'

type Row = {
	id: number
	name: string
	age: number
}

/** `meta.filtering` narrowed past its `false` arm — the shape every assertion below wants. */
function filteringMeta(def: MappedColumnDef<Row> | undefined): ColumnFilteringMeta | undefined {
	const filtering = def?.meta?.filtering
	return filtering === false ? undefined : filtering
}

describe('mapColumns', () => {
	it('maps accessorKey to TanStack column', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', header: 'Name' }])
		expect(result).toHaveLength(1)
		if (!result[0]) throw new Error('expected column')
		const col = result[0]
		expect((col as { accessorKey?: string }).accessorKey).toBe('name')
		expect(col.header).toBe('Name')
	})

	it('sorting: false → enableSorting: false', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: false }])
		expect(result[0]?.enableSorting).toBe(false)
	})

	it('sorting: { descFirst: true } → sortDescFirst on the column', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { descFirst: true } }])
		expect(result[0]?.sortDescFirst).toBe(true)
	})

	it('sorting: { fn: "datetime" } → sortFn passed through as a built-in name', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { fn: 'datetime' } }])
		expect(result[0]?.sortFn).toBe('datetime')
	})

	it('sorting: { fn: <inline> } → sortFn passed through as a function', () => {
		const fn = (_a: unknown, _b: unknown) => 0
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { fn } }])
		expect(result[0]?.sortFn).toBe(fn)
	})

	it("sorting: { undefined: 'last' } → sortUndefined: 'last'", () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { undefined: 'last' } }])
		expect(result[0]?.sortUndefined).toBe('last')
	})

	it('sorting: { invert: true } → invertSorting: true', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { invert: true } }])
		expect(result[0]?.invertSorting).toBe(true)
	})

	it('sorting: { multi: false } → enableMultiSort: false on the column', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { multi: false } }])
		expect(result[0]?.enableMultiSort).toBe(false)
	})

	it('sorting object does not set enableSorting (column stays sortable)', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { descFirst: true } }])
		expect(result[0]?.enableSorting).toBeUndefined()
	})

	it('visibility: false → enableHiding: false (hiding disabled for the column)', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', visibility: false }])
		expect(result[0]?.enableHiding).toBe(false)
	})

	it('visibility: { initialHidden: true } leaves the column hideable', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', visibility: { initialHidden: true } }])
		expect(result[0]?.enableHiding).toBeUndefined()
	})

	it('visibility omitted → column stays hideable (enableHiding undefined)', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name' }])
		expect(result[0]?.enableHiding).toBeUndefined()
	})

	it('pinning: { side: start } goes into meta.pinning', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', pinning: { side: 'start' } }])
		expect(result[0]?.meta?.pinning).toEqual({ side: 'start' })
	})

	it('the scalar pinning form normalizes to a static side', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', pinning: 'start' }])
		expect(result[0]?.meta?.pinning).toEqual({ side: 'start' })
	})

	it('pinning: { initialSide: end } goes into meta.pinning', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', pinning: { initialSide: 'end' } }])
		expect(result[0]?.meta?.pinning).toEqual({ initialSide: 'end' })
	})

	it('pinning: false goes into meta.pinning as false', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', pinning: false }])
		expect(result[0]?.meta?.pinning).toBe(false)
	})

	it('filtering goes into meta.filtering', () => {
		const component = vi.fn()
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { component } }])
		expect(result[0]?.meta?.filtering).toEqual({ component })
	})

	it('filtering.placeholder goes into meta.filtering', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { placeholder: '10 digits' } }])
		expect(filteringMeta(result[0])?.placeholder).toBe('10 digits')
	})

	it('no filtering.placeholder leaves the key out of meta.filtering', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { debounce: 0 } }])
		expect(filteringMeta(result[0])).not.toHaveProperty('placeholder')
	})

	it('filtering: false goes into meta', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: false }])
		expect(result[0]?.meta?.filtering).toBe(false)
	})

	// Regression: `filtering: false` used to reach only `meta`, so `column.getCanFilter()`
	// still reported true and any consumer-built toolbar reading the TanStack API disagreed
	// with the config.
	it('filtering: false also sets enableColumnFilter so getCanFilter() agrees', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: false }])
		expect(result[0]?.enableColumnFilter).toBe(false)
	})

	it('filtering config object leaves enableColumnFilter untouched', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { defaultOperator: 'contains' } }])
		expect(result[0]?.enableColumnFilter).toBeUndefined()
	})

	it('cell.type goes into meta.cell.type', () => {
		const result = mapColumns<Row>([{ accessorKey: 'age', cell: { type: 'number' } }])
		expect(result[0]?.meta?.cell?.type).toBe('number')
	})

	it('defaults meta.cell.type to "text" when cell.type is omitted', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name' }])
		expect(result[0]?.meta?.cell?.type).toBe('text')
	})

	it('forwards creating.description to meta.creating.description', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', creating: { description: 'Choose a unique name' } }])
		const created = result[0]?.meta?.creating
		const description = created !== false ? created?.description : undefined
		expect(description).toBe('Choose a unique name')
	})

	it('forwards editing.description to meta.editing.description', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', editing: { description: 'Cannot be changed once saved' } }])
		const edited = result[0]?.meta?.editing
		const description = edited !== false ? edited?.description : undefined
		expect(description).toBe('Cannot be changed once saved')
	})

	it('maps nested column groups', () => {
		const defs: ColumnDef<Row>[] = [
			{
				header: 'Group',
				columns: [{ accessorKey: 'name' }, { accessorKey: 'age' }],
			},
		]
		const result = mapColumns(defs)
		expect((result[0] as { columns?: unknown[] }).columns).toHaveLength(2)
	})

	it('cell.component maps to TanStack cell renderer and meta.cell.view', () => {
		const component = vi.fn().mockReturnValue('custom')
		const result = mapColumns<Row>([{ accessorKey: 'name', cell: { component } }])
		expect(result[0]?.cell).toBeTypeOf('function')
		expect(result[0]?.meta?.cell?.view).toBeTypeOf('function')
	})

	it('cell.component invoked as TanStack cell renderer', () => {
		const component = vi.fn().mockReturnValue('component-result')
		const result = mapColumns<Row>([{ accessorKey: 'name', cell: { component } }])
		type CellCtx = {
			row: { original: Row; index: number }
			getValue: () => unknown
		}
		const ctx: CellCtx = { row: { original: { id: 1, name: 'x', age: 0 }, index: 0 }, getValue: () => 'x' }
		const cellFn = result[0]?.cell as ((c: CellCtx) => unknown) | undefined
		cellFn?.(ctx)
		expect(component).toHaveBeenCalled()
	})

	it('filtering.component stored in meta.filtering', () => {
		const component = vi.fn()
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { component } }])
		expect((result[0]?.meta?.filtering as { component?: unknown } | undefined)?.component).toBe(component)
	})

	it('editing.component stored in meta.editing', () => {
		const component = vi.fn()
		const result = mapColumns<Row>([{ accessorKey: 'name', editing: { component } }])
		expect((result[0]?.meta?.editing as { component?: unknown } | undefined)?.component).toBe(component)
	})

	it('creating.component stored in meta.creating', () => {
		const component = vi.fn()
		const result = mapColumns<Row>([{ accessorKey: 'name', creating: { component } }])
		expect((result[0]?.meta?.creating as { component?: unknown } | undefined)?.component).toBe(component)
	})

	it('width object maps onto size / minSize / maxSize', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', width: { default: 200, min: 50, max: 500 } }])
		expect(result[0]?.size).toBe(200)
		expect(result[0]?.minSize).toBe(50)
		expect(result[0]?.maxSize).toBe(500)
	})

	it('the scalar width form is the starting width, with no bounds', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', width: 200 }])
		expect(result[0]?.size).toBe(200)
		expect(result[0]?.minSize).toBeUndefined()
		expect(result[0]?.maxSize).toBeUndefined()
	})

	// The React layer fixes a column whose author named a starting width, and lets one without
	// fill the grid. TanStack merges its own default `size` into every column def, so the
	// resolved def cannot tell the two apart — the authored width has to reach meta.
	it('carries the authored width to meta, normalized off the scalar form', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', width: 200 }, { accessorKey: 'age' }])
		expect(result[0]?.meta?.width).toEqual({ default: 200 })
		expect(result[1]?.meta?.width).toBeUndefined()
	})

	// TanStack floors every column at a 20px `minSize`, which would turn `width: 10` into 20.
	it('lets a starting width below TanStack’s default minimum stand', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', width: 10 }])
		expect(result[0]?.minSize).toBe(10)
	})

	it('keeps an authored min over the starting width', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', width: { default: 10, min: 5 } }])
		expect(result[0]?.minSize).toBe(5)
	})

	it('resizing: false → enableResizing: false on the TanStack column', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', resizing: false }])
		expect(result[0]?.enableResizing).toBe(false)
	})

	it('resizing omitted → enableResizing untouched (column stays resizable)', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name' }])
		expect(result[0]?.enableResizing).toBeUndefined()
	})

	it('filtering.items is forwarded to meta.filtering.items', () => {
		const items = [
			{ value: 'a', label: 'A' },
			{ value: 'b', label: 'B' },
		]
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { items } }])
		expect(filteringMeta(result[0])?.items).toEqual(items)
	})

	it('column.filtering.faceted: true → meta.filtering.faceted = true (overrides table flag)', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { faceted: true } }], {
			tableFaceted: false,
		})
		expect(filteringMeta(result[0])?.faceted).toBe(true)
	})

	it('column.filtering.faceted: false → meta.filtering.faceted is not set even when table-level is on', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { faceted: false } }], {
			tableFaceted: true,
		})
		expect(filteringMeta(result[0])?.faceted).toBeUndefined()
	})

	it('table-level tableFaceted: true inherits to column meta when column does not override', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: {} }], { tableFaceted: true })
		expect(filteringMeta(result[0])?.faceted).toBe(true)
	})

	it('select cell with operators: true resolves to in/notIn defaults', () => {
		const result = mapColumns<Row>(
			[
				{
					accessorKey: 'name',
					cell: { type: 'select', config: { items: [{ value: 'a', label: 'A' }] } },
					filtering: { operators: true },
				},
			],
			{ operators: defaultOperators },
		)
		const resolved = filteringMeta(result[0])?.operators
		expect(resolved?.map((o) => o.id)).toEqual(['in', 'notIn', 'isEmpty', 'isNotEmpty'])
		expect(filteringMeta(result[0])?.defaultOperator).toBe('in')
	})
})

// The table-level switch, cascading exactly the way `tableFaceted` above does: the table
// states a default, the column overrides it in both directions.
describe('mapColumns — table-level operators switch', () => {
	it('tableOperators: true gives a column with no filtering config its cell type defaults', () => {
		const result = mapColumns<Row>([{ accessorKey: 'age', cell: { type: 'number' } }], {
			operators: defaultOperators,
			tableOperators: true,
		})
		expect(filteringMeta(result[0])?.operators?.map((o) => o.id)).toEqual([
			'equals',
			'notEquals',
			'greaterThan',
			'greaterOrEqual',
			'lessThan',
			'lessOrEqual',
			'between',
		])
		expect(result[0]?.filterFn).toBeTypeOf('function')
	})

	it('a column narrows the inherited set with its own items', () => {
		const result = mapColumns<Row>(
			[{ accessorKey: 'name', filtering: { operators: { items: ['contains', 'equals'] } } }],
			{ operators: defaultOperators, tableOperators: true },
		)
		expect(filteringMeta(result[0])?.operators?.map((o) => o.id)).toEqual(['contains', 'equals'])
	})

	it('column operators: false opts one column out of a table-wide true', () => {
		const result = mapColumns<Row>(
			[
				{ accessorKey: 'name', filtering: { operators: false } },
				{ accessorKey: 'age', cell: { type: 'number' } },
			],
			{ operators: defaultOperators, tableOperators: true },
		)
		expect(filteringMeta(result[0])?.operators).toBeUndefined()
		expect(result[0]?.filterFn).toBeUndefined()
		expect(filteringMeta(result[1])?.operators).toBeDefined()
	})

	it('a column that turned filtering off never inherits operators', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: false }], {
			operators: defaultOperators,
			tableOperators: true,
		})
		expect(result[0]?.meta?.filtering).toBe(false)
		expect(result[0]?.filterFn).toBeUndefined()
	})

	it('a group header inherits nothing — it has no value of its own to compare', () => {
		const result = mapColumns<Row>([{ id: 'group', header: 'Group', columns: [{ accessorKey: 'name' }] }], {
			operators: defaultOperators,
			tableOperators: true,
		})
		expect(filteringMeta(result[0])?.operators).toBeUndefined()
		expect(filteringMeta(result[0]?.columns?.[0] as MappedColumnDef<Row>)?.operators).toBeDefined()
	})

	it('tableOperators: false wins over a column that asks for operators', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { operators: true } }], {
			operators: defaultOperators,
			tableOperators: false,
		})
		expect(filteringMeta(result[0])?.operators).toBeUndefined()
		expect(result[0]?.filterFn).toBeUndefined()
	})

	it('no table-level word keeps the per-column opt-in', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name' }], { operators: defaultOperators })
		expect(filteringMeta(result[0])?.operators).toBeUndefined()
	})

	// A custom cell type that declares no operators is a column where the table-wide "wherever
	// they apply" simply does not apply — a plain input, and no warning per such column.
	it('inherited operators fall back to a plain input silently for a type with no defaults', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const result = mapColumns<Row>([{ accessorKey: 'name', cell: { type: 'rating' } }], {
			operators: defaultOperators,
			tableOperators: true,
		})
		expect(filteringMeta(result[0])?.operators).toBeUndefined()
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})

describe('mapColumns — column filtering off', () => {
	type PassFn = (row: unknown, columnId: string, filterValue: unknown) => boolean

	// A seeded `columnFilters` slice must not filter a grid whose column filters are off, while
	// global search — resolved from the table, not the column — keeps working.
	it('gives every leaf a filterFn that keeps each row, operators or not', () => {
		const result = mapColumns<Row>(
			[{ accessorKey: 'name' }, { accessorKey: 'age', cell: { type: 'number' }, filtering: { operators: true } }],
			{ operators: defaultOperators, columnFiltering: false },
		)
		for (const column of result) {
			expect(column.filterFn).toBeTypeOf('function')
			expect((column.filterFn as PassFn)({}, 'name', 'no row matches this')).toBe(true)
		}
	})

	it('leaves group columns without a filterFn and reaches their leaves', () => {
		const result = mapColumns<Row>([{ header: 'Group', columns: [{ accessorKey: 'name' }] }], {
			operators: defaultOperators,
			columnFiltering: false,
		})
		expect(result[0]?.filterFn).toBeUndefined()
		expect(result[0]?.columns?.[0]?.filterFn).toBeTypeOf('function')
	})

	it('keeps the operator dispatcher while column filtering is on', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name' }], { operators: defaultOperators, columnFiltering: true })
		expect(result[0]?.filterFn).toBeUndefined()
	})
})

describe('mapColumns — header/footer renderers', () => {
	it('keeps a string header as-is', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', header: 'Name' }])
		expect(result[0]?.header).toBe('Name')
	})

	// The renderer path always worked (the adapter runs it through flexRender); only the
	// public type forbade it, so `header: () => <b>Name</b>` failed to compile.
	it('passes a header render function through untouched', () => {
		const header = vi.fn(() => 'rendered')
		const result = mapColumns<Row>([{ accessorKey: 'name', header }])
		expect(result[0]?.header).toBe(header)
	})

	it('passes a footer render function through untouched', () => {
		const footer = vi.fn(() => 'total')
		const result = mapColumns<Row>([{ accessorKey: 'age', footer }])
		expect(result[0]?.footer).toBe(footer)
	})
})

// The two arms of `BetweenOperatorConfig` cannot be checked against the column's `cell.type`,
// so the option that landed on the wrong kind of column is caught here instead.
describe('mapColumns — date presets', () => {
	it('resolves `presets: true` to the built-in ranges and single dates', () => {
		const result = mapColumns<Row>(
			[{ accessorKey: 'name', cell: { type: 'date' }, filtering: { presets: true, operators: true } }],
			{ operators: defaultOperators },
		)

		const presets = filteringMeta(result[0])?.presets
		expect(presets?.some((preset) => preset.id === 'last7' && 'getRange' in preset)).toBe(true)
		expect(presets?.some((preset) => preset.id === 'weekAgo' && 'getDate' in preset)).toBe(true)
	})

	it('keeps a custom list as it was written', () => {
		const custom = [{ id: 'q1', label: 'Q1', getRange: () => ({ from: '2026-01-01', to: '2026-03-31' }) }]
		const result = mapColumns<Row>(
			[{ accessorKey: 'name', cell: { type: 'date' }, filtering: { presets: custom, operators: true } }],
			{ operators: defaultOperators },
		)

		expect(filteringMeta(result[0])?.presets).toBe(custom)
	})

	it('resolves nothing when the column asks for no presets', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', cell: { type: 'date' }, filtering: { operators: true } }], {
			operators: defaultOperators,
		})

		expect(filteringMeta(result[0])?.presets).toBeUndefined()
	})

	it('warns and resolves nothing on a column that is not a date', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const result = mapColumns<Row>(
			[{ accessorKey: 'age', cell: { type: 'number' }, filtering: { presets: true, operators: true } }],
			{ operators: defaultOperators },
		)

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('`filtering.presets`'))
		expect(filteringMeta(result[0])?.presets).toBeUndefined()
		warn.mockRestore()
	})
})

describe('mapColumns — betweenOperator warnings', () => {
	it('warns when the slider is asked for without both bounds', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		mapColumns<Row>(
			[
				{
					accessorKey: 'age',
					cell: { type: 'number' },
					filtering: {
						defaultOperator: 'between',
						operators: { items: ['between'], betweenOperator: { slider: true, min: 0 } },
					},
				},
			],
			{ operators: defaultOperators },
		)

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('`betweenOperator.slider: true`'))
		warn.mockRestore()
	})

	it('stays quiet when each arm meets the column it belongs to', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		mapColumns<Row>(
			[
				{
					accessorKey: 'age',
					cell: { type: 'number' },
					filtering: {
						defaultOperator: 'between',
						operators: { items: ['between'], betweenOperator: { slider: true, min: 0, max: 10 } },
					},
				},
				{
					accessorKey: 'name',
					cell: { type: 'date' },
					filtering: {
						defaultOperator: 'between',
						presets: true,
						operators: { items: ['between'] },
					},
				},
			],
			{ operators: defaultOperators },
		)

		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})

describe('mapColumns — aggregation', () => {
	it('leaves `aggregationFn` unset when a column writes only a renderer', () => {
		const [column] = mapColumns<{ id: string; amount: number }>([
			{ accessorKey: 'amount', aggregation: { component: () => null } },
		])

		expect('aggregationFn' in (column as object)).toBe(false)
		expect((column as { meta?: { aggregation?: unknown } }).meta?.aggregation).toEqual({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- `expect.any()` is typed `any` by vitest
			component: expect.any(Function),
		})
	})
})

describe('mapColumns — config layers', () => {
	it('filtering.config goes into meta.filtering as written', () => {
		const config = { creatable: true }
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { config } }])
		expect(filteringMeta(result[0])?.config).toBe(config)
	})

	it('no filtering.config leaves the key out of meta.filtering', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { debounce: 0 } }])
		expect(filteringMeta(result[0])).not.toHaveProperty('config')
	})

	// The types forbid a list in a layer; a column written in JavaScript can still carry one.
	it.each(['filtering', 'editing', 'creating'] as const)(
		'warns that a list in the %s layer belongs in its own `items`',
		(surface) => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
			const column = { id: `listed-${surface}`, accessorKey: 'name', [surface]: { config: { items: [] } } }

			mapColumns<Row>([column as never])

			expect(warn).toHaveBeenCalledWith(expect.stringContaining(`Column "listed-${surface}"`))
			expect(warn).toHaveBeenCalledWith(expect.stringContaining(`\`${surface}.items\``))
			warn.mockRestore()
		},
	)

	describe('flashing', () => {
		const equals = (a: unknown, b: unknown): boolean => a === b

		it('grid true and a column without the option → the column flashes with the defaults', () => {
			const result = mapColumns<Row>([{ accessorKey: 'name' }], { tableFlashing: true })
			expect(result[0]?.meta?.flashing).toEqual({ flashDuration: 500, fadeDuration: 1000 })
		})

		it('no option anywhere → no meta.flashing', () => {
			const result = mapColumns<Row>([{ accessorKey: 'name' }])
			expect(result[0]?.meta).not.toHaveProperty('flashing')
		})

		it('column false beats a grid that is on', () => {
			const result = mapColumns<Row>([{ accessorKey: 'name', flashing: false }], { tableFlashing: true })
			expect(result[0]?.meta).not.toHaveProperty('flashing')
		})

		it('column true turns the column on under a grid that is off', () => {
			const result = mapColumns<Row>([{ accessorKey: 'name', flashing: true }, { accessorKey: 'age' }], {
				tableFlashing: false,
			})
			expect(result[0]?.meta?.flashing).toEqual({ flashDuration: 500, fadeDuration: 1000 })
			expect(result[1]?.meta).not.toHaveProperty('flashing')
		})

		it('the column object lies over the grid object key by key', () => {
			const result = mapColumns<Row>([{ accessorKey: 'name', flashing: { flashDuration: 100 } }], {
				tableFlashing: { flashDuration: 300, fadeDuration: 2000 },
			})
			expect(result[0]?.meta?.flashing).toEqual({ flashDuration: 100, fadeDuration: 2000 })
		})

		it('column true keeps the grid durations', () => {
			const result = mapColumns<Row>([{ accessorKey: 'name', flashing: true }], {
				tableFlashing: { fadeDuration: 2000 },
			})
			expect(result[0]?.meta?.flashing).toEqual({ flashDuration: 500, fadeDuration: 2000 })
		})

		it('a grid object switched off with enabled: false turns nothing on and lends no durations', () => {
			const result = mapColumns<Row>([{ accessorKey: 'name' }, { accessorKey: 'age', flashing: true }], {
				tableFlashing: { enabled: false, fadeDuration: 2000 },
			})
			expect(result[0]?.meta).not.toHaveProperty('flashing')
			expect(result[1]?.meta?.flashing).toEqual({ flashDuration: 500, fadeDuration: 1000 })
		})

		it('carries the column equals', () => {
			const result = mapColumns<Row>([{ accessorKey: 'name', flashing: { equals } }])
			expect(result[0]?.meta?.flashing?.equals).toBe(equals)
		})

		it('a group column carries nothing, its leaves resolve on their own', () => {
			const result = mapColumns<Row>([{ id: 'group', header: 'Group', columns: [{ accessorKey: 'name' }] }], {
				tableFlashing: true,
			})
			expect(result[0]?.meta).not.toHaveProperty('flashing')
			const leaves = (result[0] as { columns?: MappedColumnDef<Row>[] }).columns
			expect(leaves?.[0]?.meta?.flashing).toEqual({ flashDuration: 500, fadeDuration: 1000 })
		})
	})
})
