import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createPortal } from 'react-dom'
import { describe, expect, it, vi } from 'vitest'

import { TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

import type { FieldState } from '@ez-kit/data-grid-core'

const ROWS = [{ id: 1, name: 'Alice' }]
const COLUMNS = [{ accessorKey: 'name' as const }]

describe('grid event ownership', () => {
	it('Enter saves only the creating row that received it', async () => {
		const first = vi.fn()
		const second = vi.fn()
		const { container } = render(
			<>
				<DataGrid
					features={TEST_FEATURES}
					components={testComponents}
					data={ROWS}
					columns={COLUMNS}
					creating={{ mode: 'pin-row', onSave: first }}
				/>
				<DataGrid
					features={TEST_FEATURES}
					components={testComponents}
					data={ROWS}
					columns={COLUMNS}
					creating={{ mode: 'pin-row', onSave: second }}
				/>
			</>,
		)
		const input = container.querySelectorAll('[data-creating-row] input')[1]
		if (!input) throw new Error('missing second draft input')
		fireEvent.keyDown(input, { key: 'Enter' })
		await waitFor(() => {
			expect(second).toHaveBeenCalledTimes(1)
		})
		expect(first).not.toHaveBeenCalled()
	})

	it('a nested grid owns its key events instead of the enclosing grid', async () => {
		const outer = vi.fn()
		const inner = vi.fn()
		const { container } = render(
			<DataGrid
				features={TEST_FEATURES}
				components={testComponents}
				data={ROWS}
				columns={COLUMNS}
				creating={{ mode: 'pin-row', onSave: outer }}
			>
				<DataGrid.Table />
				<DataGrid
					features={TEST_FEATURES}
					data={ROWS}
					columns={COLUMNS}
					creating={{ mode: 'pin-row', onSave: inner }}
				/>
			</DataGrid>,
		)
		const input = container.querySelectorAll('[data-creating-row] input')[1]
		if (!input) throw new Error('missing nested draft input')
		fireEvent.keyDown(input, { key: 'Enter' })
		await waitFor(() => {
			expect(inner).toHaveBeenCalledTimes(1)
		})
		expect(outer).not.toHaveBeenCalled()
	})

	it('a portalled editor keeps the ownership of its grid', async () => {
		function PortalEditor({ value, onChange }: FieldState<unknown, string>) {
			return createPortal(
				<input
					value={value}
					onChange={(event) => {
						onChange(event.target.value)
					}}
				/>,
				document.body,
			)
		}
		const columns = [{ accessorKey: 'name' as const, editing: { component: PortalEditor } }]
		const first = vi.fn()
		const second = vi.fn()
		render(
			<>
				<DataGrid
					features={TEST_FEATURES}
					components={testComponents}
					data={ROWS}
					columns={columns}
					editing={{ mode: 'cell', onSave: first }}
				/>
				<DataGrid
					features={TEST_FEATURES}
					components={testComponents}
					data={[{ id: 2, name: 'Bob' }]}
					columns={columns}
					editing={{ mode: 'cell', onSave: second }}
				/>
			</>,
		)
		fireEvent.doubleClick(screen.getByText('Alice'))
		fireEvent.doubleClick(screen.getByText('Bob'))
		fireEvent.keyDown(screen.getByDisplayValue('Bob'), { key: 'Enter' })
		await waitFor(() => {
			expect(second).toHaveBeenCalledTimes(1)
		})
		expect(first).not.toHaveBeenCalled()
	})
})
