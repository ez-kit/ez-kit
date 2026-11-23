import type { Column, Row, RowData, TableFeatures } from '@tanstack/table-core'

type RowModelRow = Row<TableFeatures, RowData>

type WriteContext = {
	options: object
	columns: readonly Column<TableFeatures, RowData>[]
	flatColumns: readonly Column<TableFeatures, RowData>[]
	rows: readonly RowModelRow[]
	rowsById: Readonly<Record<string, RowModelRow>>
	scope: string
	selectionReady: boolean
}

// React's table view and its core instance share the same store.
const contexts = new WeakMap<object, WriteContext>()
function instanceKey(table: object): object {
	return (table as { store?: object }).store ?? table
}

/** @internal Publish the write context of the render that actually committed. */
export function publishGridWriteContext(table: object, context: WriteContext): () => void {
	const key = instanceKey(table)
	contexts.set(key, context)
	return () => {
		if (contexts.get(key) === context) contexts.delete(key)
	}
}

export function gridWriteContext(table: object): WriteContext | undefined {
	return contexts.get(instanceKey(table))
}

const rowOptionKeys = ['data', 'columns', 'editing', 'deleting'] as const

export function hasPendingGridOptions(current: object, context: WriteContext): boolean {
	const next = current as Record<string, unknown>
	const committed = context.options as Record<string, unknown>
	return rowOptionKeys.some((key) => next[key] !== committed[key])
}

export function gridActionRows<R>(table: { options: object; getRowModel: () => { rows: readonly R[] } }) {
	const context = gridWriteContext(table)
	// Expansion and other store updates can change the visible rows without a React render.
	// Use the snapshot only while render-phase options differ from the committed config.
	return context && hasPendingGridOptions(table.options, context) ? context.rows : table.getRowModel().rows
}
