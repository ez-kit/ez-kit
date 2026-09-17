import * as core from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import * as publicApi from './index'

// Type-only reachability. These used to live in `@ez-kit/data-grid-core` only: the react
// barrel listed its core re-exports by hand and had drifted ~50 names behind, so a kit
// consumer could not name them without adding a second dependency. `tsc` fails this file
// if any of them stops being reachable from this package's entrypoint.
import type {
	ACTIONS_COLUMN_ID,
	GridFeatures,
	CellDef,
	CellType,
	CellViewCtx,
	ColumnCreatingConfig,
	ColumnEditingConfig,
	ColumnFilteringConfig,
	ColumnSortingConfig,
	CreatingMode,
	EditingMode,
	ExpandingConfig,
	ExpandingMode,
	FilteringConfig,
	InfiniteState,
	InitialTableState,
	InputComponentProps,
	LoadMoreDirection,
	LoadingState,
	PaginationConfig,
	RowActionsConfig,
	RowActionsPlacement,
	ReactFilteringConfig,
	SelectionConfig,
	SortingConfig,
} from './index'

describe('public API surface', () => {
	it('re-exports every runtime value from @ez-kit/data-grid-core', () => {
		const missing = Object.keys(core).filter((name) => !(name in publicApi))
		expect(missing).toEqual([])
	})

	it('does not leak the internal symbol keys used to carry normalized config', () => {
		// These are how the react layer stashes resolved config on the table instance.
		// Nothing outside this package may depend on them, and a published symbol is
		// impossible to remove later.
		const leaked = Object.keys(publicApi).filter((name) => name.endsWith('_KEY'))
		expect(leaked).toEqual([])
	})

	it('exports the closed sets as const objects usable as both value and type', () => {
		expect(publicApi.ActionsCellState.Idle).toBe('idle')
		expect(publicApi.PaginationLabel.Range).toBe('range')
		expect(publicApi.ActionBarVariant.Inline).toBe('inline')
		expect(publicApi.GridFeature.Core).toBe('core')
		expect(publicApi.RowActionsPlacement.Menu).toBe('menu')
		expect(publicApi.CreatingMode.PinRow).toBe('pin-row')
		expect(publicApi.EditingMode.Cell).toBe('cell')
		expect(publicApi.ExpandingMode.Tree).toBe('tree')
	})

	it('keeps the React-layer config types alongside their headless originals', () => {
		// `filtering.debounce` is a UI field, so it lives on ReactFilteringConfig, not
		// FilteringConfig. Both names must be reachable — one to configure a grid, one to build on
		// headlessly. `sorting` and `visibility` are no longer among them: their one React-only
		// field was the `toolbar` auto-mount flag, so `ReactSortingConfig` /
		// `ReactVisibilityConfig` went with it and core's types are the whole option.
		const sorting: SortingConfig = { manual: true }
		const reactFiltering: ReactFilteringConfig = { manual: true, debounce: 100 }
		expect(sorting.manual).toBe(true)
		expect(reactFiltering.debounce).toBe(100)
	})

	it('type-only imports resolve (compile-time assertion)', () => {
		// The `import type` block above is erased at runtime; this keeps the names referenced
		// so the linter does not strip them and the assertion stays meaningful.
		const names = [
			'ACTIONS_COLUMN_ID',
			'CellDef',
			'CellType',
			'CellViewCtx',
			'ColumnCreatingConfig',
			'ColumnEditingConfig',
			'ColumnFilteringConfig',
			'ColumnSortingConfig',
			'CreatingMode',
			'EditingMode',
			'ExpandingConfig',
			'ExpandingMode',
			'FilteringConfig',
			'InfiniteState',
			'InitialTableState',
			'InputComponentProps',
			'LoadMoreDirection',
			'LoadingState',
			'PaginationConfig',
			'RowActionsConfig',
			'RowActionsPlacement',
			'SelectionConfig',
			'SortingConfig',
		] satisfies string[]
		expect(names.length).toBeGreaterThan(20)
	})
})

// Keep the type-only imports load-bearing: each is used in a position `tsc` must check.
type _Assertions = [
	CellType,
	CellDef<{ id: string }>,
	CellViewCtx<{ id: string }, string>,
	ColumnCreatingConfig,
	ColumnEditingConfig,
	ColumnFilteringConfig,
	ColumnSortingConfig,
	CreatingMode,
	EditingMode,
	ExpandingConfig<GridFeatures, { id: string }>,
	ExpandingMode,
	FilteringConfig,
	InfiniteState,
	InitialTableState<GridFeatures>,
	InputComponentProps,
	LoadMoreDirection,
	LoadingState,
	PaginationConfig,
	RowActionsConfig,
	RowActionsPlacement,
	SelectionConfig<GridFeatures, { id: string }>,
	SortingConfig,
	typeof ACTIONS_COLUMN_ID,
]
