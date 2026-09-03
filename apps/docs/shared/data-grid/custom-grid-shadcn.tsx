'use client'

import { extendDataGrid } from '@ez-kit/data-grid-shadcn'

import { customCellTypes } from './custom-cell-types'

import type { DataGrid as ShadcnDataGrid } from '@ez-kit/data-grid-shadcn'

const customGrid = extendDataGrid(customCellTypes)

export const DataGrid: typeof ShadcnDataGrid = customGrid.DataGrid
export const { useDataGrid, createColumns } = customGrid
