import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'

type Row = {
	id: number
	name: string
}

const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = createColumns<Row>([{ accessorKey: 'name' }])

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

	it('requestBulkDelete stages a bulk delete when bulk.confirmation is set', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: vi.fn(), bulk: { confirmation: true } },
		})
		table.setState((prev) => ({ ...prev, rowSelection: { '1': true } }))
		table.requestBulkDelete()
		expect(table.getState().pendingBulkDelete).toBe(true)
	})

	it('requestBulkDelete deletes outright when bulk asks for no confirmation', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete, bulk: true },
		})
		table.setState((prev) => ({ ...prev, rowSelection: { '1': true, '2': true } }))
		table.requestBulkDelete()
		await vi.waitFor(() => {
			expect(onDelete).toHaveBeenCalledTimes(2)
		})
		expect(table.getState().pendingBulkDelete).toBe(false)
	})

	it('requestBulkDelete does nothing when bulk is off', () => {
		const onDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete },
		})
		table.setState((prev) => ({ ...prev, rowSelection: { '1': true } }))
		table.requestBulkDelete()
		expect(table.getState().pendingBulkDelete).toBe(false)
		expect(onDelete).not.toHaveBeenCalled()
	})

	it('confirmBulkDelete runs the bulk handler and clears the staged flag', async () => {
		const bulkDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: vi.fn(), bulk: { onDelete: bulkDelete, confirmation: true } },
		})
		table.setState((prev) => ({ ...prev, rowSelection: { '1': true } }))
		table.requestBulkDelete()
		await table.confirmBulkDelete()
		expect(bulkDelete).toHaveBeenCalledOnce()
		expect(table.getState().pendingBulkDelete).toBe(false)
	})

	it('deselects the deleted rows once the bulk handler resolves', async () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: vi.fn(), bulk: { onDelete: vi.fn() } },
		})
		table.setState((prev) => ({ ...prev, rowSelection: { '1': true, '2': true } }))
		await table.deleteRows(['1'])
		expect(table.getState().rowSelection).toEqual({ '2': true })
	})

	it('cancelBulkDelete clears the staged bulk delete without running the handler', () => {
		const bulkDelete = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: vi.fn(), bulk: { onDelete: bulkDelete, confirmation: true } },
		})
		table.setState((prev) => ({ ...prev, rowSelection: { '1': true } }))
		table.requestBulkDelete()
		table.cancelBulkDelete()
		expect(table.getState().pendingBulkDelete).toBe(false)
		expect(bulkDelete).not.toHaveBeenCalled()
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
