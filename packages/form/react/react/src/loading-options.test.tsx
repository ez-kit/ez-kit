import { FormFieldType } from '@ez-kit/form-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

import type { FormComponents } from './contract'
import type { FormSchema } from '@ez-kit/form-core'

/**
 * The `loading` flag of the option-bearing fields, from the consumer prop to the kit.
 *
 * The binding layer's whole job here is to make absence indistinguishable from `false` for a
 * kit: the consumer prop is optional, the contract's key is a plain boolean. These tests
 * assert exactly that boundary — how a kit *draws* the state is each kit's own test.
 */

type Values = {
	role: string
	tagIds: string[]
	perks: string[]
	plan: string
}

const DEFAULTS: Values = { role: '', tagIds: [], perks: [], plan: '' }

const OPTIONS = [
	{ label: 'Viewer', value: 'viewer' },
	{ label: 'Admin', value: 'admin' },
]

const { useForm, Form, FormRenderer } = createForm({ components: testComponents })

/** The stand-in kit stamps `data-loading` on the control whenever the contract says so. */
const LOADING_ATTRIBUTE = 'data-loading'

describe('loading options', () => {
	it('marks every option-bearing control as loading when the prop is set', () => {
		function LoadingCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.SelectField
						name='role'
						label='Role'
						loading
						options={[]}
					/>
					<form.MultiSelectField
						name='tagIds'
						label='Tags'
						loading
						options={[]}
					/>
					<form.CheckboxGroupField
						name='perks'
						label='Perks'
						loading
						options={[]}
					/>
					<form.RadioGroupField
						name='plan'
						label='Plan'
						loading
						options={[]}
					/>
				</Form>
			)
		}

		const { container } = render(<LoadingCase />)

		expect(container.querySelectorAll(`[${LOADING_ATTRIBUTE}]`)).toHaveLength(4)
	})

	it('leaves an omitted loading prop as `false` rather than absent', () => {
		function DefaultCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.SelectField
						name='role'
						label='Role'
						options={OPTIONS}
					/>
				</Form>
			)
		}

		const { container } = render(<DefaultCase />)

		expect(container.querySelector(`[${LOADING_ATTRIBUTE}]`)).toBeNull()
		expect(screen.getByLabelText('Role')).toBeEnabled()
	})

	it('hands the kit a boolean, never `undefined`, when the prop is omitted', () => {
		const seen: unknown[] = []
		const components: FormComponents = {
			...testComponents,
			SelectField: (props) => {
				seen.push(props.loading)
				return testComponents.SelectField(props)
			},
		}
		const { useForm: useSpyForm, Form: SpyForm } = createForm({ components })

		function Case() {
			const form = useSpyForm({ defaultValues: DEFAULTS })

			return (
				<SpyForm form={form}>
					<form.SelectField
						name='role'
						label='Role'
						options={OPTIONS}
					/>
				</SpyForm>
			)
		}

		render(<Case />)

		expect(seen).not.toHaveLength(0)
		expect(seen.every((entry) => entry === false)).toBe(true)
	})

	it('renders a statically authored schema as not loading', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [
				{
					type: FormFieldType.Select,
					name: 'role',
					label: 'Role',
					options: OPTIONS,
					defaultValue: '',
				},
			],
		}

		const { container } = render(<FormRenderer schema={schema} />)

		expect(container.querySelector(`[${LOADING_ATTRIBUTE}]`)).toBeNull()
	})

	it('keeps the control non-interactive while loading, even with options already present', () => {
		function StaleCase() {
			const form = useForm({ defaultValues: { ...DEFAULTS, role: 'admin' } })

			return (
				<Form form={form}>
					<form.SelectField
						name='role'
						label='Role'
						loading
						options={OPTIONS}
					/>
				</Form>
			)
		}

		render(<StaleCase />)

		expect(screen.getByLabelText('Role')).toBeDisabled()
	})
})
