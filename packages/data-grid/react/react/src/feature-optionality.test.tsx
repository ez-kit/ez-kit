import {
	columnFilteringFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createSortedRowModel,
	creatingFeature,
	deletingFeature,
	draftFeature,
	editingFeature,
	infiniteFeature,
	loadingFeature,
	rowSelectionFeature,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { describe, expect, it, vi } from 'vitest'

import { DataGrid } from './data-grid/data-grid'
import { renderGrid } from './test-utils'

import type { GridFeatures } from './types'

/**
 * Design D1's central claim, held still: **a feature you do not register costs nothing.**
 *
 * The React adapter falsified it. Several reads on the default render path were unconditional
 * property accesses into a state slice, or calls to a method, that only exist once a particular
 * feature is registered — so a grid with no infinite scroll configured still needed
 * `infiniteFeature`, and a read-only grid still needed `creatingFeature`, or it threw on mount.
 *
 * Each case below **builds a grid without one feature and renders it**, which is the only thing
 * that settles this. The list these guards came from was assembled twice by reading call sites,
 * and both times it was short: `getCanResize` was missed the first time and `infiniteFeature`
 * the second, because `use-infinite-scroll.ts` reads like infinite-scroll code — it is — and
 * nothing about it says `<LoadMoreFooter />` mounts on every grid.
 *
 * The three that stay mandatory are **structural**, not defects, and are asserted as such at the
 * bottom: the shell lays out a column grid, so it needs widths and pin groups to lay out.
 * Resizing is an interaction rather than a layout input, which is why it sits with the guards.
 */

/** Every feature the adapter's default render path touches. */
const BASE = {
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnResizingFeature,
	rowSortingFeature,
	loadingFeature,
	creatingFeature,
	infiniteFeature,
	rowSelectionFeature,
	editingFeature,
	deletingFeature,
}

/**
 * The base set minus one member — the shape each case is built on.
 *
 * The row model goes with `rowSortingFeature`: core's types brand `sortedRowModel` as an error
 * unless the feature it drives is registered, and a row model with no feature is not the thing
 * under test here.
 */
function withoutFeature(name: keyof typeof BASE) {
	const { [name]: _dropped, ...rest } = BASE
	const withModel = name === 'rowSortingFeature' ? rest : { ...rest, sortedRowModel: createSortedRowModel() }
	return tableFeatures(withModel) as unknown as GridFeatures
}

/**
 * Every feature the default render path reached unconditionally, and therefore required.
 *
 * The last three were **not** on the list this work started from. They came out of running the
 * cases below rather than out of reading: `rowSelectionFeature` because `row.tsx` calls
 * `getIsSelected()` for every row (the sweep looked at the selection *column* and found that path
 * properly conditional), `editingFeature` because `cell.tsx`'s `isEditing` selector runs for every
 * body cell, and `deletingFeature` because `ConfirmDialogRenderer`'s two hooks necessarily run
 * before its own early-return gate.
 */
const OPTIONAL = [
	'columnResizingFeature',
	'rowSortingFeature',
	'loadingFeature',
	'creatingFeature',
	'infiniteFeature',
	'rowSelectionFeature',
	'editingFeature',
	'deletingFeature',
] as const satisfies readonly (keyof typeof BASE)[]

describe('a feature the consumer did not register costs nothing', () => {
	for (const name of OPTIONAL) {
		it(`renders a grid built without ${name}`, () => {
			expect(() => renderGrid({ features: withoutFeature(name) })).not.toThrow()
		})
	}

	// The guards must not change what a grid that DOES register the feature does. Rendering the
	// full set through the same harness is the control: if `?? false` had started winning over a
	// registered slice, the rows would not be here.
	it('renders the same grid with every one of them registered', () => {
		const { getAllByText } = renderGrid({
			features: tableFeatures({ ...BASE, sortedRowModel: createSortedRowModel() }) as unknown as GridFeatures,
		})

		expect(getAllByText('Alice').length).toBeGreaterThan(0)
	})
})

describe('the structural base is structural', () => {
	// Not a defect and not guarded: the shell lays out a column grid, so it needs the column
	// widths and the pin groups to lay it out with. Asserted rather than asserted-in-prose so
	// that "why is this one required and that one not" has an answer a reader can run.
	for (const name of ['columnVisibilityFeature', 'columnPinningFeature', 'columnSizingFeature'] as const) {
		it(`still requires ${name}`, () => {
			expect(() => renderGrid({ features: withoutFeature(name) })).toThrow()
		})
	}
})

describe('the row-actions column does not require the editing feature', () => {
	// `ActionsCell` mounts whenever the row-actions column exists — which is whenever `editing`,
	// `deleting`, row `pinning` or `rowActions.actions` is configured, not only `editing`. Its two
	// `s.editing.…` reads therefore ran on a delete-only grid and threw before the table mounted.
	//
	// This case is what the `withoutFeature` cases above structurally cannot reach: they render a
	// grid with no row-actions column at all, so nothing mounts `ActionsCell`. Configuring
	// `deleting` is what puts it on the page.
	it('renders a delete-only grid built without editingFeature', () => {
		expect(() =>
			renderGrid({
				features: withoutFeature('editingFeature'),
				deleting: { onDelete: vi.fn() },
			}),
		).not.toThrow()
	})

	// The control: with `editingFeature` registered the same grid still renders, so the guards did
	// not trade a throw for a silently missing affordance.
	it('renders the same grid with editingFeature registered', () => {
		expect(() =>
			renderGrid({
				features: tableFeatures({ ...BASE, sortedRowModel: createSortedRowModel() }) as unknown as GridFeatures,
				deleting: { onDelete: vi.fn() },
			}),
		).not.toThrow()
	})
})

describe('the active-filters chips strip does not require the draft feature', () => {
	/**
	 * The chips strip mounts only when filtering is configured **and** a filter is active, which is
	 * why neither the `withoutFeature` cases nor the row-actions case above can reach it — the same
	 * structural reason, a third time.
	 *
	 * `s.applied` is `draftFeature`'s slice. `active-filters-bar.tsx` guarded its *use* with
	 * `isDrafting` but dereferenced it unconditionally one line earlier, so under v9 — where the
	 * slice is absent rather than merely empty — a chips strip on a grid without `draft` threw
	 * before `isDrafting` was ever consulted.
	 */
	const FILTERING = {
		...BASE,
		columnFilteringFeature,
		filteredRowModel: createFilteredRowModel(),
		sortedRowModel: createSortedRowModel(),
	}

	function renderChips(features: GridFeatures) {
		return renderGrid(
			{
				filtering: true,
				features,
				// An active filter is what gives the strip a chip to render, without which this case
				// renders a grid with no strip on it and proves nothing.
				initialState: { columnFilters: [{ id: 'name', value: 'Al' }] },
			},
			// Composed, not configured: `filtering: { chips: … }` used to mount the strip, and
			// writing the component is what mounts it now.
			<DataGrid.ActiveFiltersBar />,
		)
	}

	it('renders a filtered grid built without draftFeature', () => {
		const { container } = renderChips(tableFeatures(FILTERING))

		// Asserted, not assumed: a case that renders no strip would pass a bare `not.toThrow()`
		// while reaching none of the code it exists for.
		expect(container.querySelector("[data-slot='active-filters-bar']")).not.toBeNull()
	})

	// The control: with `draftFeature` registered the same grid still renders its chips.
	it('renders the same grid with draftFeature registered', () => {
		const { container } = renderChips(tableFeatures({ ...FILTERING, draftFeature }))

		expect(container.querySelector("[data-slot='active-filters-bar']")).not.toBeNull()
	})
})
