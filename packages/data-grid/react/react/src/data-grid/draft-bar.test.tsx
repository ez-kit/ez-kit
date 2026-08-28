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

	it('renders the same variant the selection bar is configured with', async () => {
		const { table } = renderGrid({
			deferredApply: true,
			sorting: { manual: true },
			selection: { bar: { variant: 'inline' } },
		})
		table.setRowSelection({ '1': true })

		// The selection bar owns the bar first — read the variant it actually rendered with.
		const selectionBar = await screen.findByTestId('selection-bar')
		expect(selectionBar).toHaveAttribute('data-variant', 'inline')

		table.setSorting([{ id: 'age', desc: true }])

		// The draft section takes over the same bar; it must not change shape doing so.
		const draftBar = await screen.findByTestId('draft-bar')
		expect(draftBar).toHaveAttribute('data-variant', 'inline')
	})

	it('falls back to the floating variant when the panel config omits one', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true }, selection: true })

		table.setSorting([{ id: 'age', desc: true }])

		expect(await screen.findByTestId('draft-bar')).toHaveAttribute('data-variant', 'floating')
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

	it('applies the whole draft when Enter is pressed in a filter input', async () => {
		const { table } = renderGrid({
			deferredApply: true,
			sorting: { manual: true },
			filtering: { manual: true },
		})
		table.setSorting([{ id: 'age', desc: true }])

		const input = await screen.findByRole('textbox', { name: /filter name/i })
		await userEvent.type(input, 'An{Enter}')

		expect(table.draft.isDirty()).toBe(false)
		expect(table.getState().applied.sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('applies the whole draft when Enter is pressed in the global search input', async () => {
		const { table } = renderGrid({
			deferredApply: true,
			sorting: { manual: true },
			globalFiltering: true,
		})
		table.setSorting([{ id: 'age', desc: true }])

		const search = await screen.findByRole('textbox', { name: /search/i })
		await userEvent.type(search, 'An{Enter}')

		expect(table.draft.isDirty()).toBe(false)
		expect(table.getState().applied.sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('does nothing on Enter in a filter input when deferredApply is off', async () => {
		renderGrid({
			filtering: { manual: true },
			globalFiltering: true,
		})

		const search = await screen.findByRole('textbox', { name: /search/i })
		await userEvent.type(search, 'An{Enter}')

		// No draft exists off deferredApply; the key is a no-op rather than throwing.
		expect(search).toHaveValue('An')
	})
})

describe('deferred-apply DOM marks', () => {
	it('marks an unapplied sort on the header cell', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })

		table.setSorting([{ id: 'age', desc: true }])

		const header = await screen.findByRole('columnheader', { name: /age/i })
		expect(header).toHaveAttribute('data-draft-sorting', '0')
	})

	it('drops the mark once the draft is applied', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.apply()

		const header = await screen.findByRole('columnheader', { name: /age/i })
		expect(header).not.toHaveAttribute('data-draft-sorting')
	})

	it('leaves an untouched sortable header unmarked while another column is drafted', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })

		table.setSorting([{ id: 'name', desc: false }])
		table.draft.apply()

		table.setSorting([
			{ id: 'name', desc: false },
			{ id: 'age', desc: true },
		])

		const nameHeader = await screen.findByRole('columnheader', { name: /name/i })
		const ageHeader = await screen.findByRole('columnheader', { name: /age/i })
		expect(nameHeader).not.toHaveAttribute('data-draft-sorting')
		expect(ageHeader).toHaveAttribute('data-draft-sorting', '1')
	})

	it('has no data-draft-sorting when deferredApply is off', async () => {
		const { table } = renderGrid({ sorting: true })

		table.setSorting([{ id: 'age', desc: true }])

		const header = await screen.findByRole('columnheader', { name: /age/i })
		expect(header).not.toHaveAttribute('data-draft-sorting')
	})

	it('marks an unapplied column filter chip with data-draft-filter', async () => {
		const { table } = renderGrid({
			deferredApply: true,
			sorting: { manual: true },
			filtering: { manual: true, chips: true },
		})

		table.getColumn('name')?.setFilterValue('ali')

		const chip = await screen.findByText('ali')
		expect(chip.closest("[data-slot='filter-chip']")).toHaveAttribute('data-draft-filter', '')
	})

	it('drops data-draft-filter once the filter draft is applied', async () => {
		const { table } = renderGrid({
			deferredApply: true,
			sorting: { manual: true },
			filtering: { manual: true, chips: true },
		})

		table.getColumn('name')?.setFilterValue('ali')
		table.draft.apply()

		const chip = await screen.findByText('ali')
		expect(chip.closest("[data-slot='filter-chip']")).not.toHaveAttribute('data-draft-filter')
	})
})
