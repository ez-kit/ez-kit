import type {
	BaseCellTypes,
	CellTypeRegistryShape,
	ColumnConfigShape,
	ColumnDef,
	UncheckedColumnConfig,
} from '../types'

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
	TColumnConfig extends ColumnConfigShape = UncheckedColumnConfig,
>(defs: ColumnDef<TRow, TCellTypes, TNode, TColumnConfig>[]): ColumnDef<TRow, TCellTypes, TNode, TColumnConfig>[] {
	return defs
}
