'use client'

import { allDataGridFeatures } from '@ez-kit/data-grid-core/features/all'
import { defaultOperators } from '@ez-kit/data-grid-core/operators'
import { allComponents, cellTypes } from '@ez-kit/data-grid-heroui'
import { adapter } from '@ez-kit/data-grid-heroui/dnd'
import { createDataGrid, DefaultLayout } from '@ez-kit/data-grid-react'

/**
 * The heroui kit, composed with its drag adapter.
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
})
