import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderGrid } from '../test-utils'

describe('DraftBar', () => {
	it('is closed when nothing is pending', () => {
		renderGrid({ deferredApply: true, sorting: { manual: true } })

		expect(screen.queryByTestId('draft-bar')).toBeNull()
	})

	it('opens with the pending counts once a sort is drafted', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })

		table.setSorting([{ id: 'age', desc: true }])

		expect(await screen.findByTestId('draft-bar')).toBeInTheDocument()
		expect(screen.getByTestId('draft-bar')).toHaveAttribute('data-pending-sorting', '1')
	})

	it('takes over the bar from the selection section while pending', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true }, selection: true })
		table.setRowSelection({ '1': true })

		table.setSorting([{ id: 'age', desc: true }])

		const bar = await screen.findByTestId('draft-bar')
		expect(bar).toHaveAttribute('data-selected-count', '1')
		expect(screen.queryByTestId('selection-bar')).toBeNull()
	})

	it('applies the draft when Apply is pressed', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })
		table.setSorting([{ id: 'age', desc: true }])

		await userEvent.click(await screen.findByRole('button', { name: /apply/i }))

		expect(table.draft.isDirty()).toBe(false)
	})

	it('restores the applied query when Reset is pressed', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })
		table.setSorting([{ id: 'age', desc: true }])

		await userEvent.click(await screen.findByRole('button', { name: /reset/i }))

		expect(table.getState().sorting).toEqual([])
	})
})
