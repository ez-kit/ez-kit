import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCallback, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ArrayField, ArrayItem } from './blocks/array'
import { Form } from './form'

import type { ReactNode } from 'react'

/**
 * The kit's two array slots.
 *
 * They are driven here through a harness rather than through `Form`, because the two slots are
 * the *only* part of the feature this package owns: `@ez-kit/form-react` decides the entries,
 * their stable keys and which move handlers exist, and hands the result to the kit already
 * resolved. The harness therefore reproduces exactly what the adapter passes — entries keyed by
 * a stable id, never by the index — so that removing an entry from the middle exercises the
 * defect the design doc's P1 records: the survivors must keep their own values and their own
 * control-local state, not inherit their neighbour's.
 *
 * The last block then drives the **real** `form.ArrayField` through this kit, so the same
 * removal is checked against what the form actually submits rather than against a harness.
 */

type Entry = { key: string; value: string }

const ADD_LABEL = 'Add person'
const REMOVE_LABEL = 'Remove person'
const MOVE_UP_LABEL = 'Earlier'
const MOVE_DOWN_LABEL = 'Later'

/** Only the harness-facing knobs; everything else the slots receive is fixed below. */
type HarnessProps = {
	initial?: readonly string[]
	maxEntries?: number
	reorderable?: boolean
	errors?: string[]
	itemLabel?: (index: number) => ReactNode
	disabled?: boolean
}

function Harness({
	initial = ['Anna', 'Boris', 'Viktor'],
	maxEntries,
	reorderable,
	errors = [],
	itemLabel,
	disabled,
}: HarnessProps) {
	const [entries, setEntries] = useState<readonly Entry[]>(() =>
		initial.map((value, index) => ({ key: `seed-${String(index)}`, value })),
	)

	const setValue = useCallback((key: string, value: string) => {
		setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, value } : entry)))
	}, [])

	const move = useCallback((from: number, to: number) => {
		setEntries((current) => {
			const next = [...current]
			const [moved] = next.splice(from, 1)
			if (moved !== undefined) next.splice(to, 0, moved)
			return next
		})
	}, [])

	return (
		<ArrayField
			data-field='people'
			data-field-type='array'
			name='people'
			label='People'
			description='Everyone travelling'
			errors={errors}
			invalid={errors.length > 0}
			disabled={disabled}
			required={undefined}
			addLabel={ADD_LABEL}
			canAdd={maxEntries === undefined || entries.length < maxEntries}
			onAdd={() => {
				setEntries((current) => [...current, { key: `added-${String(current.length)}`, value: '' }])
			}}
		>
			{entries.map((entry, index) => (
				<ArrayItem
					key={entry.key}
					data-index={index}
					index={index}
					label={itemLabel?.(index) ?? null}
					removeLabel={REMOVE_LABEL}
					moveUpLabel={MOVE_UP_LABEL}
					moveDownLabel={MOVE_DOWN_LABEL}
					disabled={disabled}
					onRemove={() => {
						setEntries((current) => current.filter((candidate) => candidate.key !== entry.key))
					}}
					onMoveUp={
						reorderable === true && index > 0
							? () => {
									move(index, index - 1)
								}
							: undefined
					}
					onMoveDown={
						reorderable === true && index < entries.length - 1
							? () => {
									move(index, index + 1)
								}
							: undefined
					}
				>
					<label>
						Name
						<input
							value={entry.value}
							onChange={(event) => {
								setValue(entry.key, event.target.value)
							}}
						/>
					</label>
				</ArrayItem>
			))}
		</ArrayField>
	)
}

function rows(): HTMLElement[] {
	return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="form-array-item"]'))
}

/** The entry at `index`, or a named failure — `noUncheckedIndexedAccess` makes the check real. */
function row(index: number): HTMLElement {
	const found = rows()[index]
	if (found === undefined) throw new Error(`no array entry at index ${String(index)}`)
	return found
}

function input(row: HTMLElement): HTMLInputElement {
	return within(row).getByRole('textbox', { name: 'Name' })
}

function values(): string[] {
	return rows().map((row) => input(row).value)
}

