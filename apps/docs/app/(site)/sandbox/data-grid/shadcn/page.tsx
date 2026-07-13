import { Suspense } from 'react'

import { DataGridTabsExample } from 'shared/data-grid/examples/DataGridTabsExample'

export default function DataGridSandboxPage() {
	return (
		<Suspense fallback={null}>
			<DataGridTabsExample />
		</Suspense>
	)
}
