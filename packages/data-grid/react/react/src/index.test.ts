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
		// `Row` is the one sub-component wrapped in `forwardRef` — pinned rows are measured through
		// its ref, and React 18 does not pass `ref` through props. `forwardRef` returns an object
		// carrying `$$typeof`, not a function, so this one is checked as the exotic component it is.
		expect(DataGrid.Row).toMatchObject({ $$typeof: Symbol.for('react.forward_ref') })
		expect(DataGrid.Cell).toBeTypeOf('function')
		expect(DataGrid.Pagination).toBeTypeOf('function')
		expect(DataGrid.CreateTrigger).toBeTypeOf('function')
		// The two form modals are mounted by the grid itself and are not members: a layout that wrote
		// one rendered a second dialog. A form of one's own is a registered `FormModal`.
		expect(DataGrid).not.toHaveProperty('CreatingModal')
		expect(DataGrid).not.toHaveProperty('EditingModal')
	})
})
