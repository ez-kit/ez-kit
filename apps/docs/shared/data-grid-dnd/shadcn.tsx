'use client'

import { allDataGridFeatures } from '@ez-kit/data-grid-core/features/all'
import { defaultOperators } from '@ez-kit/data-grid-core/operators'
import { createDataGrid, DefaultLayout } from '@ez-kit/data-grid-react'
import { allComponents, cellTypes } from '@ez-kit/data-grid-shadcn'
import { adapter } from '@ez-kit/data-grid-shadcn/dnd'

/**
 * The shadcn kit, composed with its drag adapter.
 *
 * This is what `createDataGrid({ dnd })` is for and the only way drag is switched on. The layout
 * and the filter operators are bound here because the kit's own prebuilt grid binds both, so a
 * dragging example looks and filters like every other example rather than like a bare table.
 */
export const { DataGrid: DataGridDnd } = createDataGrid({
	components: { ...allComponents, core: { ...allComponents.core, Layout: DefaultLayout } },
	cellTypes,
	features: allDataGridFeatures,
	operators: defaultOperators,
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
