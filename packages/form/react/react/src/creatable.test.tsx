import { fireEvent, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { FormOptionSources } from './options/source-context'
import { testComponents } from './test-kit'

import type { OptionSourceRegistry } from './options/source-types'
import type { SelectOption } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * `creatable`: a value the option list does not contain, committed as typed.
 *
 * The whole feature lives in the renderer, as one extra row appended to the list the kit is
 * handed — so what these tests assert is the **list** and the **form state**, never a kit's
 * popover. Neither kit was changed for this and neither can be, which is the point: picking
 * the offered row is picking an option, and `fromKitValue` resolves it like any other.
 *
 * The two halves are tested separately because they fail differently. The creation row is
 * what lets a value be made; the self-labelling of an already-created value is what stops it
 * from reading as blank once the query that made it is gone.
 */

type Values = { tag: string; tags: string[] }

// A **string** list — `SelectOption`'s own default, and load-bearing here. The props correlate
// `name` with the option scalar, so a widened `SelectOption<OptionValue>[]` fits neither arm of
// the union; that correlation is what `creatable` leans on to be string-only.
const TAGS: readonly SelectOption[] = [
	{ label: 'Bug', value: 'bug' },
	{ label: 'Chore', value: 'chore' },
]

const { useForm, Form } = createForm({ components: testComponents })

function selectFor(name: string): HTMLSelectElement {
	const element = document.querySelector(`select[name="${name}"]`)
	if (!(element instanceof HTMLSelectElement)) throw new Error(`No select named "${name}"`)
	return element
}

function optionLabels(name: string): string[] {
	return [...selectFor(name).options].map((option) => option.textContent)
}

function searchInput(testkit: string): HTMLInputElement {
	const input = document.querySelector(`input[data-testkit="${testkit}"]`)
	if (!(input instanceof HTMLInputElement)) throw new Error('No search input rendered')
	return input
}

function chipLabels(): string[] {
	return [...document.querySelectorAll('[data-testkit="multiselect-chip"]')].map((chip) => chip.textContent)
}

/** A creatable single-value select over a static list — no source anywhere. */
function CreatableTag({
	onSubmit,
	createLabel,
	defaultValue = '',
}: {
	onSubmit?: (values: Values) => void
	createLabel?: string
	defaultValue?: string
}): ReactNode {
	const form = useForm({
		defaultValues: { tag: defaultValue, tags: [] },
		onSubmit: ({ value }) => onSubmit?.(value),
	})
	return (
		<Form form={form}>
			<form.SelectField
				name='tag'
				label='Tag'
				searchable
				creatable
				options={TAGS}
				{...(createLabel !== undefined && { createLabel })}
			/>
		</Form>
	)
}

function CreatableTags({ defaultValues = [] }: { defaultValues?: string[] }): ReactNode {
	const form = useForm({ defaultValues: { tag: '', tags: defaultValues } })
	return (
		<Form form={form}>
			<form.MultiSelectField
				name='tags'
				label='Tags'
				searchable
				creatable
				options={TAGS}
			/>
		</Form>
	)
}

describe('creatable select', () => {
	it('offers the typed text as an extra option when nothing matches', async () => {
		const user = userEvent.setup()
		render(<CreatableTag />)

		expect(optionLabels('tag')).toEqual(['Bug', 'Chore'])

		await user.type(searchInput('select-search'), 'Regression')

		// The static filter removed both real options; the offer is what is left, last in the
		// list — where react-select and react-admin both put it.
		expect(optionLabels('tag')).toEqual(['Add "Regression"'])
	})

	it('writes the typed text into form state when the offer is picked', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		render(<CreatableTag onSubmit={submitted} />)

		await user.type(searchInput('select-search'), 'Regression')
		fireEvent.change(selectFor('tag'), { target: { value: 'Regression' } })

		expect(selectFor('tag').value).toBe('Regression')
	})

	it('keeps a created value labelled once the query that made it is gone', async () => {
		const user = userEvent.setup()
		render(<CreatableTag defaultValue='Regression' />)

		// Nothing typed: the offer is absent, but the value is still on the list, labelling
		// itself. Without this a heroui combobox would draw an empty input over a real value.
		expect(optionLabels('tag')).toEqual(['Bug', 'Chore', 'Regression'])

		// 'bu' is a prefix of 'Bug' but not equal to it, so the offer stands alongside the real
		// match — react-select's `isValidNewOption` default draws the line in the same place.
		await user.type(searchInput('select-search'), 'bu')
		expect(optionLabels('tag')).toEqual(['Bug', 'Regression', 'Add "bu"'])
	})

	it('makes no offer when the query matches an existing label, whatever the case', async () => {
		const user = userEvent.setup()
		render(<CreatableTag />)

		await user.type(searchInput('select-search'), 'BUG')

		// Picking the real option is what the user meant; a second row carrying the same text
		// under a different value would be a trap.
		expect(optionLabels('tag')).toEqual(['Bug'])
	})

	it('makes no offer for whitespace alone, and trims what it does offer', async () => {
		const user = userEvent.setup()
		render(<CreatableTag />)

		await user.type(searchInput('select-search'), '   ')
		expect(optionLabels('tag')).toEqual(['Bug', 'Chore'])

		await user.type(searchInput('select-search'), 'Flaky ')
		expect(optionLabels('tag')).toEqual(['Add "Flaky"'])
	})

	it('captions the offer with `createLabel` when one is given', async () => {
		const user = userEvent.setup()
		render(<CreatableTag createLabel='Создать метку' />)

		await user.type(searchInput('select-search'), 'Регрессия')

		expect(optionLabels('tag')).toEqual(['Создать метку'])
	})

	it('throws, naming the field, when `creatable` is used without `searchable`', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		function Bad(): ReactNode {
			const form = useForm({ defaultValues: { tag: '', tags: [] } })
			return (
				<Form form={form}>
					<form.SelectField
						name='tag'
						label='Tag'
						creatable
						options={TAGS}
					/>
				</Form>
			)
		}

		expect(() => render(<Bad />)).toThrow(/Field "tag" is `creatable`, which requires `searchable`/)

		error.mockRestore()
	})
})

