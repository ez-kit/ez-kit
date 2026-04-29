'use client'

import { extendDataGrid } from '@ez-kit/data-grid-shadcn'

import { ColorCellInput, ColorCellView, RatingCellInput, RatingCellView } from './custom-cell-renderers'

import type { DataGrid as ShadcnDataGrid } from '@ez-kit/data-grid-shadcn'

const customGrid = extendDataGrid({
	rating: { view: RatingCellView, edit: RatingCellInput },
	color: { view: ColorCellView, edit: ColorCellInput },
})

export const DataGrid: typeof ShadcnDataGrid = customGrid.DataGrid
export const { useDataGrid, defineColumns } = customGrid
