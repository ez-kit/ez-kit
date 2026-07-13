import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { DataGridDocsExampleClient } from '@/components/data-grid-docs-example-client'

vi.mock('@/hooks/use-url-state', () => ({
	useUrlState: (_k: string, o: { defaultValue: string }) => [o.defaultValue, vi.fn()],
}))

test('renders an iframe pointing at the selected kit example', () => {
	render(
		<DataGridDocsExampleClient
			exampleId='base-sorting'
			source={'const x = 1\n'}
			defaultType='shadcn'
			lockFlavor
		/>,
	)
	const frame = screen.getByTitle(/shadcn example: base-sorting/i)
	expect(frame.getAttribute('title')).toContain('base-sorting')
})
