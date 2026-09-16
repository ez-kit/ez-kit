import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { memo, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

import type { ReactNode } from 'react'

type Person = { firstName: string }
type Values = { title: string; people: Person[] }

/** First match, or a failure that names the problem — `[0]` alone is possibly-undefined here. */
function first<T>(items: readonly T[]): T {
	const [head] = items
	if (head === undefined) throw new Error('expected at least one match')
	return head
}

/** Last match, or a failure that names the problem — indexing off the end is possibly-undefined. */
function last<T>(items: readonly T[]): T {
	const tail = items[items.length - 1]
	if (tail === undefined) throw new Error('expected at least one match')
	return tail
}

const { Form } = createForm({ components: testComponents })

const NEW_PERSON: Person = { firstName: '' }

function PeopleForm({
	onSubmit,
	defaults,
	reorderable,
	maxLength,
}: {
	onSubmit?: (values: Values) => void
	defaults?: Values
	reorderable?: boolean
	maxLength?: number
}) {
	return (
		<Form
			defaultValues={defaults ?? { title: '', people: [] }}
			onSubmit={({ value }) => {
				onSubmit?.(value)
			}}
		>
			{(form) => (
				<>
					<form.ArrayField
						name='people'
						label='People'
						newItem={NEW_PERSON}
						addLabel='Add person'
						removeLabel='Remove'
						{...(reorderable === undefined ? {} : { reorderable })}
						{...(maxLength === undefined ? {} : { validate: { maxLength } })}
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
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

const nameBox = (index: number): HTMLInputElement => screen.getByLabelText(`Name ${String(index)}`)

describe('form.ArrayField', () => {
	it('appends an entry and submits it under the array path', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<PeopleForm onSubmit={onSubmit} />)

		await user.click(screen.getByRole('button', { name: 'Add person' }))
		await user.type(nameBox(0), 'Анна')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ title: '', people: [{ firstName: 'Анна' }] })
		})
	})

	it('names each entry by its real path, so a field writes into its own item', async () => {
		const user = userEvent.setup()
		render(<PeopleForm />)

		await user.click(screen.getByRole('button', { name: 'Add person' }))
		await user.click(screen.getByRole('button', { name: 'Add person' }))

		expect(nameBox(0)).toHaveAttribute('name', 'people[0].firstName')
		expect(nameBox(1)).toHaveAttribute('name', 'people[1].firstName')
	})

	it('keeps the surviving entries and their values when one is removed from the middle', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<PeopleForm
				onSubmit={onSubmit}
				defaults={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }, { firstName: 'C' }] }}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Remove 1' }))

		expect(nameBox(0)).toHaveValue('A')
		expect(nameBox(1)).toHaveValue('C')

		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ title: '', people: [{ firstName: 'A' }, { firstName: 'C' }] })
		})
	})

	it('does not remount the entries that survive a removal from the middle', async () => {
		// The defect this guards against is invisible in form values: a remount loses whatever
		// state lives inside the control — an open calendar, a caret, a half-typed search query —
		// while the submitted data still looks right. The counter stands in for that state.
		const mounts = vi.fn()

		function Counted() {
			useState(() => {
				mounts()
				return null
			})
			return null
		}

		const user = userEvent.setup()
		render(
			<Form defaultValues={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }, { firstName: 'C' }] }}>
				{(form) => (
					<form.ArrayField
						name='people'
						newItem={NEW_PERSON}
						removeLabel='Remove'
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<Counted />
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
									/>
								</item.Item>
							))
						}
					</form.ArrayField>
				)}
			</Form>,
		)

		expect(mounts).toHaveBeenCalledTimes(3)
		await user.click(screen.getByRole('button', { name: 'Remove 1' }))
		// Two entries remain and neither was rebuilt, so no further mount happened.
		expect(mounts).toHaveBeenCalledTimes(3)
	})

	it('keeps a field component’s own identity — not just its Item wrapper’s — across a removal from the middle', async () => {
		// The mount-counter test above instruments `Item`'s identity, a cache that predates this
		// task. This one instruments the *scoped field* itself — `item.TextField` here — whose
		// own per-key cache is what lets it resolve its path without `<item.Item>` around it. A
		// DOM node survives a re-render only if the component that rendered it kept its identity;
		// rebuilding the scoped field per render (a plausible simplification of the cache) would
		// still leave every value and every mount-counter-inside-`Item` assertion in this file
		// passing, since neither witnesses the field's own identity.
		const user = userEvent.setup()
		render(
			<PeopleForm defaults={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }, { firstName: 'C' }] }} />,
		)

		const survivor = nameBox(2)
		await user.click(screen.getByRole('button', { name: 'Remove 0' }))

		// The survivor renumbers from index 2 to index 1; a fresh DOM node here means the scoped
		// field was rebuilt for its new position instead of reused by key.
		expect(nameBox(1)).toBe(survivor)
	})

	it('offers no reorder controls unless asked, and disables the impossible move', async () => {
		const user = userEvent.setup()
		render(<PeopleForm defaults={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }} />)
		expect(screen.queryByRole('button', { name: 'up 0' })).toBeNull()

		render(
			<PeopleForm
				reorderable
				defaults={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }}
			/>,
		)
		const ups = screen.getAllByRole('button', { name: 'up 0' })
		expect(ups[0]).toBeDisabled()
		const downs = screen.getAllByRole('button', { name: 'down 1' })
		expect(downs[0]).toBeDisabled()
		await user.click(first(screen.getAllByRole('button', { name: 'down 0' })))
	})

	it('moves an entry and its value together', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<PeopleForm
				reorderable
				onSubmit={onSubmit}
				defaults={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'down 0' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ title: '', people: [{ firstName: 'B' }, { firstName: 'A' }] })
		})
	})

	it('disables the add control at `max` rather than hiding it', async () => {
		const user = userEvent.setup()
		render(
			<PeopleForm
				maxLength={2}
				defaults={{ title: '', people: [{ firstName: 'A' }] }}
			/>,
		)

		const add = screen.getByRole('button', { name: 'Add person' })
		expect(add).toBeEnabled()
		await user.click(add)
		expect(screen.getByRole('button', { name: 'Add person' })).toBeDisabled()
	})

	it("passes the list's disabled state down to every entry, so its chrome is inert too", () => {
		render(
			<Form defaultValues={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }}>
				{(form) => (
					<form.ArrayField
						name='people'
						newItem={NEW_PERSON}
						removeLabel='Remove'
						reorderable
						disabled
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
									/>
								</item.Item>
							))
						}
					</form.ArrayField>
				)}
			</Form>,
		)

		// A disabled list must not offer a live remove or move on any row — the fields inside may
		// be disabled by the kit's own fieldset, but these controls are the entry's own chrome.
		expect(screen.getByRole('button', { name: 'Remove 0' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'down 0' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'up 1' })).toBeDisabled()
	})

	it('takes reorder captions from the object form of `reorderable`', () => {
		render(
			<Form defaultValues={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }}>
				{(form) => (
					<form.ArrayField
						name='people'
						newItem={NEW_PERSON}
						removeLabel='Remove'
						reorderable={{ up: { label: 'Выше' }, down: { label: 'Ниже' } }}
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
									/>
								</item.Item>
							))
						}
					</form.ArrayField>
				)}
			</Form>,
		)

		// The object form only adds captions — it still means "offer reordering", like `true`.
		expect(screen.getByRole('button', { name: 'down 0' })).toHaveTextContent('Ниже')
		expect(screen.getByRole('button', { name: 'up 1' })).toHaveTextContent('Выше')
		expect(screen.getByRole('button', { name: 'up 0' })).toBeDisabled()
	})
})

