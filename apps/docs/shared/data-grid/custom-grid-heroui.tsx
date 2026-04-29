'use client'

import { extendDataGrid } from '@ez-kit/data-grid-heroui'

import { ColorCellInput, ColorCellView, RatingCellInput, RatingCellView } from './custom-cell-renderers'

import type { DataGrid as HeroUIDataGrid } from '@ez-kit/data-grid-heroui'

const customGrid = extendDataGrid({
	rating: { view: RatingCellView, edit: RatingCellInput },
	color: { view: ColorCellView, edit: ColorCellInput },
})

export const DataGrid: typeof HeroUIDataGrid = customGrid.DataGrid
export const { useDataGrid, defineColumns } = customGrid
