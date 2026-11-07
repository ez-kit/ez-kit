import {
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { describe, expect, it, vi } from 'vitest'

import { DataGridOptionsProvider } from '../data-grid-options-context'
import { createColumns } from '../react-columns'
import { TEST_FEATURES, renderWithComponents } from '../test-utils'

import { useDataGridHeaderCell } from './composition-context'
import { DataGrid } from './data-grid'

import type { GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'

type Person = { name: string; age: number }
const DATA: Person[] = [{ name: 'Ada', age: 36 }]
const COLUMNS = createColumns<Person>([{ accessorKey: 'name' }, { accessorKey: 'age', editing: false }])
const onSave = async () => {}

function EditabilityProbe() {
	const { canEdit, column } = useDataGridHeaderCell()
	return <span data-testid={`editable-${column.id}`}>{String(canEdit)}</span>
}

function Grid({
	editing,
	features = TEST_FEATURES,
	columns = COLUMNS,
}: { editing?: UseDataGridConfig<GridFeatures, Person>['editing'] } & Partial<
	Pick<UseDataGridConfig<GridFeatures, Person>, 'features'>
> & { columns?: typeof COLUMNS }) {
	return (
		<DataGrid
			features={features}
			data={DATA}
			columns={columns}
			{...(editing === undefined ? {} : { editing })}
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
											{({ canEdit }) => (
												<div data-render-editable={String(canEdit)}>
													<EditabilityProbe />
												</div>
											)}
										</DataGrid.HeaderCell>
									))
								}
							</DataGrid.HeaderRow>
						))
					}
				</DataGrid.Header>
			</DataGrid.Table>
		</DataGrid>
	)
}

function expectEditable(container: HTMLElement, columnId: string, expected: boolean) {
	const th = container.querySelector(`th[data-column-id="${columnId}"]`)
	expect(th).not.toBeNull()
	expect(th?.getAttribute('data-editable')).toBe(expected ? 'true' : null)
	expect(th?.querySelector('[data-render-editable]')?.getAttribute('data-render-editable')).toBe(String(expected))
	expect(th?.querySelector(`[data-testid="editable-${columnId}"]`)?.textContent).toBe(String(expected))
}

describe('header editability', () => {
	it.each(['cell', 'row', 'modal'] as const)(
		'resolves column permission in %s mode for DOM, render args and hook',
		(mode) => {
			const { container } = renderWithComponents(<Grid editing={{ mode, onSave }} />)
			expectEditable(container, 'name', true)
			expectEditable(container, 'age', false)
		},
	)

	it.each([undefined, false, { enabled: false, onSave }])('leaves disabled editing unmarked (%j)', (editing) => {
		const { container } = renderWithComponents(<Grid {...(editing === undefined ? {} : { editing })} />)
		expectEditable(container, 'name', false)
	})

	it('does not enable editing without a registered feature', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { container } = renderWithComponents(
			<Grid
				features={tableFeatures({ columnVisibilityFeature, columnPinningFeature, columnSizingFeature })}
				editing={{ onSave }}
			/>,
		)
		expectEditable(container, 'name', false)
	})

	it('resolves defaults, missing handlers and live overrides', () => {
		const { container, rerender } = renderWithComponents(
			<DataGridOptionsProvider defaults={{ editing: { mode: 'cell' } }}>
				<Grid />
			</DataGridOptionsProvider>,
		)
		expectEditable(container, 'name', false)
		rerender(
			<DataGridOptionsProvider defaults={{ editing: { onSave } }}>
				<Grid editing />
			</DataGridOptionsProvider>,
		)
		expectEditable(container, 'name', true)
		rerender(
			<DataGridOptionsProvider defaults={{ editing: { onSave } }}>
				<Grid editing={false} />
			</DataGridOptionsProvider>,
		)
		expectEditable(container, 'name', false)
	})

	it('marks only real leaf headers in an uneven column group', () => {
		const columns = createColumns<Person>([
			{ id: 'group', header: 'Group', columns: [{ accessorKey: 'name', editing: {} }] },
			{ accessorKey: 'age' },
		])
		const { container } = renderWithComponents(
			<Grid
				editing={{ onSave }}
				columns={columns}
			/>,
		)
		const marked = [...container.querySelectorAll('[data-editable="true"]')]
		expect(marked.map((th) => th.getAttribute('data-column-id')).sort()).toEqual(['age', 'name'])
		expect(container.querySelector('[data-column-id="group"]')?.getAttribute('data-editable')).toBeNull()
	})
})
