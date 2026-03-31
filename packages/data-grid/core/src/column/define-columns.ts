import type { ColumnDef } from './types'

/**
 * Typed identity helper — infers TRow from the array, returns the same array unchanged.
 *
 * @example
 * const columns = defineColumns<User>([
 *   { accessorKey: 'name', header: 'Name' },
 * ])
 */
export function defineColumns<TRow extends object>(
  defs: ColumnDef<TRow>[],
): ColumnDef<TRow>[] {
  return defs
}
