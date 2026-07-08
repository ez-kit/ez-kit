import { describe, expect, it, vi } from 'vitest'

import { defineColumns } from '../../column/define-columns'
import { createTable } from '../../create-table'

type Row = {
	id: number
	name: string
}

const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = defineColumns<Row>([{ accessorKey: 'name' }])

describe('DeletingFeature', () => {
	it('deleteRow calls onDelete with the correct row', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		await table.deleteRow(rowId)
		expect(onDelete).toHaveBeenCalledTimes(1)
		const ctx = onDelete.mock.calls[0]?.[0] as { rowId: string; row: { original: Row }; signal: AbortSignal }
		expect(ctx.rowId).toBe(rowId)
		expect(ctx.row.original.name).toBe('Alice')
		expect(ctx.signal).toBeInstanceOf(AbortSignal)
	})

	it('deleteRow does nothing when deleting config is absent', async () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		await expect(table.deleteRow('0')).resolves.toBeUndefined()
	})

	it('deleteRow does nothing for unknown rowId', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete },
		})
		await table.deleteRow('non-existent')
		expect(onDelete).not.toHaveBeenCalled()
	})
})

describe('DeletingFeature — confirmation flow', () => {
	it('initializes pendingDeleteRowId to null', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: vi.fn() },
		})
		expect(table.getState().pendingDeleteRowId).toBeNull()
	})

	it('requestDeleteRow with confirmation stages the row without deleting', () => {
		const onDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: true },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.requestDeleteRow(rowId)
		expect(table.getState().pendingDeleteRowId).toBe(rowId)
		expect(onDelete).not.toHaveBeenCalled()
	})

	it('requestDeleteRow with confirmation object also stages the row', () => {
		const onDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: { title: 'Delete?' } },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.requestDeleteRow(rowId)
		expect(table.getState().pendingDeleteRowId).toBe(rowId)
		expect(onDelete).not.toHaveBeenCalled()
	})

	it('requestDeleteRow without confirmation deletes immediately', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.requestDeleteRow(rowId)
		await Promise.resolve()
		expect(table.getState().pendingDeleteRowId).toBeNull()
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect((onDelete.mock.calls[0]?.[0] as { rowId: string }).rowId).toBe(rowId)
	})

	it('requestDeleteRow does nothing when deleting config is absent', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(() => {
			table.requestDeleteRow('0')
		}).not.toThrow()
		expect(table.getState().pendingDeleteRowId).toBeNull()
	})

	it('confirmDeleteRow deletes the staged row and clears pending state', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: true },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.requestDeleteRow(rowId)
		await table.confirmDeleteRow()
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect((onDelete.mock.calls[0]?.[0] as { rowId: string }).rowId).toBe(rowId)
		expect(table.getState().pendingDeleteRowId).toBeNull()
	})

	it('confirmDeleteRow is a no-op when nothing is staged', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: true },
		})
		await table.confirmDeleteRow()
		expect(onDelete).not.toHaveBeenCalled()
		expect(table.getState().pendingDeleteRowId).toBeNull()
	})

	it('cancelDeleteRow clears pending state without deleting', () => {
		const onDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: true },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.requestDeleteRow(rowId)
		table.cancelDeleteRow()
		expect(table.getState().pendingDeleteRowId).toBeNull()
		expect(onDelete).not.toHaveBeenCalled()
	})

	it('initializes pendingBulkDelete to false', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: vi.fn() },
		})
		expect(table.getState().pendingBulkDelete).toBe(false)
	})

	it('requestBulkDelete stages a bulk delete', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: vi.fn() },
		})
		table.requestBulkDelete()
		expect(table.getState().pendingBulkDelete).toBe(true)
	})

	it('confirmBulkDelete clears the staged bulk delete', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: vi.fn() },
		})
		table.requestBulkDelete()
		table.confirmBulkDelete()
		expect(table.getState().pendingBulkDelete).toBe(false)
	})

	it('cancelBulkDelete clears the staged bulk delete', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: vi.fn() },
		})
		table.requestBulkDelete()
		table.cancelBulkDelete()
		expect(table.getState().pendingBulkDelete).toBe(false)
	})

	it('cancelDeleteRow aborts the in-flight delete signal', () => {
		let captured: AbortSignal | undefined
		const onDelete = vi.fn((ctx: { signal: AbortSignal }) => {
			captured = ctx.signal
			return new Promise<void>(() => {
				/* never resolves — simulates a slow delete */
			})
		})
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		void table.deleteRow(rowId)
		expect(captured?.aborted).toBe(false)
		table.cancelDeleteRow()
		expect(captured?.aborted).toBe(true)
	})
})
