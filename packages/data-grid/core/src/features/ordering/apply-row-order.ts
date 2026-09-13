/**
 * `data` reordered to match `order`, for an adapter rendering an uncontrolled row order.
 *
 * Reordering happens **upstream of the table** rather than inside a row model: TanStack has no
 * row-order feature to extend, and rebuilding `data` leaves every row model, every row id and
 * every other state slice untouched.
 *
 * The rule that matters is what happens to a row **absent** from `order` — a row the server
 * has just added. It keeps its declared position rather than being appended: a new row
 * appearing at the bottom of a list the user has arranged is indistinguishable from the
 * reorder having gone wrong.
 *
 * So the ordered rows are dealt back into the slots those same rows already occupied, in
 * ascending order, and every other slot keeps the row `data` put there. Ids naming no row in
 * `data` are dropped.
 */
export function applyRowOrder<TRow>(
	data: readonly TRow[],
	order: readonly string[],
	getRowId: (row: TRow, index: number) => string,
): TRow[] {
	if (order.length === 0) return [...data]

	const indexById = new Map<string, number>()
	data.forEach((row, index) => indexById.set(getRowId(row, index), index))

	const sources = order.map((rowId) => indexById.get(rowId)).filter((index): index is number => index !== undefined)
	const slots = [...sources].sort((a, b) => a - b)

	const next = [...data]
	sources.forEach((sourceIndex, position) => {
		const slot = slots[position]
		const row = data[sourceIndex]
		if (slot === undefined || row === undefined) return
		next[slot] = row
	})
	return next
}