describe('creatable multiselect', () => {
	it('offers the typed text and labels every created value as a chip', async () => {
		const user = userEvent.setup()
		render(<CreatableTags defaultValues={['bug', 'Regression']} />)

		// 'Regression' is on no list — not the static one, not a source. It labels itself, which
		// is exactly right: the value *is* the text the user typed.
		expect(chipLabels()).toEqual(['Bug', 'Regression'])

		// 'Bug' matches nothing typed, but it is selected, so the filter may not drop it — its
		// chip would lose its label. 'Regression' labels itself, and the offer comes last.
		await user.type(searchInput('multiselect-search'), 'Flaky')
		expect(optionLabels('tags')).toEqual(['Bug', 'Regression', 'Add "Flaky"'])
		expect(chipLabels()).toEqual(['Bug', 'Regression'])
	})
})

describe('creatable over a source', () => {
	it('offers the typed text alongside a page of search results', async () => {
		const user = userEvent.setup()
		const sources: OptionSourceRegistry = {
			tags: {
				useOptions: ({ query }) => ({
					options: query === '' ? [] : TAGS.filter((tag) => tag.label.toLowerCase().startsWith(String(query))),
					loading: false,
				}),
				useSelectedOptions: ({ values }) => ({
					options: TAGS.filter((tag) => values.includes(tag.value)),
					loading: false,
				}),
			},
		}

		function SourcedCreatableTag(): ReactNode {
			const form = useForm({ defaultValues: { tag: '', tags: [] } })
			return (
				<Form form={form}>
					<form.SelectField
						name='tag'
						label='Tag'
						searchable
						creatable
						optionsFrom='tags'
					/>
				</Form>
			)
		}

		render(<FormOptionSources value={sources}>{<SourcedCreatableTag />}</FormOptionSources>)

		await user.type(searchInput('select-search'), 'b')
		// The source's page is untouched — it is never filtered again here — and the offer is
		// appended to it.
		expect(optionLabels('tag')).toEqual(['Bug', 'Add "b"'])
	})
})
