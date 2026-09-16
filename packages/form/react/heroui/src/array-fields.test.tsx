import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ArrayField, ArrayItem } from './blocks/array'
import { Form } from './form'

import type { ReactNode } from 'react'

/**
 * The kit's two repeatable-group slots.
 *
 * They are driven here through the **contract props directly**, not through `form.ArrayField`:
 * the slots' whole job is to turn one flat props object into HeroUI's anatomy, and a harness
 * that owns the list state exercises exactly that — including the two states a real form
 * reaches only at a `maxLength` bound or at the ends of a list.
 *
 * The harness mirrors what the adapter does: stable per-entry keys that survive a removal
 * (never the index — see D11 of the design), so "remove the middle one" asserts the property
 * that matters, that the survivors keep their own values.
 */

type Entry = { key: string; value: string }

const ADD_LABEL = 'Add person'
const REMOVE_LABEL = 'Remove'
const LIST_LABEL = 'People'
const LIST_DESCRIPTION = 'At least one.'
const FIELD_NAME = 'people'
// Resolved captions, as the adapter hands them down. Present on every entry, including the one
// whose move is impossible, so the disabled control still has an accessible name.
const MOVE_UP = 'Move up'
const MOVE_DOWN = 'Move down'

const INITIAL: readonly Entry[] = [
	{ key: 'a', value: 'Анна' },
	{ key: 'b', value: 'Борис' },
	{ key: 'c', value: 'Виктор' },
]

type ListProps = {
	entries?: readonly Entry[]
	reorderable?: boolean
	/** `undefined` means unbounded, mirroring an absent `validate.maxLength`. */
	maxEntries?: number
	errors?: string[]
	itemLabel?: boolean
	disabled?: boolean
}

function List({
	entries: seed = INITIAL,
	reorderable = false,
	errors = [],
	itemLabel = false,
	disabled,
	maxEntries,
}: ListProps): ReactNode {
	const [entries, setEntries] = useState<readonly Entry[]>(seed)
	const [nextKey, setNextKey] = useState(0)

	const move = (from: number, to: number) => {
		setEntries((current) => {
			const moved = current[from]
			if (moved === undefined) return current
			const without = [...current.slice(0, from), ...current.slice(from + 1)]
			return [...without.slice(0, to), moved, ...without.slice(to)]
		})
	}

	return (
		<ArrayField
			data-field={FIELD_NAME}
			data-field-type='array'
			name={FIELD_NAME}
			label={LIST_LABEL}
			description={LIST_DESCRIPTION}
			errors={errors}
			invalid={errors.length > 0}
			disabled={disabled}
			required={undefined}
			addLabel={ADD_LABEL}
			canAdd={maxEntries === undefined || entries.length < maxEntries}
			onAdd={() => {
				setEntries((current) => [...current, { key: `new-${String(nextKey)}`, value: '' }])
				setNextKey((current) => current + 1)
			}}
		>
			{entries.map((entry, index) => (
				<ArrayItem
					key={entry.key}
					data-index={index}
					index={index}
					label={itemLabel ? `Person ${String(index + 1)}` : null}
					removeLabel={REMOVE_LABEL}
					moveUpLabel={MOVE_UP}
					moveDownLabel={MOVE_DOWN}
					disabled={disabled}
					onRemove={() => {
						setEntries((current) => [...current.slice(0, index), ...current.slice(index + 1)])
					}}
					onMoveUp={
						reorderable && index > 0
							? () => {
									move(index, index - 1)
								}
							: undefined
					}
					onMoveDown={
						reorderable && index < entries.length - 1
							? () => {
									move(index, index + 1)
								}
							: undefined
					}
				>
					<input
						aria-label={`Name ${String(index + 1)}`}
						value={entry.value}
						onChange={(event) => {
							const { value } = event.target
							setEntries((current) => current.map((item, at) => (at === index ? { ...item, value } : item)))
						}}
					/>
				</ArrayItem>
			))}
		</ArrayField>
	)
}

/** The entries, in document order. */
function items(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>('[data-slot="form-array-item"]'))
}

/** One entry by position. Throws rather than returning `undefined`, so a test reads without casts. */
function itemAt(container: HTMLElement, index: number): HTMLElement {
	const item = items(container)[index]
	if (item === undefined) throw new Error(`No entry at index ${String(index)}`)
	return item
}

function values(container: HTMLElement): string[] {
	return items(container).map((item) => within(item).getByRole('textbox').getAttribute('value') ?? '')
}

/** HeroUI's `Button` disables through React Aria, which may use either spelling. */
function isDisabled(element: HTMLElement): boolean {
	return element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true'
}

