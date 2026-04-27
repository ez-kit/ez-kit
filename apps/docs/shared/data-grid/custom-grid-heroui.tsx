'use client'

import { extendDataGrid } from '@ez-kit/data-grid-heroui'

import { ColorCellInput, ColorCellView, RatingCellInput, RatingCellView } from './custom-cell-renderers'

export const {
	DataGrid,
	useDataGrid,
	defineColumns,
} = extendDataGrid({
	rating: { view: RatingCellView, edit: RatingCellInput },
	color: { view: ColorCellView, edit: ColorCellInput },
})
