'use client'

import { DataGridExamplesBrowser } from './DataGridExamplesBrowser'
import { dataGridPrimitiveExamples } from './generated/data-grid-primitive'

import type { DataGridExampleId } from './generated/data-grid-primitive'

function renderPrimitiveExample(exampleId: DataGridExampleId) {
	const Example = dataGridPrimitiveExamples[exampleId]

	return <Example />
}

export function DataGridPrimitiveExample() {
	return <DataGridExamplesBrowser renderExample={renderPrimitiveExample} />
}
