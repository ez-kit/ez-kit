import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderGrid } from '../test-utils'

import { DataGrid } from './data-grid'

/**
 * Draft behaviour that is not the action bar's: the keyboard shortcut that commits a whole
 * draft, and the DOM marks a pending draft leaves on the controls it came from. They moved
 * here when `draft-bar.tsx` became a section of `action-bar.tsx` — the bar's own cases live
 * in `action-bar.test.tsx`.
 */
describe('applying a draft from a filter input', () => {
	it('applies the whole draft when Enter is pressed in a filter input', async () => {
		const { table } = renderGrid({
			draft: true,
			sorting: { manual: true },
			filtering: { manual: true },
		})
		table.setSorting([{ id: 'age', desc: true }])

		const input = await screen.findByRole('textbox', { name: /filter name/i })
		await userEvent.type(input, 'An{Enter}')

		expect(table.draft.isDirty()).toBe(false)
		expect(table.store.state.applied.sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('applies the whole draft when Enter is pressed in the global search input', async () => {
		const { table } = renderGrid({
			draft: true,
			sorting: { manual: true },
			globalFiltering: true,
		})
		table.setSorting([{ id: 'age', desc: true }])

		const search = await screen.findByRole('textbox', { name: /search/i })
		await userEvent.type(search, 'An{Enter}')

		expect(table.draft.isDirty()).toBe(false)
		expect(table.store.state.applied.sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('does nothing on Enter in a filter input when draft is off', async () => {
		renderGrid({
			filtering: { manual: true },
			globalFiltering: true,
		})

		const search = await screen.findByRole('textbox', { name: /search/i })
		await userEvent.type(search, 'An{Enter}')

		// No draft exists off draft; the key is a no-op rather than throwing.
		expect(search).toHaveValue('An')
	})
})

describe('deferred-apply DOM marks', () => {
	it('marks an unapplied sort on the header cell', async () => {
		const { table } = renderGrid({ draft: true, sorting: { manual: true } })

		table.setSorting([{ id: 'age', desc: true }])

		const header = await screen.findByRole('columnheader', { name: /age/i })
		expect(header).toHaveAttribute('data-draft-sorting', '0')
	})

	it('drops the mark once the draft is applied', async () => {
		const { table } = renderGrid({ draft: true, sorting: { manual: true } })
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.apply()

		const header = await screen.findByRole('columnheader', { name: /age/i })
		expect(header).not.toHaveAttribute('data-draft-sorting')
	})

	it('leaves an untouched sortable header unmarked while another column is drafted', async () => {
		const { table } = renderGrid({ draft: true, sorting: { manual: true } })

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

	it('has no data-draft-sorting when draft is off', async () => {
		const { table } = renderGrid({ sorting: true })

		table.setSorting([{ id: 'age', desc: true }])

		const header = await screen.findByRole('columnheader', { name: /age/i })
		expect(header).not.toHaveAttribute('data-draft-sorting')
	})

	it('marks an unapplied column filter chip with data-draft-filter', async () => {
		const { table } = renderGrid(
			{ draft: true, sorting: { manual: true }, filtering: { manual: true } },
			// `filtering: { chips: true }` used to mount the strip; a layout writes it now.
			<>
				<DataGrid.ActiveFiltersBar />
				<DataGrid.Table />
			</>,
		)

		table.getColumn('name')?.setFilterValue('ali')

		const chip = await screen.findByText('ali')
		expect(chip.closest("[data-slot='filter-chip']")).toHaveAttribute('data-draft-filter', '')
	})

	it('drops data-draft-filter once the filter draft is applied', async () => {
		const { table } = renderGrid(
			{ draft: true, sorting: { manual: true }, filtering: { manual: true } },
			// `filtering: { chips: true }` used to mount the strip; a layout writes it now.
			<>
				<DataGrid.ActiveFiltersBar />
				<DataGrid.Table />
			</>,
		)

		table.getColumn('name')?.setFilterValue('ali')
		table.draft.apply()

		const chip = await screen.findByText('ali')
		expect(chip.closest("[data-slot='filter-chip']")).not.toHaveAttribute('data-draft-filter')
	})
})
