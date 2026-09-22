import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../react-columns'
import { TEST_FEATURES, renderWithComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type User = { id: number; name: string; age: number }

const DATA: User[] = [{ id: 1, name: 'Ada', age: 36 }]
const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name', headerClassName: 'th-name' },
	{ accessorKey: 'age', header: 'Age' },
])

describe('DataGrid.HeaderRow / DataGrid.HeaderCell', () => {
	it('a custom cell for one column leaves the others on the default', () => {
		const { container, getByText } = renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
				sorting
			>
				<DataGrid.Table>
					<DataGrid.Header>
						{({ headerGroups }) =>
							headerGroups.map((group) => (
								<DataGrid.HeaderRow
									key={group.id}
									headerGroup={group}
								>
									{({ headers }) =>
										headers.map((header) =>
											header.column.id === 'age' ? (
												<DataGrid.HeaderCell
													key={header.id}
													header={header}
												>
													custom age
												</DataGrid.HeaderCell>
											) : (
												<DataGrid.HeaderCell
													key={header.id}
													header={header}
												/>
											),
										)
									}
								</DataGrid.HeaderRow>
							))
						}
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>,
		)

		expect(getByText('custom age')).toBeDefined()
		// The untouched column keeps its default cell — sort affordance and class included.
		const nameTh = container.querySelector('[data-column-id="name"]')
		expect(nameTh?.className).toContain('th-name')
		expect(nameTh?.querySelector('[data-slot="sort-trigger"]')).not.toBeNull()
		// The custom cell keeps its `<th>` shell.
		const ageTh = container.querySelector('[data-column-id="age"]')
		expect(ageTh?.getAttribute('data-slot')).toBe('th')
	})

	it('hands the default parts to a render function so they can be reused', () => {
		const { container } = renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
				sorting
			>
				<DataGrid.Table>
					<DataGrid.Header>
						{({ headerGroups }) =>
							headerGroups.map((group) => (
								<DataGrid.HeaderRow
									key={group.id}
									headerGroup={group}
								>
									{({ headers }) =>
										headers.map((header) => (
											<DataGrid.HeaderCell
												key={header.id}
												header={header}
											>
												{({ label, sortTrigger, canSort }) => (
													<div data-testid={`hdr-${header.column.id}`}>
														<span data-testid='raw-label'>{label}</span>
														{canSort ? sortTrigger : null}
													</div>
												)}
											</DataGrid.HeaderCell>
										))
									}
								</DataGrid.HeaderRow>
							))
						}
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>,
		)

		// `label` is the bare content, `sortTrigger` the wired affordance — both available.
		expect(container.querySelectorAll('[data-testid="raw-label"]')).toHaveLength(2)
		expect(container.querySelectorAll('[data-slot="sort-trigger"]')).toHaveLength(2)
	})
})

describe('the sort affordance', () => {
	/**
	 * It is a real `<button>`, which is what lets the click handler be
	 * `getToggleSortingHandler()` and nothing else.
	 *
	 * It used to be a `role='button'` div with a hand-written `Enter`/`Space` handler, plus a
	 * predicate dropping any click that started on an interactive descendant — a guard for a
	 * control a consumer put in `column.header`. That guard could not tell such a control from
	 * the kit's own sort arrow, so shadcn's arrow (a `Button` in looks only) swallowed every
	 * click aimed at it — and it sits at the header's centre, where a pointer lands. Both are
	 * gone: nothing interactive may live inside the affordance, so there is nothing to ask.
	 */
	it('is a <button> on a sortable column and a plain element on one that does not sort', () => {
		const columns = createColumns<User>([
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'age', header: 'Age', sorting: false },
		])

		const { container } = renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={columns}
				sorting
			/>,
		)

		const [sortable, fixed] = Array.from(container.querySelectorAll('[data-slot="sort-trigger"]'))
		expect(sortable?.tagName).toBe('BUTTON')
		expect(sortable).toHaveAttribute('type', 'button')
		expect(fixed?.tagName).not.toBe('BUTTON')
	})

	it('clicking the column name sorts', () => {
		const onSortChange = vi.fn()
		const { getByText } = renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
				sorting={{ onChange: onSortChange }}
			/>,
		)

		fireEvent.click(getByText('Name'))
		expect(onSortChange).toHaveBeenCalledWith([{ id: 'name', desc: false }])
	})

	/**
	 * `Enter` and `Space` are handled on the button rather than left to its native activation,
	 * because HeroUI's `Th` is React Aria's, and React Aria's grid keyboard manager cancels the
	 * bubbling keydown — a cancelled keydown activates nothing. Handling it at the target, where
	 * the event still arrives intact, is what keeps the chord working in both kits.
	 *
	 * The assertion is `toHaveBeenCalledTimes(1)`, not just "was called": in a kit that does
	 * **not** cancel, the browser would synthesise an activation click on top of this handler,
	 * and `preventDefault` is what stops the column sorting twice per keypress.
	 */
	it.each(['Enter', ' '])('%s on the affordance sorts exactly once', (key) => {
		const onSortChange = vi.fn()
		const { container } = renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
				sorting={{ onChange: onSortChange }}
			/>,
		)

		const trigger = container.querySelector('[data-slot="sort-trigger"]')
		if (!trigger) throw new Error('expected a sort affordance')
		fireEvent.keyDown(trigger, { key })

		expect(onSortChange).toHaveBeenCalledTimes(1)
		expect(onSortChange).toHaveBeenCalledWith([{ id: 'name', desc: false }])
	})

	// The regression the guard caused: the arrow is inside the affordance, so a click on it is a
	// click on the button. The kits render it as a decorative element for exactly this reason.
	it('clicking the sort indicator sorts', () => {
		const onSortChange = vi.fn()
		const { container } = renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
				sorting={{ onChange: onSortChange }}
			/>,
		)

		const indicator = container.querySelector('[data-slot="sort-trigger"] [data-testid="sort-indicator"]')
		if (!indicator) throw new Error('expected the test kit to render a sort indicator')
		fireEvent.click(indicator)
		expect(onSortChange).toHaveBeenCalledWith([{ id: 'name', desc: false }])
	})
})
