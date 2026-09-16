/**
 * Installing a feature's **non-function** table members, checked against the declaration that
 * promised them.
 *
 * Upstream gives a feature one installer, `assignTableAPIs`, and it installs functions only: each
 * key becomes one method with its `table_` prefix stripped. A feature whose table surface is a
 * namespace **object** — `table.ordering`, and `table.editing` / `table.creating` /
 * `table.deleting` / `table.draft` after it — cannot go through it, so the member has to be
 * assigned by hand, and by hand means a cast:
 *
 * ```ts
 * ;(table as unknown as { ordering: RowOrderingApi }).ordering = api // don't
 * ```
 *
 * That cast asserts the member name rather than checking it. Nothing ties `'ordering'` to the
 * `Table_FeatureMap` entry that declares it, so a typo compiles, installs a member nothing reads,
 * and leaves the declared one `undefined` — this migration's signature defect, and one that has
 * already produced seven instances elsewhere.
 *
 * {@link assignTableInstanceData} is that assignment with the declaration put back in front of it:
 * the members are type-checked against `Table_FeatureMap[F]`, so both the feature key and every
 * member name are compile errors when wrong.
 *
 * Call it from `initTableInstanceData`, which is upstream's hook for table-owned data and runs
 * before that feature's own `constructTableAPIs` — so a method assigned through `assignTableAPIs`
 * may rely on data installed here, but not the reverse.
 */

import type { AnyTable } from './feature-state'
import type { RowData, TableFeatures, Table_FeatureMap } from '@tanstack/table-core'

/**
 * Every feature key that declares table members.
 *
 * `Table_FeatureMap` is instantiated at its widest — the base `TableFeatures` and `RowData` — so
 * the key set is every feature's, stock and custom alike, rather than one table's.
 */
export type TableMemberFeature = keyof Table_FeatureMap<TableFeatures, RowData>

/** The members one feature declares on the table, exactly as its `Table_FeatureMap` entry says. */
export type TableMembersOf<F extends TableMemberFeature> = Table_FeatureMap<TableFeatures, RowData>[F]

/**
 * Install the table members `feature` declares.
 *
 * @param feature The key the feature registers under — the same string in `Plugins`, in
 * `assignTableAPIs`' first argument and in every `*_FeatureMap`. It is not read at runtime; it is
 * what selects the declaration the `members` argument is checked against, which is the whole point
 * of the helper. `assignTableAPIs` takes the key in the same position for the same kind of reason.
 * @param table The table handed to `initTableInstanceData`.
 * @param members Every member the feature's `Table_FeatureMap` entry declares. A misspelled key or
 * a missing member fails to compile.
 */
export function assignTableInstanceData<F extends TableMemberFeature>(
	feature: F,
	table: AnyTable,
	members: TableMembersOf<F>,
): void {
	Object.assign(table, members)
}
