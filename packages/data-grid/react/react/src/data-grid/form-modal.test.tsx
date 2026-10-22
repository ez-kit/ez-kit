import { createColumns, ValidationError } from '@ez-kit/data-grid-core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'
import { useDataGridTable } from './table-context'

import type { FormModalProps } from '../types'
import type { CommitResult } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type User = { id: number; name: string; email: string; createdAt: string; version: number }

const USERS: User[] = [{ id: 7, name: 'A', email: 'a@example.com', createdAt: '2026-01-01', version: 3 }]
const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'createdAt', header: 'Created', editing: false, creating: false },
])

type Captured = { current: FormModalProps | undefined }

/** Opens the form from inside the grid, where the table is in context. */
function Opener({ edit, rowId = '7' }: { edit?: boolean; rowId?: string }) {
	const table = useDataGridTable()
	return (
		<button
			type='button'
			onClick={() => {
				if (edit) table.editing.start(rowId)
				else table.creating.start()
			}}
		>
			open
		</button>
	)
}

function renderModal(options: {
	feature: 'creating' | 'editing'
	onSave: (ctx: unknown) => void | Promise<void>
	validate?: (values: Record<string, unknown>) => { errors?: Record<string, string[]>; formError?: string } | null
	render: (props: FormModalProps) => ReactNode
}) {
	const isEditing = options.feature === 'editing'
	const config = {
		mode: 'modal' as const,
		onSave: options.onSave,
		...(options.validate ? { validate: options.validate } : {}),
	}
	return render(
		<DataGrid
			features={TEST_FEATURES}
			data={USERS}
			columns={COLUMNS}
			getRowId={(row) => String(row.id)}
			components={{ ...testComponents, editing: { FormModal: options.render } }}
			{...(isEditing ? { editing: config } : { creating: config })}
		>
			<Opener edit={isEditing} />
		</DataGrid>,
	)
}

function capture(captured: Captured, body: ReactNode = <span>custom form</span>) {
	return function CapturingFormModal(props: FormModalProps) {
		captured.current = props
		return body
	}
}

const open = () => {
	fireEvent.click(screen.getByRole('button', { name: 'open' }))
}

describe('a FormModal of one’s own — the whole form', () => {
	it('replaces the kit dialog, and nothing else renders a form', () => {
		const captured: Captured = { current: undefined }
		renderModal({ feature: 'creating', onSave: () => undefined, render: capture(captured) })

		open()

		expect(screen.getAllByText('custom form')).toHaveLength(1)
		// The kit slot renders the generated form; none of its fields may appear.
		expect(screen.queryByLabelText('Name')).toBeNull()
	})

	it('saves submit(values), unknown keys included, and closes on success', async () => {
		const onSave = vi.fn()
		const captured: Captured = { current: undefined }
		renderModal({ feature: 'creating', onSave, render: capture(captured) })
		open()

		let result: CommitResult | undefined
		await act(async () => {
			result = await captured.current?.submit({ name: 'B', note: 'fixed typo' })
		})

		expect(result).toEqual({ ok: true })
		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ values: { name: 'B', note: 'fixed typo' } }))
		expect(screen.queryByText('custom form')).toBeNull()
	})

	it('returns a ValidationError from onSave in the result and in the props, and stays open', async () => {
		const captured: Captured = { current: undefined }
		renderModal({
			feature: 'creating',
			onSave: () => Promise.reject(new ValidationError({ errors: { email: ['taken'] } })),
			render: capture(captured),
		})
		open()

		let result: CommitResult | undefined
		await act(async () => {
			result = await captured.current?.submit({ email: 'a@example.com' })
		})

		expect(result).toEqual({ ok: false, reason: 'rejected', errors: { email: ['taken'] }, formError: null })
		expect(captured.current?.errors).toEqual({ email: ['taken'] })
		expect(screen.getByText('custom form')).toBeTruthy()
	})

	it('surfaces a form-level validator error in formError', async () => {
		const captured: Captured = { current: undefined }
		renderModal({
			feature: 'creating',
			onSave: () => undefined,
			validate: () => ({ formError: 'Passwords do not match' }),
			render: capture(captured),
		})
		open()

		let result: CommitResult | undefined
		await act(async () => {
			result = await captured.current?.submit({})
		})

		expect(result).toEqual({ ok: false, reason: 'rejected', errors: {}, formError: 'Passwords do not match' })
		expect(captured.current?.formError).toBe('Passwords do not match')
	})

	it('saves once when submit is called twice while saving', async () => {
		let release = (): void => undefined
		const onSave = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					release = resolve
				}),
		)
		const captured: Captured = { current: undefined }
		renderModal({ feature: 'creating', onSave, render: capture(captured) })
		open()

		// The first submit gets an `act` of its own: React 18 flushes the pending render only when
		// an `act` ends, so a `waitFor` inside the same one would never see `isPending`.
		let first: Promise<CommitResult> | undefined
		act(() => {
			first = captured.current?.submit({ name: 'B' })
		})
		await waitFor(() => {
			expect(captured.current?.isPending).toBe(true)
		})
		await act(async () => {
			const second = captured.current?.submit({ name: 'B' })
			release()
			await Promise.all([first, second])
		})

		expect(onSave).toHaveBeenCalledTimes(1)
	})

	it('validate(values) checks without touching the grid state', async () => {
		const captured: Captured = { current: undefined }
		renderModal({
			feature: 'creating',
			onSave: () => undefined,
			validate: (values) => (values.email === 'x' ? { errors: { email: ['invalid'] } } : null),
			render: capture(captured),
		})
		open()

		const result = await captured.current?.validate({ email: 'x' })

		expect(result).toEqual({ errors: { email: ['invalid'] } })
		expect(captured.current?.errors).toEqual({})
	})

	it('passes no row when creating, and the original row when editing', () => {
		const creating: Captured = { current: undefined }
		const { unmount } = renderModal({ feature: 'creating', onSave: () => undefined, render: capture(creating) })
		open()
		expect(creating.current?.row).toBeUndefined()
		unmount()

		const editing: Captured = { current: undefined }
		renderModal({ feature: 'editing', onSave: () => undefined, render: capture(editing) })
		open()
		expect(editing.current?.row).toBe(USERS[0])
	})

	it('seeds initialValues with the form fields only', () => {
		const captured: Captured = { current: undefined }
		renderModal({ feature: 'editing', onSave: () => undefined, render: capture(captured) })
		open()

		expect(captured.current?.initialValues).toEqual({ name: 'A', email: 'a@example.com' })
	})

	it('hands onSave the row beside the values when editing', async () => {
		const onSave = vi.fn()
		const captured: Captured = { current: undefined }
		renderModal({ feature: 'editing', onSave, render: capture(captured) })
		open()

		await act(async () => {
			await captured.current?.submit({ name: 'B' })
		})

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ row: USERS[0], values: { name: 'B' } }))
	})
})

