import type { ColumnDef } from '../types'

/**
 * Typed identity helper — infers TRow from the array, returns the same array unchanged.
 *
 * @example
 * const columns = createColumns<User>([
 *   { accessorKey: 'name', header: 'Name' },
 * ])
 */
export function createColumns<TRow extends object, TCustomCellTypes extends string = never, TNode = unknown>(
	defs: ColumnDef<TRow, TCustomCellTypes, TNode>[],
): ColumnDef<TRow, TCustomCellTypes, TNode>[] {
	return defs
}
