'use client'

import { extendDataGrid } from '@ez-kit/data-grid-heroui'

import { customCellTypes } from './custom-cell-types'

import type { DataGrid as HeroUIDataGrid } from '@ez-kit/data-grid-heroui'

const customGrid = extendDataGrid(customCellTypes)

export const DataGrid: typeof HeroUIDataGrid = customGrid.DataGrid
export const { useDataGrid, createColumns } = customGrid
