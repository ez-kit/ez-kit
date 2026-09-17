import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

import type { ReactNode } from 'react'

type Member = { name: string }
type Line = { name: string; members: Member[] }
type Values = { title: string; lines: Line[] }

const DEFAULTS: Values = { title: '', lines: [] }

const { Form } = createForm({ components: testComponents })

/**
 * Type-level guarantees of `form.Array` / `form.ArrayField`. Nothing here renders — every
 * assertion is checked by `typecheck`.
 *
 * The item type is derived from `name`, not inferred from `newItem`. That direction is the
 * whole point of these cases: while `name` was `DeepKeysOfType<TFormData, readonly TItem[]>` —
 * a conditional type, so a non-inference position — `TItem` could only come from `newItem`, and
 * an inline literal whose own nested array had no contextual type inferred that member as
 * `never[]`. The mismatch then surfaced against `name`, reading
 * `Type 'string' is not assignable to type 'never'` — an error naming a prop that was correct,
 * about a type the author never wrote. Annotating the `newItem` const cleared it, which is why
 * every example in this repo compiled and nothing caught it.
 */
describe('form.Array / form.ArrayField — types', () => {
	it('accepts an inline newItem whose own nested array has no contextual type', () => {
		function Inline(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<form.Array
							name='lines'
							newItem={{ name: '', members: [] }}
						>
							{({ items }) => <>{items.length}</>}
						</form.Array>
					)}
				</Form>
			)
		}

		expectTypeOf(Inline).toBeFunction()
	})

	it('types the scope from the name, not from newItem', () => {
		function Scoped(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<form.Array
							name='lines'
							newItem={{ name: '', members: [] }}
						>
							{(scope) => {
								expectTypeOf(scope.insert).parameter(1).toEqualTypeOf<Line | undefined>()

								return scope.items.map((item) => (
									<item.TextField
										key={item.key}
										name='name'
									/>
								))
							}}
						</form.Array>
					)}
				</Form>
			)
		}

		expectTypeOf(Scoped).toBeFunction()
	})

	it('rejects a wrong newItem on `newItem`, not on `name`', () => {
		function WrongItem(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<form.Array
							name='lines'
							// @ts-expect-error — `nmae` is not a key of `Line`; the error lands here, on `newItem`
							newItem={{ nmae: '', members: [] }}
						>
							{({ items }) => <>{items.length}</>}
						</form.Array>
					)}
				</Form>
			)
		}

		expectTypeOf(WrongItem).toBeFunction()
	})

	it('rejects a newItem missing a key of the item', () => {
		function Partial(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<form.Array
							name='lines'
							// @ts-expect-error — `members` is missing from `Line`
							newItem={{ name: '' }}
						>
							{({ items }) => <>{items.length}</>}
						</form.Array>
					)}
				</Form>
			)
		}

		expectTypeOf(Partial).toBeFunction()
	})

	it('rejects a name that is not an array path', () => {
		function NotAnArray(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<form.Array
							// @ts-expect-error — `title` is a string, not an array
							name='title'
							// With `name` rejected, `TName` falls back to its constraint — the union of every
							// array path in `Values` — so `newItem` is checked against `Line | Member` here.
							// `{ name: '' }` satisfies the `Member` arm, which keeps this case about `name`.
							newItem={{ name: '' }}
						>
							{({ items }) => <>{items.length}</>}
						</form.Array>
					)}
				</Form>
			)
		}

		expectTypeOf(NotAnArray).toBeFunction()
	})

	it('derives a nested array’s item type from the nested name', () => {
		function Nested(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<form.Array
							name='lines'
							newItem={{ name: '', members: [] }}
						>
							{({ items }) =>
								items.map((line) => (
									<line.Array
										key={line.key}
										name='members'
										newItem={{ name: '' }}
									>
										{(members) => {
											expectTypeOf(members.insert).parameter(1).toEqualTypeOf<Member | undefined>()

											return <>{members.items.length}</>
										}}
									</line.Array>
								))
							}
						</form.Array>
					)}
				</Form>
			)
		}

		expectTypeOf(Nested).toBeFunction()
	})

	it('applies the same rules to ArrayField', () => {
		function Field(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<form.ArrayField
							name='lines'
							label='Lines'
							newItem={{ name: '', members: [] }}
						>
							{(scope) => {
								expectTypeOf(scope.insert).parameter(1).toEqualTypeOf<Line | undefined>()

								return <>{scope.items.length}</>
							}}
						</form.ArrayField>
					)}
				</Form>
			)
		}

		expectTypeOf(Field).toBeFunction()
	})

	it('rejects a wrong newItem on ArrayField’s `newItem` too', () => {
		function WrongFieldItem(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<form.ArrayField
							name='lines'
							label='Lines'
							// @ts-expect-error — `nmae` is not a key of `Line`; the error lands here, on `newItem`
							newItem={{ nmae: '', members: [] }}
						>
							{({ items }) => <>{items.length}</>}
						</form.ArrayField>
					)}
				</Form>
			)
		}

		expectTypeOf(WrongFieldItem).toBeFunction()
	})
})
