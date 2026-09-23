'use client'

import { allDataGridFeatures } from '@ez-kit/data-grid-core/features/all'
import { createDataGrid, DefaultLayout } from '@ez-kit/data-grid-react'

import { cellTypes } from './blocks/cell-types'
import { coreComponents } from './blocks/core/core-components'
import { deletingComponents } from './blocks/deleting/deleting-components'
import { editingComponents } from './blocks/editing/editing-components'
import { expandingComponents } from './blocks/expanding/expanding-components'
import { fallbacksComponents } from './blocks/fallbacks/fallbacks-components'
import { filteringComponents } from './blocks/filtering/filtering-components'
import { infiniteComponents } from './blocks/infinite/infinite-components'
import { paginationComponents } from './blocks/pagination/pagination-components'
import { resizingComponents } from './blocks/resizing/resizing-components'
import { rowActionsComponents } from './blocks/row-actions/row-actions-components'
import { sortingComponents } from './blocks/sorting/sorting-components'
import { visibilityComponents } from './blocks/visibility/visibility-components'

import type { KitCellTypes } from './blocks/cell-types'
import type { DataGridBundle, FullGridComponents, GridFeatures } from '@ez-kit/data-grid-react'

/**
 * The prebuilt grid's layout, bound here and **only** here.
 *
 * `core.Layout` is what `<DataGrid>` renders when it is given no children, so binding
 * `DefaultLayout` is what keeps `<DataGrid data columns features />` rendering the familiar
 * toolbar / table / pagination shell now that no config option places a control. Without it the
 * shared layer's answer is a table and nothing else, which is the only arrangement it can be
 * right about once composition is stated in JSX.
 *
 * It is spread onto `coreComponents` here rather than added to that module for the same reason
 * `allDataGridFeatures` is bound in this file rather than in `index.ts`: `blocks/core/core-components`
 * is a build entry point for a grid composed through `createDataGrid`, and a layout registered
 * there would reach every such grid silently — handing back the rich default to exactly the
 * caller who composed a set to avoid it.
 */
const components = {
	core: { ...coreComponents, Layout: DefaultLayout },
	pagination: paginationComponents,
	sorting: sortingComponents,
	filtering: filteringComponents,
	editing: editingComponents,
	deleting: deletingComponents,
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
 * confirm dialog, the action bar, the resizer, the visibility menu. That is the right trade when
 * a grid uses most of them, and the wrong one when it uses four. Composing the groups a grid
 * actually renders is what the per-feature subpaths are for — see
 * `@ez-kit/data-grid-<kit>/core`, `/sorting`, `/pagination` and the rest.
 *
 * It is annotated rather than exported as the inferred literal: the declaration emitter re-prints
 * an inferred type structurally into the bundled `.d.ts`, and `FullGridComponents` is the name a
 * reader — and a consumer's editor — should see instead. The `satisfies` above still does the
 * completeness checking, so a forgotten component is still a compile error here.
 */
const allComponents: FullGridComponents = components

/**
 * `extendDataGrid` re-invokes the factory with the same shadcn components while
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
/**
 * The kit's prebuilt grid, and the set it runs on.
 *
 * `features` is required everywhere else — a grid pays for what it registers, and the headless
 * `createDataGrid` still demands a set. This one export is the exception, because here the set
 * buys almost nothing: the fourteen component groups above already read the features' APIs, so
 * they drag the implementations in whatever set a call site names. Measured against this kit, the
 * difference between this prebuilt on a sorting-only set and on every feature is a few kB — for
 * eight imports at every call site. The same grid composed through `createDataGrid` with four
 * component groups is substantially smaller than either, which is where the saving actually lives,
 * and that path keeps `features` required.
 *
 * So naming it here makes the export's cost match its name: importing `DataGrid` from the kit
 * root has always meant "everything", and now it means everything on both axes. A set named at a
 * call site still **replaces** this one, which narrows behaviour — it does not give the bytes
 * back, since this module is what pulled them in.
 *
 * Load-bearing: this import belongs in *this* module and nowhere above it. `createDataGrid`
 * reaches a consumer through `index.ts`'s star re-export of `@ez-kit/data-grid-react`, so the
 * two stay separable and a composed grid never sees `features/all` — which is a top-level
 * `tableFeatures({ ...stockFeatures })` call whose spread no bundler can drop.
 * `apps/docs/test/tree-shaking.test.ts` pins that separation.
 */
/**
 * The type the bound bundle is parameterised by — the **widest** instantiation, not
 * `typeof allDataGridFeatures`.
 *
 * Two things have to be true at once. Every one of the four annotations below must carry a feature
 * type or the binding is erased: `DataGridBundle`'s second parameter defaults to `undefined`, so
 * `createDataGrid<KitCellTypes>` alone hands back a bundle that still demands `features` at every
 * call site, silently undoing this file. And the type it carries must stay `GridFeatures`, because
 * it reaches everything downstream — a consumer's `ColumnDef<GridFeatures, Row>`, every
 * `UseDataGridConfig` they name, the table instance they pass around. Parameterising by the
 * concrete set makes each of those a different type than the one the docs and both kits' own
 * helpers are written against, and they stop being assignable.
 *
 * The runtime set is still the all-in one; what is widened is only what the types promise about
 * it. That matches the rest of the package, where `GridFeatures` is deliberately the widest
 * instantiation so `TFeatures` never reaches the component contract.
 */
type KitFeatures = GridFeatures

const bundle: DataGridBundle<KitCellTypes, KitFeatures> = createDataGrid<KitCellTypes, KitFeatures>({
	components,
	cellTypes,
	features: allDataGridFeatures,
})

const { DataGrid, GridComponentsProvider, useDataGrid } = bundle

// Annotated one by one rather than destructured: a destructured binding is re-inferred by the
// declaration emitter, which re-prints the signature instead of naming it, and a re-printed
// `DataGridBundle<KitCellTypes & TExtra>` degenerates to an error type at the call site — the
// consumer then gets an unchecked `createColumns` off the extended bundle. Indexing the bundle's
// type keeps `KitCellTypes` a name in the three signatures that carry a `CellDef` union.
const createColumns: DataGridBundle<KitCellTypes, KitFeatures>['createColumns'] = bundle.createColumns
const createColumnHelper: DataGridBundle<KitCellTypes, KitFeatures>['createColumnHelper'] = bundle.createColumnHelper
const extendDataGrid: DataGridBundle<KitCellTypes, KitFeatures>['extendDataGrid'] = bundle.extendDataGrid

// `cellTypes` / `KitCellTypes` are re-exported here (not just consumed internally by
// `createDataGrid` above) because this file is the registry consumer's actual entry point —
// `index.ts` (which re-exported them, plus `@ez-kit/data-grid-react`'s whole surface) is excluded
// from the shadcn registry payload, see `registry.config.mjs`'s `excludeTopLevel`.
export {
	DataGrid,
	GridComponentsProvider,
	useDataGrid,
	extendDataGrid,
	createColumns,
	createColumnHelper,
	cellTypes,
	allComponents,
}
export type { KitCellTypes }
