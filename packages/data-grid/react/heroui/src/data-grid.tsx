'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'

import { cellTypes } from './blocks/cell-types'
import { coreComponents } from './blocks/core/core-components'
import { deletingComponents } from './blocks/deleting/deleting-components'
import { draftComponents } from './blocks/draft/draft-components'
import { editingComponents } from './blocks/editing/editing-components'
import { expandingComponents } from './blocks/expanding/expanding-components'
import { fallbacksComponents } from './blocks/fallbacks/fallbacks-components'
import { filteringComponents } from './blocks/filtering/filtering-components'
import { infiniteComponents } from './blocks/infinite/infinite-components'
import { paginationComponents } from './blocks/pagination/pagination-components'
import { resizingComponents } from './blocks/resizing/resizing-components'
import { rowActionsComponents } from './blocks/row-actions/row-actions-components'
import { selectionComponents } from './blocks/selection/selection-components'
import { sortingComponents } from './blocks/sorting/sorting-components'
import { visibilityComponents } from './blocks/visibility/visibility-components'

import type { KitCellTypes } from './blocks/cell-types'
import type { DataGridBundle, FullGridComponents } from '@ez-kit/data-grid-react'

const components = {
	core: coreComponents,
	pagination: paginationComponents,
	sorting: sortingComponents,
	filtering: filteringComponents,
	editing: editingComponents,
	deleting: deletingComponents,
	selection: selectionComponents,
	draft: draftComponents,
	rowActions: rowActionsComponents,
	resizing: resizingComponents,
	visibility: visibilityComponents,
	fallbacks: fallbacksComponents,
	infinite: infiniteComponents,
	expanding: expandingComponents,
} satisfies FullGridComponents

/**
 * Every group this kit registers, in one object — the convenient default, and the one that costs
 * the most.
 *
 * Naming it pulls all fourteen groups into the bundle: the filter panel, both write forms, the
 * confirm dialog, the selection and draft bars, the resizer, the visibility menu. That is the
 * right trade when a grid uses most of them, and the wrong one when it uses four. Composing the
 * groups a grid actually renders is what the per-feature subpaths are for — see
 * `@ez-kit/data-grid-<kit>/core`, `/sorting`, `/pagination` and the rest.
 *
 * It is annotated rather than exported as the inferred literal: the declaration emitter re-prints
 * an inferred type structurally into the bundled `.d.ts`, and `FullGridComponents` is the name a
 * reader — and a consumer's editor — should see instead. The `satisfies` above still does the
 * completeness checking, so a forgotten component is still a compile error here.
 */
const allComponents: FullGridComponents = components

/**
 * `extendDataGrid` re-invokes the factory with the same HeroUI components while
 * merging in additional custom cell types (return typed to the merged keys).
 *
 * @example
 * const { DataGrid, createColumns } = extendDataGrid({
 *   rating: { view: RatingCellView, edit: RatingCellInput },
 * })
 */
// Annotated, not inferred. The declaration emitter prints an *inferred* type structurally, so
// without this the bundled `.d.ts` re-prints the whole bundle into every signature that mentions
// it. Naming the bundle's type keeps `KitCellTypes` — which is itself declared rather than read
// off the runtime object, see `blocks/cell-types.ts` — a name in the emitted signatures.
const bundle: DataGridBundle<KitCellTypes> = createDataGrid<KitCellTypes>({
	components,
	cellTypes,
})

const { DataGrid, GridComponentsProvider, useDataGrid } = bundle

// Annotated one by one rather than destructured: a destructured binding is re-inferred by the
// declaration emitter, which re-prints the signature instead of naming it, and a re-printed
// `DataGridBundle<KitCellTypes & TExtra>` degenerates to an error type at the call site — the
// consumer then gets an unchecked `createColumns` off the extended bundle. Indexing the bundle's
// type keeps `KitCellTypes` a name in the three signatures that carry a `CellDef` union.
const createColumns: DataGridBundle<KitCellTypes>['createColumns'] = bundle.createColumns
const createColumnHelper: DataGridBundle<KitCellTypes>['createColumnHelper'] = bundle.createColumnHelper
const extendDataGrid: DataGridBundle<KitCellTypes>['extendDataGrid'] = bundle.extendDataGrid

export {
	DataGrid,
	GridComponentsProvider,
	useDataGrid,
	extendDataGrid,
	createColumns,
	createColumnHelper,
	allComponents,
}
