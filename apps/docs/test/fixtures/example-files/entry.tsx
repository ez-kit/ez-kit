import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { OUTSIDE } from '../outside'

import { columns } from './columns'
import { useData } from './use-data'

const features = tableFeatures({ columnVisibilityFeature, columnPinningFeature, columnSizingFeature })

export function EntryExample() {
	const [open] = useState(false)
	const rows = useData()
	return (
		<div
			data-title={OUTSIDE}
			data-open={open}
		>
			<DataGrid
				features={features}
				columns={columns}
				data={rows}
			/>
		</div>
	)
}
