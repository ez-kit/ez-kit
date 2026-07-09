'use client'

import { extendDataGrid } from '@ez-kit/data-grid-heroui'

import {
	ColorCellInput,
	ColorCellView,
	CurrencyCellInput,
	CurrencyCellView,
	ProgressCellInput,
	ProgressCellView,
	RatingCellInput,
	RatingCellView,
	UserCellInput,
	UserCellView,
} from './custom-cell-renderers'

import type { DataGrid as HeroUIDataGrid } from '@ez-kit/data-grid-heroui'

const customGrid = extendDataGrid({
	rating: { view: RatingCellView, edit: RatingCellInput },
	color: { view: ColorCellView, edit: ColorCellInput },
	progress: { view: ProgressCellView, edit: ProgressCellInput },
	currency: { view: CurrencyCellView, edit: CurrencyCellInput },
	user: { view: UserCellView, edit: UserCellInput },
})

export const DataGrid: typeof HeroUIDataGrid = customGrid.DataGrid
export const { useDataGrid, defineColumns } = customGrid
