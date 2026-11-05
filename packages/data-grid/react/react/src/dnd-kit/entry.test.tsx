import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { useDndEnabled } from '../data-grid/dnd/context'
import { TEST_COLUMNS, TEST_FEATURES, TEST_ROWS, testComponents } from '../test-utils'

import { adapter } from './index'

import type { DndAdapter } from '../data-grid/dnd/types'

function Probe() {
	return <span>{useDndEnabled() ? 'enabled' : 'disabled'}</span>
}

describe('the direct adapter entry', () => {
	it('binds the public adapter to a composed grid', () => {
		const binding: DndAdapter = adapter
		const { DataGrid } = createDataGrid({ components: testComponents, features: TEST_FEATURES, dnd: binding })
		render(
			<DataGrid
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
			>
				<Probe />
			</DataGrid>,
		)
		expect(screen.getByText('enabled')).toBeDefined()
	})
})
