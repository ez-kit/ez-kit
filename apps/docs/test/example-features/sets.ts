import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

/**
 * The three features the React adapter calls into on every grid, whatever the config says.
 *
 * Structural rather than incidental: the grid lays rows out on a CSS column grid, so it cannot
 * render until it knows each column's width, visibility and pin group. `getColumnSizeVars` and
 * `getGridTemplateColumns` (`utils/column-size-vars.ts`) read `header.getSize()`, `column.getSize()`,
 * `column.getIsPinned()` and `table.getVisibleLeafColumns()`; `getVisualLeafColumns`
 * (`utils/visual-column-order.ts`) orders each row's cells through the three pin-group getters.
 * Core's `REQUIRED_FEATURE` guard cannot see any of it, because none of the three is asked for by a
 * config key.
 *
 * **This list was eight for part of an afternoon, and the history is the useful part.** The adapter
 * also read `state.loading.isPending`, `state.creating.isOpen`, `state.infinite.isFetchingNextPage`,
 * `state.editing.rowId`, `state.deleting.pendingRowId` and `row.getIsSelected()` without guarding
 * them, so a grid that did not register those features crashed. Each of those was a missing `?.`
 * rather than a real requirement, and all of them are now guarded — so the number came back down to
 * the three that are genuinely structural. If it ever grows again, suspect an unguarded read before
 * accepting a new requirement.
 */
export const BASE_FEATURES = ['columnVisibilityFeature', 'columnPinningFeature', 'columnSizingFeature'] as const

/**
 * Config key → the feature-set members a grid writing that key needs.
 *
 * A superset of core's `REQUIRED_FEATURE`, which is one config key to one *feature*. Two other
 * kinds of member hide behind the same config key, and both fail silently:
 *
 * - **Row models.** Each stage falls back to the previous one when its model is absent, so
 *   `rowSortingFeature` without `sortedRowModel` renders a grid whose sort headers respond and
 *   whose rows never move. (The typecheck does catch the mirror image — a row model without its
 *   feature is a branded type error naming the feature.)
 * - **The three named-function registries**, `sortFns` / `filterFns` / `aggregationFns`. v9
 *   resolves a comparator the column named *by string*, and an unregistered name resolves to
 *   nothing — so the stage runs and does the wrong thing rather than failing.
 *
 * `sortFns` is required by **any** grid that sorts, not only one naming `sorting: { fn: … }`: a
 * plain accessor column's auto-resolved comparator is a name too. Measured — the same table sorted
 * descending puts `User 9999` on top without the registry and `User 10001` with it. It shipped
 * silently because below about ten rows lexicographic and alphanumeric agree, so every small
 * example's spec passed; it took a 10 000-row virtualization example to make it visible.
 * `filterFns` has the same shape and core does warn about that one; `aggregationFns` it does not
 * (`features/entry.ts:56` says so outright).
 */
export const REQUIRED_BY_OPTION: Readonly<Record<string, readonly string[]>> = {
	sorting: ['rowSortingFeature', 'sortedRowModel', 'sortFns'],
	filtering: ['columnFilteringFeature', 'filteredRowModel', 'filterFns'],
	globalFiltering: ['globalFilteringFeature', 'filteredRowModel', 'filterFns'],
	pagination: ['rowPaginationFeature'],
	selection: ['rowSelectionFeature'],
	expanding: ['rowExpandingFeature', 'expandedRowModel'],
	resizing: ['columnResizingFeature'],
	editing: ['editingFeature'],
	creating: ['creatingFeature'],
	deleting: ['deletingFeature'],
	draft: ['draftFeature'],
}

/**
 * State-snapshot slice → the feature that mints it.
 *
 * A second axis, and the one that cost a browser failure. `extractState` returns the slices the
 * table *has*, and for most of them a slice exists only when its feature is registered — so
 * persisting one means registering its feature, **even when the grid never writes the corresponding
 * config option**. `state-persistence.tsx` lost `columnOrderingFeature` during the base-set
 * reduction and its snapshot silently dropped `columnOrder`: no type error, no runtime warning,
 * nothing to see until `state/persistence.spec.ts` asserted the key was there.
 *
 * {@link REQUIRED_BY_OPTION} cannot reach this, because there is no config key to compare against —
 * `columnOrder` is never written as an option here, only persisted.
 *
 * **The seven below were measured, not derived from the slice names.** Building a table without
 * each feature in turn and reading `extractState` back shows that `pagination` and `columnPinning`
 * are present *regardless* — they are seeded during option resolution rather than minted by
 * `rowPaginationFeature` / `columnPinningFeature` — so requiring those two would fail a correct
 * example. The first draft of this map listed all nine and immediately reported
 * `state-persistence.tsx` for a `pagination` it did in fact carry. If a slice is added here, drop
 * its feature from a set and check whether the key really disappears.
 */
export const REQUIRED_BY_PERSISTED_SLICE: Readonly<Record<string, string>> = {
	sorting: 'rowSortingFeature',
	columnFilters: 'columnFilteringFeature',
	globalFilter: 'globalFilteringFeature',
	columnVisibility: 'columnVisibilityFeature',
	columnOrder: 'columnOrderingFeature',
	rowPinning: 'rowPinningFeature',
	columnSizing: 'columnSizingFeature',
}