describe('@ez-kit/form-shadcn ArrayField', () => {
	it('renders the list chrome and one row per entry', () => {
		render(<Harness />)

		const list = document.querySelector('[data-slot="form-array"]')
		expect(list).not.toBeNull()
		expect(list?.getAttribute('data-field')).toBe('people')
		expect(list?.getAttribute('data-field-type')).toBe('array')
		expect(screen.getByText('People')).toBeInTheDocument()
		expect(screen.getByText('Everyone travelling')).toBeInTheDocument()
		expect(rows()).toHaveLength(3)
		expect(rows().map((row) => row.getAttribute('data-index'))).toEqual(['0', '1', '2'])
	})

	it('appends an entry when the add control is pressed', async () => {
		const user = userEvent.setup()
		render(<Harness initial={['Anna']} />)

		await user.click(screen.getByRole('button', { name: ADD_LABEL }))

		expect(rows()).toHaveLength(2)
		expect(values()).toEqual(['Anna', ''])
	})

	it('renders the add control disabled rather than removing it when `canAdd` is false', async () => {
		const user = userEvent.setup()
		const onAdd = vi.fn()
		render(
			<ArrayField
				data-field='people'
				data-field-type='array'
				name='people'
				label='People'
				description={null}
				errors={[]}
				invalid={false}
				disabled={undefined}
				required={undefined}
				addLabel={ADD_LABEL}
				canAdd={false}
				onAdd={onAdd}
			>
				{null}
			</ArrayField>,
		)

		const add = screen.getByRole('button', { name: ADD_LABEL })
		expect(add).toBeDisabled()

		await user.click(add)
		expect(onAdd).not.toHaveBeenCalled()
	})

	it('renders the list’s own errors', () => {
		render(<Harness errors={['At least 2 items']} />)

		const error = document.querySelector('[data-slot="form-array-error"]')
		expect(error?.textContent).toBe('At least 2 items')
		expect(document.querySelector('[data-slot="form-array"]')?.getAttribute('data-invalid')).toBe('true')
	})
})

describe('@ez-kit/form-shadcn ArrayItem', () => {
	it('removes the entry it belongs to, and the survivors keep their own values', async () => {
		const user = userEvent.setup()
		render(<Harness />)

		expect(values()).toEqual(['Anna', 'Boris', 'Viktor'])

		await user.click(within(row(1)).getByRole('button', { name: REMOVE_LABEL }))

		expect(rows()).toHaveLength(2)
		expect(values()).toEqual(['Anna', 'Viktor'])
		expect(rows().map((row) => row.getAttribute('data-index'))).toEqual(['0', '1'])
	})

	it('keeps a survivor’s typed value after the entry before it is removed', async () => {
		const user = userEvent.setup()
		render(<Harness initial={['', '', '']} />)

		await user.type(input(row(0)), 'one')
		await user.type(input(row(1)), 'two')
		await user.type(input(row(2)), 'three')
		expect(values()).toEqual(['one', 'two', 'three'])

		await user.click(within(row(1)).getByRole('button', { name: REMOVE_LABEL }))

		expect(values()).toEqual(['one', 'three'])
	})

	it('renders no reorder controls when both move handlers are absent', () => {
		render(<Harness />)

		expect(screen.queryByRole('button', { name: MOVE_UP_LABEL })).toBeNull()
		expect(screen.queryByRole('button', { name: MOVE_DOWN_LABEL })).toBeNull()
	})

	it('disables the impossible move and keeps the other one live', async () => {
		const user = userEvent.setup()
		render(<Harness reorderable />)

		const last = rows().length - 1
		expect(within(row(0)).getByRole('button', { name: MOVE_UP_LABEL })).toBeDisabled()
		expect(within(row(0)).getByRole('button', { name: MOVE_DOWN_LABEL })).toBeEnabled()
		expect(within(row(last)).getByRole('button', { name: MOVE_UP_LABEL })).toBeEnabled()
		expect(within(row(last)).getByRole('button', { name: MOVE_DOWN_LABEL })).toBeDisabled()

		await user.click(within(row(1)).getByRole('button', { name: MOVE_UP_LABEL }))
		expect(values()).toEqual(['Boris', 'Anna', 'Viktor'])
	})

	it('disables an entry\u2019s remove and move controls when the list is disabled', async () => {
		const user = userEvent.setup()
		render(
			<Harness
				reorderable
				disabled
			/>,
		)

		// The middle entry is the one whose moves are both possible, so nothing here is disabled
		// for the ordinary end-of-list reason.
		const middle = row(1)
		expect(within(middle).getByRole('button', { name: REMOVE_LABEL })).toBeDisabled()
		expect(within(middle).getByRole('button', { name: MOVE_UP_LABEL })).toBeDisabled()
		expect(within(middle).getByRole('button', { name: MOVE_DOWN_LABEL })).toBeDisabled()
		expect(screen.getByRole('button', { name: ADD_LABEL })).toBeDisabled()

		await user.click(within(middle).getByRole('button', { name: REMOVE_LABEL }))
		expect(values()).toEqual(['Anna', 'Boris', 'Viktor'])
	})

	it('renders the entry caption only when the author gave one', () => {
		const { unmount } = render(<Harness />)
		expect(document.querySelector('[data-slot="form-array-item-label"]')).toBeNull()
		unmount()

		render(<Harness itemLabel={(index) => `Person ${String(index + 1)}`} />)
		expect(screen.getByText('Person 1')).toBeInTheDocument()
		expect(screen.getByText('Person 3')).toBeInTheDocument()
	})
})

