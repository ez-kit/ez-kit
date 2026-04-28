import { describe, expect, it, vi } from 'vitest'

import { defineColumns } from '../column/define-columns'
import { createTable } from '../create-table'

interface Row {
	id: number
	name: string
}

const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = defineColumns<Row>([{ accessorKey: 'id' }, { accessorKey: 'name' }])

describe('EditingFeature', () => {
	it('initial state: not editing', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { onSave: () => true },
		})
		const state = table.getEditingState()
		expect(state.editingRowId).toBeNull()
		expect(state.editingValues).toEqual({})
		expect(state.editingCellId).toBeNull()
	})

	it('startEditing sets editingRowId and snapshots row values', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { onSave: () => true },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.startEditing(rowId)
		const state = table.getEditingState()
		expect(state.editingRowId).toBe(rowId)
		expect(state.editingValues.name).toBe('Alice')
	})

	it('row.getIsEditing() returns true only for the editing row', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { onSave: () => true },
		})
		const rows = table.getRowModel().rows
		const firstId = rows[0]?.id ?? '0'
		table.startEditing(firstId)
		expect(rows[0]?.getIsEditing()).toBe(true)
		expect(rows[1]?.getIsEditing()).toBe(false)
	})

	it('cancelEditing resets state', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { onSave: () => true },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.startEditing(rowId)
		table.cancelEditing()
		expect(table.getEditingState().editingRowId).toBeNull()
	})

	it('commitEditing calls onSave and resets on true', async () => {
		const onSave = vi.fn().mockResolvedValue(true)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { onSave },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.startEditing(rowId)
		table.setEditingValue('name', 'AliceEdited')
		await table.commitEditing()
		expect(onSave).toHaveBeenCalledWith(rowId, expect.objectContaining({ name: 'AliceEdited' }))
		expect(table.getEditingState().editingRowId).toBeNull()
	})

	it('commitEditing keeps form open when onSave returns false', async () => {
		const onSave = vi.fn().mockResolvedValue(false)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { onSave },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.startEditing(rowId)
		await table.commitEditing()
		expect(table.getEditingState().editingRowId).toBe(rowId)
	})

	it('commitEditing passes domain row id to onSave when using default getRowId', async () => {
		const onSave = vi.fn().mockResolvedValue(true)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { onSave },
		})
		// With default getRowId, row IDs are "1" and "2" (from row.id), not "0" and "1" (indices)
		const rows = table.getRowModel().rows
		expect(rows[0]?.id).toBe('1')
		expect(rows[1]?.id).toBe('2')

		table.startEditing('2') // Bob
		table.setEditingValue('name', 'BobEdited')
		await table.commitEditing()

		expect(onSave).toHaveBeenCalledWith('2', expect.objectContaining({ name: 'BobEdited' }))
	})

	it('cell mode: startCellEditing sets editingCellId', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'cell', onSave: () => true },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.startCellEditing(rowId, 'name')
		const state = table.getEditingState()
		expect(state.editingRowId).toBe(rowId)
		expect(state.editingCellId).toBe(`${rowId}_name`)
	})

	it('cell mode: commitCellEditing saves only the cell column', async () => {
		const onSave = vi.fn().mockResolvedValue(true)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'cell', onSave },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.startCellEditing(rowId, 'name')
		table.setEditingValue('name', 'AliceCell')
		await table.commitCellEditing()
		expect(onSave).toHaveBeenCalledWith(rowId, { name: 'AliceCell' })
		expect(table.getEditingState().editingRowId).toBeNull()
	})
})
