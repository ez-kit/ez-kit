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
		const passedName = (onDelete.mock.calls[0]?.[0] as { original: Row }).original.name
		expect(passedName).toBe('Alice')
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