/** One example file, with the set it declares and the config keys it writes. */
export type ExampleSet = {
	/** Path relative to `apps/docs`, for a failure message someone can click. */
	readonly file: string
	/** The members named inside its `tableFeatures({ … })` literal. */
	readonly members: readonly string[]
	/** The config keys the file writes, as a JSX prop or as a key of a config object. */
	readonly options: readonly string[]
	/** Whether the file builds a grid at all — a file that does not needs no set. */
	readonly buildsAGrid: boolean
	/** Whether it writes `pagination.mode: 'infinite'`, which forbids `paginatedRowModel`. */
	readonly isInfinite: boolean
	/** Slice names the file names in a `keys: [...]` allowlist for `extractState` / `useExtractedState`. */
	readonly persistedSlices: readonly string[]
}

const EXAMPLES_DIR = 'shared/data-grid/examples/components'
/** `const features = tableFeatures({ … })`, which is the convention every example follows. */
const SET_PATTERN = /const features = tableFeatures\(\{([\s\S]*?)\n\}\)/
/** A member of the set literal: one top-level line inside it, `name,` or `slot: factory(),`. */
const MEMBER_PATTERN = /^\t([A-Za-z]\w*)/gm
/** `<DataGrid …` / `<CustomDataGrid …`, but not `<DataGrid.Toolbar>`. */
const GRID_PATTERN = /<(?:Custom)?DataGrid(?=[\s>])|useDataGrid[<(]/

/**
 * The slices a file names in a `keys: [...]` allowlist.
 *
 * Only the explicit form is read. A bare `extractState(table)` asks for *everything the table has*,
 * which is defined by the set it was built from — so checking it against the set would be circular
 * and would pass whatever the set happened to be. **That is this checker's blind spot**, and it is
 * the one `state-persistence.tsx` fell into: its snapshot comes from a bare `extractState` call,
 * and only the browser suite could say which keys it was supposed to contain. A spec that asserts
 * specific keys is the check for that case; there is no static substitute.
 */
function persistedSlicesOf(source: string): string[] {
	const allowlist = /keys:\s*\[([^\]]*)\]/.exec(source)?.[1]
	if (allowlist === undefined) return []

	return [...allowlist.matchAll(/'([A-Za-z]+)'/g)].map((match) => match[1] ?? '')
}

function sourceFiles(root: string): string[] {
	const found: string[] = []
	const walk = (directory: string): void => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name)
			if (entry.isDirectory()) walk(path)
			else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) found.push(path)
		}
	}
	walk(root)

	return found.sort()
}

/**
 * Comments are stripped before anything is read.
 *
 * Several examples *explain* a feature in prose — `_use-paged-users.ts`'s docblock says "pass
 * straight to `useDataGrid({ state })`", and the infinite-scroll sets carry a comment about the
 * `paginatedRowModel` they deliberately omit. Naming a thing is not writing it, and a checker that
 * cannot tell the two apart reports the files whose comments are most useful.
 */
function withoutComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Whether `key` is written as a JSX prop or as a key of a config object literal. */
function writesOption(source: string, key: string): boolean {
	return new RegExp(String.raw`\n\s+${key}(=|:\s|,\n|\n|$)`, 'm').test(source)
}

/**
 * The set a file gets from a sibling instead of composing one.
 *
 * A grid under a `DataGridOptionsProvider` shares the provider's set rather than restating a
 * narrower one — `features` **replaces** across option layers rather than merging, so a grid that
 * writes its own gets *its* set, and one narrower than the provider's options would leave those
 * options configured but unregistered. That is a real defect the browser suite caught in
 * `ProductionProviderExample`, so this checker follows the import rather than exempting the file:
 * the borrowed set is checked against the borrowing file's own config, which is the question that
 * matters.
 */
function borrowedSet(path: string, source: string): string {
	const from = /import \{[^}]*\bfeatures\b[^}]*\} from '(\.[^']+)'/.exec(source)?.[1]
	if (from === undefined) return ''
	const sibling = join(dirname(path), `${from}.tsx`)
	const target = existsSync(sibling) ? sibling : join(dirname(path), `${from}.ts`)
	if (!existsSync(target)) return ''

	return SET_PATTERN.exec(withoutComments(readFileSync(target, 'utf8')))?.[1] ?? ''
}

export function collectExampleSets(docsRoot: string): ExampleSet[] {
	const root = join(docsRoot, EXAMPLES_DIR)

	return sourceFiles(root).map((path) => {
		const source = withoutComments(readFileSync(path, 'utf8'))
		const literal = SET_PATTERN.exec(source)?.[1] ?? borrowedSet(path, source)

		return {
			file: relative(docsRoot, path),
			members: [...literal.matchAll(MEMBER_PATTERN)].map((match) => match[1] ?? ''),
			options: Object.keys(REQUIRED_BY_OPTION).filter((key) => writesOption(source, key)),
			buildsAGrid: GRID_PATTERN.test(source),
			isInfinite: /mode:\s*'infinite'/.test(source),
			persistedSlices: persistedSlicesOf(source),
		}
	})
}