describe('a FormModal of one’s own — the generated fields in a layout', () => {
	it('renders the generated fields one by one and saves them with submit()', async () => {
		const onSave = vi.fn()
		const captured: Captured = { current: undefined }
		renderModal({
			feature: 'editing',
			onSave,
			render: function LayoutFormModal(props) {
				captured.current = props
				return (
					<section aria-label='my layout'>
						<div data-testid='right'>{props.fields.email}</div>
						<div data-testid='left'>{props.fields.name}</div>
					</section>
				)
			},
		})
		open()

		expect(Object.keys(captured.current?.fields ?? {})).toEqual(['name', 'email'])
		fireEvent.change(screen.getByDisplayValue('A'), { target: { value: 'B' } })
		fireEvent.change(screen.getByDisplayValue('a@example.com'), { target: { value: 'b@example.com' } })
		await act(async () => {
			await captured.current?.submit()
		})

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ values: { name: 'B', email: 'b@example.com' } }))
	})

	it('leaves a column with creating: false out of the create form’s fields', () => {
		const captured: Captured = { current: undefined }
		renderModal({ feature: 'creating', onSave: () => undefined, render: capture(captured) })
		open()

		expect(captured.current?.fields).not.toHaveProperty('createdAt')
	})
})

describe('form modal — the kit slot', () => {
	it('hands the slot the mode and the generated form as children', () => {
		const captured: Captured = { current: undefined }
		renderModal({
			feature: 'editing',
			onSave: () => undefined,
			render: function ChildrenFormModal(props) {
				captured.current = props
				return <div role='dialog'>{props.children}</div>
			},
		})
		open()

		expect(captured.current?.mode).toBe('editing')
		expect(screen.getByRole('dialog').querySelectorAll('[data-slot="auto-form-field"]')).toHaveLength(2)
	})

	it('names FormModal when the kit registers none', () => {
		const { FormModal: _omit, ...editing } = testComponents.editing
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		expect(() =>
			render(
				<DataGrid
					features={TEST_FEATURES}
					data={USERS}
					columns={COLUMNS}
					components={{ ...testComponents, editing }}
					editing={{ mode: 'modal', onSave: () => undefined }}
				/>,
			),
		).toThrow(/FormModal \(editing\)/)

		errorSpy.mockRestore()
	})
})

describe('a FormModal of one’s own — fields cost nothing until rendered', () => {
	type Order = { id: number; warehouse: string }
	const ORDERS: Order[] = [{ id: 1, warehouse: 'wh_1' }]

	function renderOrders(FormModal: (props: FormModalProps) => ReactNode, useEditingItems: () => unknown) {
		const columns = createColumns<Order>([
			{
				accessorKey: 'warehouse',
				header: 'Warehouse',
				cell: { type: 'select', config: { items: [] } },
				editing: { useItems: useEditingItems as never },
			},
		])
		render(
			<DataGrid
				features={TEST_FEATURES}
				data={ORDERS}
				columns={columns}
				getRowId={(row) => String(row.id)}
				components={{ ...testComponents, editing: { FormModal } }}
				editing={{ mode: 'modal', onSave: () => undefined }}
			>
				<Opener
					edit
					rowId='1'
				/>
			</DataGrid>,
		)
		fireEvent.click(screen.getByRole('button', { name: 'open' }))
	}

	const ready = () => ({ items: [], isLoading: false })

	it('reads no field list when the slot renders no field', () => {
		const useEditingItems = vi.fn(ready)
		renderOrders(() => <span>own form</span>, useEditingItems)

		expect(screen.getByText('own form')).toBeTruthy()
		expect(useEditingItems).not.toHaveBeenCalled()
	})

	it('reads the list once the slot renders that field', () => {
		const useEditingItems = vi.fn(ready)
		renderOrders((props) => <div>{props.fields.warehouse}</div>, useEditingItems)

		expect(useEditingItems).toHaveBeenCalled()
	})
})