/**
 * The slots as the adapter actually drives them.
 *
 * Everything above pins the kit's own rendering; this pins the seam — that the entries this kit
 * draws are bound to the right paths, and that removing one from the middle leaves the survivors'
 * *values* intact and not just their markup.
 */

type Person = { firstName: string }
type People = { people: Person[] }

/** What `reorderable={{ up, down }}` supplies, so the bound case names its own move controls. */
const BOUND_MOVE_UP_LABEL = 'Move earlier'
const BOUND_MOVE_DOWN_LABEL = 'Move later'

const PEOPLE: People = { people: [{ firstName: 'Anna' }, { firstName: 'Boris' }, { firstName: 'Viktor' }] }

function BoundCase({ onSubmit, maxLength }: { onSubmit?: (value: People) => void; maxLength?: number }) {
	return (
		<Form
			defaultValues={PEOPLE}
			onSubmit={({ value }) => {
				onSubmit?.(value)
			}}
		>
			{(form) => (
				<>
					<form.ArrayField
						name='people'
						label='People'
						newItem={{ firstName: '' }}
						addLabel={ADD_LABEL}
						removeLabel={REMOVE_LABEL}
						reorderable={{ up: { label: BOUND_MOVE_UP_LABEL }, down: { label: BOUND_MOVE_DOWN_LABEL } }}
						{...(maxLength === undefined ? {} : { validate: { maxLength } })}
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<item.TextField
										name='firstName'
										label='Name'
									/>
								</item.Item>
							))
						}
					</form.ArrayField>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}

describe('@ez-kit/form-shadcn array slots, bound to the form', () => {
	it('submits the entry the add control appended', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		render(<BoundCase onSubmit={submitted} />)

		await user.click(screen.getByRole('button', { name: ADD_LABEL }))
		await user.type(input(row(3)), 'Galina')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		expect(submitted).toHaveBeenCalledWith({
			people: [{ firstName: 'Anna' }, { firstName: 'Boris' }, { firstName: 'Viktor' }, { firstName: 'Galina' }],
		})
	})

	it('removes the middle entry and submits the survivors, values and all', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		render(<BoundCase onSubmit={submitted} />)

		await user.clear(input(row(2)))
		await user.type(input(row(2)), 'Viktor Jr')
		await user.click(within(row(1)).getByRole('button', { name: REMOVE_LABEL }))

		expect(values()).toEqual(['Anna', 'Viktor Jr'])

		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(submitted).toHaveBeenCalledWith({ people: [{ firstName: 'Anna' }, { firstName: 'Viktor Jr' }] })
	})

	it('moves an entry and submits the new order', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		render(<BoundCase onSubmit={submitted} />)

		await user.click(within(row(1)).getByRole('button', { name: BOUND_MOVE_UP_LABEL }))
		expect(values()).toEqual(['Boris', 'Anna', 'Viktor'])

		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(submitted).toHaveBeenCalledWith({
			people: [{ firstName: 'Boris' }, { firstName: 'Anna' }, { firstName: 'Viktor' }],
		})
	})

	it('disables the add control once the `maxLength` bound is reached', () => {
		render(<BoundCase maxLength={3} />)

		expect(screen.getByRole('button', { name: ADD_LABEL })).toBeDisabled()
	})
})
