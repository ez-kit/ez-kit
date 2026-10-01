'use client'

import { allDataGridFeatures } from '@ez-kit/data-grid-core/features/all'
import { createDataGrid, DefaultLayout } from '@ez-kit/data-grid-react'
import { allComponents, cellTypes } from '@ez-kit/data-grid-shadcn'
import { adapter } from '@ez-kit/data-grid-shadcn/dnd'

/**
 * The shadcn kit, composed with its drag adapter.
 *
 * This is what `createDataGrid({ dnd })` is for and the only way drag is switched on. The layout
 * is bound here because the kit's own prebuilt grid binds it too, so a dragging example looks like
 * every other example rather than like a bare table.
 */
export const { DataGrid: DataGridDnd } = createDataGrid({
	components: { ...allComponents, core: { ...allComponents.core, Layout: DefaultLayout } },
	cellTypes,
	features: allDataGridFeatures,
	dnd: adapter,
	/**
	 * The same statement the kit's own prebuilt grid makes (`shadcn/src/data-grid.tsx`): this kit
	 * renders plain DOM and brings no focus manager, so it takes the package's. Without it a grid
	 * composed here would be the one shadcn grid in the docs with no arrow-key navigation — and the
	 * sensors spec needs navigation and dragging in the same grid to show that neither takes the
	 * other's keys. The heroui wrapper deliberately does **not** set it: its table is React Aria's,
	 * which has a roving focus manager already.
	 */
	keyboardNavigation: true,
})
