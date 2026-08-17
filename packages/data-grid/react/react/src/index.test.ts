import { describe, expect, it } from 'vitest'

import { DataGrid, useDataGrid, createDataGrid, createColumns } from './index'

describe('@ez-kit/data-grid-react', () => {
	it('exports DataGrid, useDataGrid, createDataGrid, createColumns', () => {
		expect(DataGrid).toBeTypeOf('function')
		expect(useDataGrid).toBeTypeOf('function')
		expect(createDataGrid).toBeTypeOf('function')
		expect(createColumns).toBeTypeOf('function')
	})

	it('DataGrid has compound sub-components', () => {
		expect(DataGrid.Toolbar).toBeTypeOf('function')
		expect(DataGrid.Table).toBeTypeOf('function')
		expect(DataGrid.Header).toBeTypeOf('function')
		expect(DataGrid.Body).toBeTypeOf('function')
		expect(DataGrid.Row).toBeTypeOf('function')
		expect(DataGrid.Cell).toBeTypeOf('function')
		expect(DataGrid.Pagination).toBeTypeOf('function')
		expect(DataGrid.CreateTrigger).toBeTypeOf('function')
		expect(DataGrid.CreatingModal).toBeTypeOf('function')
		expect(DataGrid.EditingModal).toBeTypeOf('function')
	})
})
