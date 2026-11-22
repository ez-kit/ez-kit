import type { Row, RowData, TableFeatures } from '@tanstack/table-core'

type RowModelRow = Row<TableFeatures, RowData>

type WriteContext = {
	options: object
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
