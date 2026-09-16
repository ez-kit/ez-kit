import { tableFeatures } from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { creatingFeature, deletingFeature } from './features/entry'
import { ACTIONS_COLUMN_ID } from './system-columns'

import { createTable, createColumns, createTableOptions } from './index'

type User = {
	id: number
	name: string
	age: number
}

/** Nothing registered: these cases are about row identity, `setData` and the store, not a feature. */
const NONE = tableFeatures({})

const USERS: User[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 25 },
]

describe('@ez-kit/data-grid-core', () => {
	it('exports createTable and createColumns', () => {
		expect(createTable).toBeTypeOf('function')
		expect(createColumns).toBeTypeOf('function')
	})

	it('createTable returns a table with rows', () => {
		const table = createTable({
			features: NONE,
			data: USERS,
			columns: createColumns<User>([
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'age', header: 'Age' },
			]),
		})
		expect(table.getRowModel().rows).toHaveLength(2)
	})

	it('setData updates the rows', () => {
		const table = createTable({
			features: NONE,
			data: USERS,
			columns: createColumns<User>([{ accessorKey: 'name' }]),
		})
		table.setData([{ id: 3, name: 'Carol', age: 28 }])
		expect(table.getRowModel().rows).toHaveLength(1)
		expect(table.getRowModel().rows[0]?.getValue('name')).toBe('Carol')
	})

	it('default getRowId uses row.id field as row identifier', () => {
		const table = createTable({
			features: NONE,
			data: USERS,
			columns: createColumns<User>([{ accessorKey: 'name' }]),
		})
		const rows = table.getRowModel().rows
		expect(rows[0]?.id).toBe('1')
		expect(rows[1]?.id).toBe('2')
	})

	it('default getRowId falls back to array index when row has no id field', () => {
		type NoIdRow = {
			name: string
		}
		const data: NoIdRow[] = [{ name: 'Alice' }, { name: 'Bob' }]
		const table = createTable({
			features: NONE,
			data,
			columns: createColumns<NoIdRow>([{ accessorKey: 'name' }]),
		})
		const rows = table.getRowModel().rows
		expect(rows[0]?.id).toBe('0')
		expect(rows[1]?.id).toBe('1')
	})

	it('custom getRowId overrides default', () => {
		const table = createTable({
			features: NONE,
			data: USERS,
			columns: createColumns<User>([{ accessorKey: 'name' }]),
			getRowId: (row) => `user-${String(row.id)}`,
		})
		const rows = table.getRowModel().rows
		expect(rows[0]?.id).toBe('user-1')
		expect(rows[1]?.id).toBe('user-2')
	})

	it('table.store fires on state change', () => {
		const table = createTable({
			// The one case here that needs a feature registered: it changes state to observe the
			// store, and `creating.start()` is the change it makes. Under v9 `table.creating`
			// exists only when `creatingFeature` is in the set.
			features: tableFeatures({ creatingFeature }),
			data: USERS,
			columns: createColumns<User>([{ accessorKey: 'name' }]),
			creating: { onSave: () => Promise.resolve() },
		})
		const before = table.store.state
		let fired = false
		table.store.subscribe(() => {
			fired = true
		})
		table.creating.start()
		expect(fired).toBe(true)
		expect(table.store.state).not.toBe(before)
	})
})

// D3's hybrid packaging: core ships both a constructor and a pure options resolver, and the
// second is what a framework adapter needs — `useDataGrid` hands the options to `useTable` rather
// than calling `createTable` from inside a hook. It was internal until the whole-branch review
// found it on neither entry point.
describe('createTableOptions is part of the public surface', () => {
	it('is exported from the main entry and resolves a config without constructing a table', () => {
		const { options, grid, deferred, bindStateHandlers } = createTableOptions({
			features: NONE,
			data: USERS,
			columns: createColumns<User>([{ accessorKey: 'name' }]),
		})

		// The four members PR 2 needs, and the property that makes it worth exporting at all:
		// it resolved the config and built no table.
		expect(options.data).toBe(USERS)
		expect(grid.direction).toBeDefined()
		expect(deferred).toBe(false)
		expect(typeof bindStateHandlers).toBe('function')
		expect(options).not.toHaveProperty('getRowModel')
	})

	it('resolves the same table `createTable` would have built — the premise of handing them on', () => {
		// The drift this guards is `createTable` ceasing to route through `createTableOptions`, or
		// resolving something differently on the way. So the config exercises *resolution* rather
		// than pass-through: `deleting` mounts the `__actions__` system column, which the resolver
		// synthesises, and `getRowId` is left out so the derived default is compared by behaviour
		// rather than by reference.
		const config = {
			features: tableFeatures({ deletingFeature }),
			data: USERS,
			columns: createColumns<User>([{ accessorKey: 'name' }]),
			deleting: { onDelete: () => undefined },
		}
		const { options } = createTableOptions(config)
		const direct = createTable(config)

		expect(options.columns.map((c) => c.id)).toEqual(direct.options.columns.map((c) => c.id))
		expect(options.columns.some((c) => c.id === ACTIONS_COLUMN_ID)).toBe(true)
		// Against the ids the constructed table actually uses, rather than against the other
		// `getRowId` reference: this is the observable the adapter depends on, and it holds for
		// every row rather than for one sample that could agree by coincidence.
		expect(direct.getRowModel().rows.map((row) => row.id)).toEqual(
			USERS.map((row, index) => options.getRowId(row, index)),
		)
	})
})

// The main entry and `/features` divide the package: values that go *into* a feature set belong
// to `/features`, everything else to the root. The split is what lets a consumer import
// `createTable` without reaching any feature module, which is the reachability the tree-shaking
// cases in PR 4 measure.
describe('the main entry and the /features entry do not overlap', () => {
	it('keeps feature values off the main entry — they belong to /features', async () => {
		const main = await import('./index')
		expect(Object.keys(main).filter((name) => name.endsWith('Feature'))).toEqual([])
	})

	it('keeps the all-in set off it too — naming it from here would defeat the split', async () => {
		const main = await import('./index')
		expect(main).not.toHaveProperty('allDataGridFeatures')
	})
})
