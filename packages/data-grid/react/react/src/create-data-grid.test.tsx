import { describe, expect, it } from 'vitest'

import { createDataGrid } from './create-data-grid'
import { DataGrid } from './data-grid/data-grid'

describe('createDataGrid', () => {
  it('returns DataGrid, useDataGrid, GridComponentsProvider', () => {
    const result = createDataGrid({})
    expect(result.DataGrid).toBeTypeOf('function')
    expect(result.useDataGrid).toBeTypeOf('function')
    expect(result.GridComponentsProvider).toBeTypeOf('function')
  })

  it('bound DataGrid has all compound sub-components', () => {
    const { DataGrid: BoundDataGrid } = createDataGrid({})
    expect(BoundDataGrid.Toolbar).toBe(DataGrid.Toolbar)
    expect(BoundDataGrid.Table).toBe(DataGrid.Table)
    expect(BoundDataGrid.Pagination).toBe(DataGrid.Pagination)
    expect(BoundDataGrid.CreateTrigger).toBe(DataGrid.CreateTrigger)
  })
})
