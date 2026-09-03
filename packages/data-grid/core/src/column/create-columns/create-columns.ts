import type { BaseCellTypes, CellTypeRegistryShape, ColumnDef } from '../types'

/**
 * Typed identity helper — infers TRow from the array, returns the same array unchanged.
 *
 * @example
 * const columns = createColumns<User>([
 *   { accessorKey: 'name', header: 'Name' },
 * ])
 */
export function createColumns<
	TRow extends object,
	TCellTypes extends CellTypeRegistryShape = BaseCellTypes,
	TNode = unknown,
>(defs: ColumnDef<TRow, TCellTypes, TNode>[]): ColumnDef<TRow, TCellTypes, TNode>[] {
	return defs
}
