import { tableFeatures } from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { creatingFeature } from './features/entry'

import { createTable, createColumns } from './index'

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