describe('the array scope', () => {
	it('inserts an entry at a position without disturbing the others', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={{ title: '', people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => (
					<>
						<form.ArrayField
							name='people'
							newItem={NEW_PERSON}
						>
							{({ items, insert }) => (
								<>
									{items.map((item) => (
										<item.Item key={item.key}>
											<item.TextField
												name='firstName'
												label='Name'
											/>
										</item.Item>
									))}
									<button
										type='button'
										onClick={() => {
											insert(1, { firstName: 'Katherine' })
										}}
									>
										insert
									</button>
								</>
							)}
						</form.ArrayField>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'insert' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({
				title: '',
				people: [{ firstName: 'Ada' }, { firstName: 'Katherine' }, { firstName: 'Grace' }],
			})
		})
	})

	it('keeps each entry mounted across an insert in the middle', async () => {
		// Control-local state is the only witness — a remount is invisible in the submitted
		// values. An uncontrolled sibling input survives a re-render and dies on a remount, so
		// its text is the assertion.
		const user = userEvent.setup()
		render(
			<Form
				defaultValues={{ title: '', people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}
				onSubmit={() => {}}
			>
				{(form) => (
					<form.ArrayField
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items, insert }) => (
							<>
								{items.map((item) => (
									<item.Item key={item.key}>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
										<input
											aria-label={`scratch ${item.key}`}
											defaultValue=''
										/>
									</item.Item>
								))}
								<button
									type='button'
									onClick={() => {
										insert(1, { firstName: 'Katherine' })
									}}
								>
									insert
								</button>
							</>
						)}
					</form.ArrayField>
				)}
			</Form>,
		)

		const scratches = screen.getAllByLabelText(/^scratch /)
		const lastScratch = last(scratches)
		await user.type(lastScratch, 'survives')
		await user.click(screen.getByRole('button', { name: 'insert' }))

		const after = screen.getAllByLabelText(/^scratch /)
		expect(after).toHaveLength(3)
		expect(after[after.length - 1]).toHaveValue('survives')
	})

	it('reports isFirst and isLast against the current order', async () => {
		const user = userEvent.setup()
		render(
			<Form
				defaultValues={{ title: '', people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}
				onSubmit={() => {}}
			>
				{(form) => (
					<form.ArrayField
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items, move }) => (
							<>
								{items.map((item) => (
									<div key={item.key}>
										<span>{`${String(item.index)}:${String(item.isFirst)}:${String(item.isLast)}`}</span>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
									</div>
								))}
								<button
									type='button'
									onClick={() => {
										move(0, 1)
									}}
								>
									swap
								</button>
							</>
						)}
					</form.ArrayField>
				)}
			</Form>,
		)

		expect(screen.getByText('0:true:false')).toBeInTheDocument()
		expect(screen.getByText('1:false:true')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'swap' }))

		// The flags describe positions, so they read the same after a swap — what must have
		// changed is which entry sits at each position.
		expect(screen.getByLabelText('Name 0')).toHaveValue('Grace')
		expect(screen.getByLabelText('Name 1')).toHaveValue('Ada')
	})

	it('writes into the entry that actually moved, even behind a memoized row', async () => {
		// A scoped field resolves its *current* path by reading `itemDataRef` fresh on every
		// render — but a `React.memo` boundary can bail out of that render entirely, in which
		// case nothing re-reads the path at all. `Scoped` must therefore also *subscribe* to
		// something that changes on reorder, or the memoized row below keeps rendering against
		// its stale position and the edit lands on the wrong entry — silently: no error, no
		// warning, just a wrong submitted value.
		//
		// `Row`'s props must not change across the swap for its `memo` to actually bail — so the
		// label is tied to the entry's own stable `key`, never to its (now-swapped) `index`. If
		// the label tracked the index instead, the prop change alone would force a re-render and
		// the test would pass regardless of whether `Scoped` subscribes to anything.
		const Row = memo(function Row({
			Field,
			label,
		}: {
			Field: (props: { name: 'firstName'; label: ReactNode }) => ReactNode
			label: ReactNode
		}): ReactNode {
			return (
				<Field
					name='firstName'
					label={label}
				/>
			)
		})

		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => (
					<>
						<form.ArrayField
							name='people'
							newItem={NEW_PERSON}
							reorderable
						>
							{({ items }) => (
								<>
									{items.map((item) => (
										<item.Item key={item.key}>
											<Row
												Field={item.TextField}
												label={item.key}
											/>
										</item.Item>
									))}
								</>
							)}
						</form.ArrayField>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		// The entry that starts first is keyed `item-0` and holds "A"; swapping moves it to
		// index 1. Retype it there, addressed by its stable key-label rather than its new index.
		await user.click(screen.getByRole('button', { name: 'down 0' }))
		const movedBox = screen.getByLabelText('item-0')
		await user.clear(movedBox)
		await user.type(movedBox, 'X')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ title: '', people: [{ firstName: 'B' }, { firstName: 'X' }] })
		})
	})

	it('writes into the entry that actually moved one level down, even behind a memoized row nested inside another array', async () => {
		// The flat case above is fixed by republishing the array's own key order. That alone is
		// not enough here: a single-member team's own key order never changes when the *outer*
		// teams array reorders, so a provider keyed only to `keys.keys` would still leave a
		// memoized row inside the inner `members` array reading a stale path once the team it
		// belongs to moves. The provider must also change when the fieldName it is scoped under
		// changes — and a nested array's fieldName is exactly the path the outer array resolved
		// for it, so it does change whenever an ancestor moves.
		type Member = { firstName: string }
		type Team = { name: string; members: Member[] }
		type TeamValues = { teams: Team[] }

		const defaultValues: TeamValues = {
			teams: [
				{ name: 'Red', members: [{ firstName: 'A' }] },
				{ name: 'Blue', members: [{ firstName: 'B' }] },
			],
		}
		const newTeam: Team = { name: '', members: [] }
		const newMember: Member = { firstName: '' }

		const Row = memo(function Row({
			Field,
			label,
		}: {
			Field: (props: { name: 'firstName'; label: ReactNode }) => ReactNode
			label: ReactNode
		}): ReactNode {
			return (
				<Field
					name='firstName'
					label={label}
				/>
			)
		})

		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={defaultValues}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => (
					<>
						<form.ArrayField
							name='teams'
							newItem={newTeam}
							reorderable
						>
							{({ items: teamItems }) => (
								<>
									{teamItems.map((team) => (
										<team.Item key={team.key}>
											<team.ArrayField
												name='members'
												newItem={newMember}
											>
												{({ items: memberItems }) => (
													<>
														{memberItems.map((member) => (
															<member.Item key={member.key}>
																{/* Keyed to both entries' stable keys, never to either's index, so
																the memoized row's props stay identical across the outer swap and
																`memo` genuinely bails instead of re-rendering because a prop
																changed. */}
																<Row
																	Field={member.TextField}
																	label={`${team.key}:${member.key}`}
																/>
															</member.Item>
														))}
													</>
												)}
											</team.ArrayField>
										</team.Item>
									))}
								</>
							)}
						</form.ArrayField>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		// "Red" (team key `item-0`) starts at index 0 and moves to index 1; its member never
		// reorders within its own team, so only the ancestor's move can be what forces a re-read.
		await user.click(screen.getByRole('button', { name: 'down 0' }))
		const movedBox = screen.getByLabelText('item-0:item-0')
		await user.clear(movedBox)
		await user.type(movedBox, 'X')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({
				teams: [
					{ name: 'Blue', members: [{ firstName: 'B' }] },
					{ name: 'Red', members: [{ firstName: 'X' }] },
				],
			})
		})
	})
})
