import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineColumns } from './column/define-columns'
import { createTypedDataGrid } from './typed-data-grid'

type User = {
	id: number
	name: string
	age: number
	email: string
}

const USERS: User[] = [{ id: 1, name: 'Alice', age: 30, email: 'a@b.co' }]
const COLUMNS = defineColumns<User>([
	{ accessorKey: 'name' },
	{ accessorKey: 'age' },
	{ accessorKey: 'email' },
])

describe('createTypedDataGrid<TData> — types', () => {
	it('creating.setValue is keyed and value-typed', () => {
		const grid = createTypedDataGrid<User>().create({
			data: USERS,
			columns: COLUMNS,
			creating: { onSave: () => Promise.resolve() },
		})

		expectTypeOf(grid.creating.setValue).parameter(0).toEqualTypeOf<'id' | 'name' | 'age' | 'email'>()

		grid.creating.setValue('name', 'Alice') // ok
		grid.creating.setValue('age', 42) // ok

		// @ts-expect-error — invalid key
		grid.creating.setValue('emial', 'a@b.co')

		// @ts-expect-error — wrong value type
		grid.creating.setValue('age', 'thirty')

		// @ts-expect-error — wrong value type for name
		grid.creating.setValue('name', 42)
	})

	it('creating.getState().values is Partial<TData>', () => {
		const grid = createTypedDataGrid<User>().create({
			data: USERS,
			columns: COLUMNS,
			creating: { onSave: () => Promise.resolve() },
		})
		const values = grid.creating.getState().values
		expectTypeOf(values).toEqualTypeOf<Partial<User>>()
	})

	it('editing.setValue is keyed and value-typed', () => {
		const grid = createTypedDataGrid<User>().create({
			data: USERS,
			columns: COLUMNS,
			editing: { onSave: () => Promise.resolve() },
		})

		grid.editing.setValue('name', 'Bob') // ok
		grid.editing.setValue('age', 99) // ok

		// @ts-expect-error — invalid key
		grid.editing.setValue('badKey', 'x')

		// @ts-expect-error — wrong value type
		grid.editing.setValue('age', 'old')
	})

	it('editing.startCell columnId is keyof TData', () => {
		const grid = createTypedDataGrid<User>().create({
			data: USERS,
			columns: COLUMNS,
			editing: { mode: 'cell', onSave: () => Promise.resolve() },
		})

		grid.editing.startCell('1', 'name') // ok

		// @ts-expect-error — invalid column id
		grid.editing.startCell('1', 'unknown')
	})
})

describe('createTypedDataGrid — runtime', () => {
	it('delegates to createTable: creating namespace works as expected', () => {
		const grid = createTypedDataGrid<User>().create({
			data: USERS,
			columns: COLUMNS,
			creating: { onSave: () => Promise.resolve() },
		})
		expect(grid.creating.getState().isOpen).toBe(false)
		grid.creating.start()
		expect(grid.creating.getState().isOpen).toBe(true)
		grid.creating.setValue('name', 'Carol')
		expect(grid.creating.getState().values.name).toBe('Carol')
	})

	it('delegates to createTable: editing namespace works as expected', () => {
		const grid = createTypedDataGrid<User>().create({
			data: USERS,
			columns: COLUMNS,
			editing: { onSave: () => Promise.resolve() },
		})
		grid.editing.start('1')
		expect(grid.editing.getState().rowId).toBe('1')
		expect(grid.editing.getState().values.name).toBe('Alice')
	})
})
