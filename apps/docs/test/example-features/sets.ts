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
 * A superset of core's `REQUIRED_FEATURE`, because that catalogue is one config key to one
 * *feature* and the silent half of this is the **row models**: each stage falls back to the
 * previous one when its model is absent, so `rowSortingFeature` without `sortedRowModel` renders a
 * grid whose sort headers respond and whose rows never move. Nothing warns. Same for `filterFns`,
 * the registry a named filter function resolves through — without it every row matches.
 */
export const REQUIRED_BY_OPTION: Readonly<Record<string, readonly string[]>> = {
	sorting: ['rowSortingFeature', 'sortedRowModel'],
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
}

const EXAMPLES_DIR = 'shared/data-grid/examples/components'
/** `const features = tableFeatures({ … })`, which is the convention every example follows. */
const SET_PATTERN = /const features = tableFeatures\(\{([\s\S]*?)\n\}\)/
/** A member of the set literal: one top-level line inside it, `name,` or `slot: factory(),`. */
const MEMBER_PATTERN = /^\t([A-Za-z]\w*)/gm
/** `<DataGrid …` / `<CustomDataGrid …`, but not `<DataGrid.Toolbar>`. */
const GRID_PATTERN = /<(?:Custom)?DataGrid(?=[\s>])|useDataGrid[<(]/

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
		}
	})
}
