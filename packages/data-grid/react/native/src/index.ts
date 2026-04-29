import { createDataGrid } from '@ez-kit/data-grid-react'

import { nativeComponents } from './components'

export const {
	DataGrid,
	useDataGrid,
	defineColumns,
	createColumnHelper,
	GridComponentsProvider,
} = createDataGrid({ components: nativeComponents })

export { nativeComponents }

export * from '@ez-kit/data-grid-react'
