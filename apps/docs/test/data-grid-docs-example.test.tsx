/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'

import { DataGridDocsExampleClient } from '@/components/data-grid-docs-example-client'

// Render ExampleFrame's props observably so we can assert the propagated
// `kit`/`slug` directly. This also sidesteps the real IntersectionObserver
// lazy-mount ExampleFrame performs, so the assertions target behavior, not jsdom.
vi.mock('@/components/example-frame', () => ({
	ExampleFrame: ({ kit, slug }: { kit: string; slug: string }) => (
		<div
			data-testid='frame'
			data-kit={kit}
			data-slug={slug}
		/>
	),
}))

// Stateful mock: `setValue` (returned by useState) actually re-renders with the
// new flavor, mirroring how the real URL-backed hook drives the switcher.
vi.mock('@/hooks/use-url-state', () => ({
	useUrlState: (_key: string, options: { defaultValue: string }) => useState(options.defaultValue),
}))

test('locked flavor renders that kit and hides the tab switcher', () => {
	render(
		<DataGridDocsExampleClient
			exampleId='base-sorting'
			source={'const x = 1\n'}
			defaultType='heroui'
			lockFlavor
		/>,
	)

	const frame = screen.getByTestId('frame')
	expect(frame.getAttribute('data-kit')).toBe('heroui')
	expect(frame.getAttribute('data-slug')).toBe('base-sorting')

	// Locked authors fix the flavor, so no toggle is offered.
	expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
	expect(screen.queryByRole('tab')).not.toBeInTheDocument()
})

test('switching tabs drives the ExampleFrame kit', () => {
	render(
		<DataGridDocsExampleClient
			exampleId='base-sorting'
			source={'const x = 1\n'}
			defaultType='shadcn'
			lockFlavor={false}
		/>,
	)

	expect(screen.getByTestId('frame').getAttribute('data-kit')).toBe('shadcn')

	fireEvent.click(screen.getByRole('tab', { name: /heroui/i }))

	expect(screen.getByTestId('frame').getAttribute('data-kit')).toBe('heroui')
	expect(screen.getByTestId('frame').getAttribute('data-slug')).toBe('base-sorting')
})
