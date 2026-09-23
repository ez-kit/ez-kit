'use client'

import { allDataGridFeatures } from '@ez-kit/data-grid-core/features/all'
import { createDataGrid } from '@ez-kit/data-grid-react'
import { allComponents, cellTypes } from '@ez-kit/data-grid-shadcn'

import { customCellTypes } from './custom-cell-types'

import type { DataGrid as ShadcnDataGrid } from '@ez-kit/data-grid-shadcn'

// The kit's own three aggregates plus this page's extra cell types — the same bundle the kit
// root builds, with a wider registry. Registering a cell type is a `cellTypes` argument and
// nothing more.
const customGrid = createDataGrid({
	components: allComponents,
	cellTypes: { ...cellTypes, ...customCellTypes },
	features: allDataGridFeatures,
})

export const DataGrid: typeof ShadcnDataGrid = customGrid.DataGrid
export const { useDataGrid, createColumns } = customGrid
