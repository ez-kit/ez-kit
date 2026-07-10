'use client'

import { extendDataGrid } from '@ez-kit/data-grid-shadcn'

import {
	ColorCellInput,
	ColorCellView,
	CompletionCellInput,
	CompletionCellView,
	CurrencyCellInput,
	CurrencyCellView,
	RatingCellInput,
	RatingCellView,
	UserCellInput,
	UserCellView,
} from './custom-cell-renderers'

import type { DataGrid as ShadcnDataGrid } from '@ez-kit/data-grid-shadcn'

const customGrid = extendDataGrid({
	rating: { view: RatingCellView, edit: RatingCellInput },
	color: { view: ColorCellView, edit: ColorCellInput },
	completion: { view: CompletionCellView, edit: CompletionCellInput },
	currency: { view: CurrencyCellView, edit: CurrencyCellInput },
	user: { view: UserCellView, edit: UserCellInput },
})

export const DataGrid: typeof ShadcnDataGrid = customGrid.DataGrid
export const { useDataGrid, defineColumns } = customGrid
