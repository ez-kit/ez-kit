import type { ColumnSort } from '@tanstack/table-core'

/**
 * The sort with the entry for `sourceId` moved to where `targetId` stands, each entry keeping its
 * direction — or `null` when either id is not in the sort, or they are the same.
 *
 * The arithmetic is the one `dropColumn` and `applyRowMove` use: the source is spliced out and back
 * in at the target's index **in the list as it stood before the splice**, so the source lands
 * exactly where the target was. The drop announcement derives its sentence from that rule rather
 * than reading the state back — see `dnd-announcements.ts`.
 *
 * A column id appears in a sort at most once — the builder never offers a duplicate — so an id
 * names an entry.
 */
export function moveSortEntry(sorting: readonly ColumnSort[], sourceId: string, targetId: string): ColumnSort[] | null {
	const from = sorting.findIndex((entry) => entry.id === sourceId)
	const to = sorting.findIndex((entry) => entry.id === targetId)
	const source = sorting[from]
	if (source === undefined || to < 0 || from === to) return null

	const rest = sorting.filter((_, i) => i !== from)
	return [...rest.slice(0, to), source, ...rest.slice(to)]
}

/** The sort with the entries at `from` and `to` exchanged, each keeping its direction. */
export function swapSortEntries(sorting: readonly ColumnSort[], from: number, to: number): ColumnSort[] {
	const source = sorting[from]
	const target = sorting[to]
	if (source === undefined || target === undefined) return [...sorting]
	return sorting.map((entry, i) => (i === from ? target : i === to ? source : entry))
}

/**
 * How many entries stand where the grid would not put them: a column outside multi-sort
 * (`sorting: { multi: false }`) belongs first and nowhere else, because a header click on such a
 * column replaces the sort rather than joining it.
 */
function misplacedEntries(sorting: readonly ColumnSort[], canMultiSort: (columnId: string) => boolean): number {
	return sorting.filter((entry, i) => i > 0 && !canMultiSort(entry.id)).length
}

/**
 * Whether reordering `current` into `next` is allowed: it may not push one more column outside
 * multi-sort below the first place. Compared against the current sort rather than judged alone, so a
 * sort that arrived already out of shape — restored state, a Shift-click with `multi` unwritten —
 * still lets the user rearrange the rest of it.
 */
export function isAllowedReorder(
	current: readonly ColumnSort[],
	next: readonly ColumnSort[],
	canMultiSort: (columnId: string) => boolean,
): boolean {
	return misplacedEntries(next, canMultiSort) <= misplacedEntries(current, canMultiSort)
}

/** The slice of a table {@link dropSortEntry} reads. */
type SortDropTable = {
	store: { state: { sorting: ColumnSort[] } }
	getColumn: (columnId: string) => { getCanMultiSort: () => boolean } | undefined
}

/**
 * What a drop of one sort entry onto another commits, or `null` when it commits nothing: a self-drop,
 * an id the sort does not hold, or a reorder {@link isAllowedReorder} refuses. One function for the
 * hover gate, the commit and the drop announcement, so the three cannot disagree.
 */
export function dropSortEntry(table: SortDropTable, sourceId: string, targetId: string): ColumnSort[] | null {
	const current = table.store.state.sorting
	const next = moveSortEntry(current, sourceId, targetId)
	if (!next) return null
	const canMultiSort = (columnId: string) => table.getColumn(columnId)?.getCanMultiSort() ?? false
	return isAllowedReorder(current, next, canMultiSort) ? next : null
}