describe('@ez-kit/form-heroui array field', () => {
	it('renders the list label, description and one root per entry', () => {
		const { container } = render(<List />)

		expect(screen.getByText(LIST_LABEL)).toBeInTheDocument()
		expect(screen.getByText(LIST_DESCRIPTION)).toBeInTheDocument()
		expect(items(container)).toHaveLength(3)
		expect(container.querySelector(`[data-field="${FIELD_NAME}"]`)).toHaveAttribute('data-field-type', 'array')
		expect(items(container).map((item) => item.getAttribute('data-index'))).toEqual(['0', '1', '2'])
	})

	it('appends an entry when the add control is pressed', async () => {
		const user = userEvent.setup()
		const { container } = render(<List />)

		await user.click(screen.getByRole('button', { name: ADD_LABEL }))

		expect(values(container)).toEqual(['Анна', 'Борис', 'Виктор', ''])
	})

	it('keeps every survivor on its own value when the middle entry is removed', async () => {
		const user = userEvent.setup()
		const { container } = render(<List />)

		await user.click(within(itemAt(container, 1)).getByRole('button', { name: REMOVE_LABEL }))

		expect(values(container)).toEqual(['Анна', 'Виктор'])
		// The indices renumber, which is the point of `data-index` being derived rather than stored.
		expect(items(container).map((item) => item.getAttribute('data-index'))).toEqual(['0', '1'])
	})

	it('renders the add control disabled rather than removing it once `canAdd` is false', () => {
		render(<List maxEntries={3} />)

		const add = screen.getByRole('button', { name: ADD_LABEL })
		expect(add).toBeInTheDocument()
		expect(isDisabled(add)).toBe(true)
	})

	it('shows the list-level errors, which are not any entry field’s', () => {
		render(<List errors={['At least 5 items.']} />)

		expect(screen.getByText('At least 5 items.')).toBeInTheDocument()
	})

	it('renders an entry caption only when the author gave one', () => {
		const { rerender } = render(<List />)
		expect(screen.queryByText('Person 1')).toBeNull()

		rerender(<List itemLabel />)
		expect(screen.getByText('Person 1')).toBeInTheDocument()
	})
})

describe('@ez-kit/form-heroui array reorder controls', () => {
	it('draws no move controls when reordering is off', () => {
		render(<List />)

		// Exact names, not a `/move/i` regex — "Remove" contains "move".
		expect(screen.queryAllByRole('button', { name: MOVE_UP })).toHaveLength(0)
		expect(screen.queryAllByRole('button', { name: MOVE_DOWN })).toHaveLength(0)
	})

	it('disables the move that is impossible from this position and enables the other', () => {
		const { container } = render(<List reorderable />)

		const up = (index: number) => within(itemAt(container, index)).getByRole('button', { name: MOVE_UP })
		const down = (index: number) => within(itemAt(container, index)).getByRole('button', { name: MOVE_DOWN })

		expect(isDisabled(up(0))).toBe(true)
		expect(isDisabled(down(0))).toBe(false)

		expect(isDisabled(up(1))).toBe(false)
		expect(isDisabled(down(1))).toBe(false)

		expect(isDisabled(up(2))).toBe(false)
		expect(isDisabled(down(2))).toBe(true)
	})

	it('disables every entry control when the list is disabled', () => {
		const { container } = render(
			<List
				reorderable
				disabled
			/>,
		)

		for (const caption of [REMOVE_LABEL, MOVE_UP, MOVE_DOWN]) {
			for (const index of [0, 1, 2]) {
				expect(isDisabled(within(itemAt(container, index)).getByRole('button', { name: caption }))).toBe(true)
			}
		}

		// The add control is disabled by the native `<fieldset disabled>` rather than by a prop of
		// its own, which `toBeDisabled` resolves through the ancestor; `isDisabled` reads only the
		// element's own attributes and would miss it.
		expect(screen.getByRole('button', { name: ADD_LABEL })).toBeDisabled()
	})

	it('moves an entry, and its value with it', async () => {
		const user = userEvent.setup()
		const { container } = render(<List reorderable />)

		await user.click(within(itemAt(container, 1)).getByRole('button', { name: MOVE_UP }))

		expect(values(container)).toEqual(['Борис', 'Анна', 'Виктор'])
	})
})

/**
 * The same two slots, driven through the **real** adapter rather than a harness.
 *
 * The harness above proves the slots turn contract props into HeroUI's anatomy; this proves the
 * adapter and the kit agree — that `form.ArrayField` reaches `FormComponents['ArrayField']`,
 * that the entries' fields bind to the right paths, and that removing the middle entry submits
 * the survivors rather than a phantom element (P1, variant A, in the design).
 */

type Person = { firstName: string }
type PeopleValues = { people: Person[] }

const PEOPLE: PeopleValues = {
	people: [{ firstName: 'Анна' }, { firstName: 'Борис' }, { firstName: 'Виктор' }],
}

