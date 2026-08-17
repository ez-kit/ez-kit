import type { ColumnDef } from '../types'

/**
 * Typed identity helper — infers TRow from the array, returns the same array unchanged.
 *
 * @example
 * const columns = createColumns<User>([
 *   { accessorKey: 'name', header: 'Name' },
 * ])
 */
export function createColumns<TRow extends object, TCustomCellTypes extends string = never>(
	defs: ColumnDef<TRow, TCustomCellTypes>[],
): ColumnDef<TRow, TCustomCellTypes>[] {
	return defs
}