function BoundList({ onSubmit }: { onSubmit: (value: PeopleValues) => void }): ReactNode {
	return (
		<Form
			defaultValues={PEOPLE}
			onSubmit={({ value }) => {
				onSubmit(value)
			}}
		>
			{(form) => (
				<>
					<form.ArrayField
						name='people'
						label={LIST_LABEL}
						addLabel={ADD_LABEL}
						removeLabel={REMOVE_LABEL}
						newItem={{ firstName: '' }}
						reorderable
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index + 1)}`}
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

describe('@ez-kit/form-heroui array field, bound to the adapter', () => {
	it('submits the survivors when the middle entry is removed', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		const { container } = render(<BoundList onSubmit={submitted} />)

		expect(items(container)).toHaveLength(3)
		await user.click(within(itemAt(container, 1)).getByRole('button', { name: REMOVE_LABEL }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		expect(submitted).toHaveBeenCalledWith({ people: [{ firstName: 'Анна' }, { firstName: 'Виктор' }] })
	})

	it('appends an entry built from `newItem`, and binds it to its own path', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		const { container } = render(<BoundList onSubmit={submitted} />)

		await user.click(screen.getByRole('button', { name: ADD_LABEL }))
		expect(items(container)).toHaveLength(4)

		await user.type(within(itemAt(container, 3)).getByRole('textbox'), 'Галина')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		expect(submitted).toHaveBeenCalledWith({
			people: [{ firstName: 'Анна' }, { firstName: 'Борис' }, { firstName: 'Виктор' }, { firstName: 'Галина' }],
		})
	})
})

/**
 * `within(screen.getByRole('banner'))` — the brief's original query — assumes `<header>` maps
 * to the `banner` landmark role. It does not once the `<header>` is nested inside a `<section>`:
 * per the ARIA spec `banner` is scoped to a page-level header, so the query comes back empty.
 * `aria-label='People'` on the header sidesteps that rather than weakening the assertion to a
 * bare `getAllByRole('button')[0]` — the point of this case is that the add control sits in the
 * section heading, a placement the composition (`form.ArrayField`) cannot reach.
 */
const CUSTOM_LAYOUT_HEADER_LABEL = 'People'

/** This case's own `removeLabel`, distinct from the kit-level `REMOVE_LABEL` above. */
const CUSTOM_LAYOUT_REMOVE_LABEL = 'Remove person'

/**
 * The section heading, found by its `aria-label` rather than a role — a `<header>` nested
 * inside a `<section>` carries no exposed ARIA role of its own (`banner` is reserved for a
 * page-level header), so `getByRole` cannot reach it.
 */
function customLayoutHeader(): HTMLElement {
	const found = document.querySelector<HTMLElement>(`header[aria-label="${CUSTOM_LAYOUT_HEADER_LABEL}"]`)
	if (found === null) throw new Error('expected the custom layout header')
	return found
}

/** First match, or a failure that names the problem — `[0]` alone is possibly-undefined here. */
function first<T>(items: readonly T[]): T {
	const [head] = items
	if (head === undefined) throw new Error('expected at least one match')
	return head
}

describe('the bare primitive through this kit', () => {
	it('renders the kit row inside a form.Array with a custom layout', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()

		render(
			<Form
				defaultValues={{ people: [{ name: 'Ada' }, { name: 'Grace' }] }}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => (
					<>
						<form.Array
							name='people'
							newItem={{ name: '' }}
						>
							{({ items, add, canAdd, Button }) => (
								<section>
									<header aria-label={CUSTOM_LAYOUT_HEADER_LABEL}>
										<h3>{CUSTOM_LAYOUT_HEADER_LABEL}</h3>
										<Button
											onClick={() => {
												add()
											}}
											disabled={!canAdd}
										>
											{ADD_LABEL}
										</Button>
									</header>
									{items.map((item) => (
										<item.Item
											key={item.key}
											removeLabel={CUSTOM_LAYOUT_REMOVE_LABEL}
										>
											<item.TextField
												name='name'
												label={`Name ${String(item.index)}`}
											/>
										</item.Item>
									))}
								</section>
							)}
						</form.Array>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		expect(document.querySelectorAll('[data-slot="form-array-item"]')).toHaveLength(2)

		// The add control sits in the section heading — a placement the composition cannot reach.
		await user.click(within(customLayoutHeader()).getByRole('button', { name: ADD_LABEL }))
		expect(document.querySelectorAll('[data-slot="form-array-item"]')).toHaveLength(3)

		await user.click(first(screen.getAllByRole('button', { name: CUSTOM_LAYOUT_REMOVE_LABEL })))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ name: 'Grace' }, { name: '' }] })
		})
	})
})
