import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { guardComponents, guardFields } from './component-guard'
import { createForm } from './create-form'

import type { FormComponents, FormFieldSlots } from './contract'
import type { CreateFormOptions } from './create-form'
import type { ReactNode } from 'react'

function Stub({ children }: { children?: ReactNode }): ReactNode {
	return <>{children}</>
}

/** A complete chrome set, so a test can remove exactly the one slot it is about. */
function completeComponents(): FormComponents {
	const keys = ['ArrayField', 'ArrayItem', 'Button', 'Section', 'GridItem', 'Wizard'] as const

	const components = Object.fromEntries(keys.map((key) => [key, Stub])) as unknown as FormComponents
	return { ...components, Form: ({ children, ...props }) => <form {...props}>{children}</form> }
}

/** A complete field set, for the same reason. */
function completeFields(): FormFieldSlots {
	const keys = [
		'TextField',
		'NumberField',
		'TextareaField',
		'SelectField',
		'CheckboxField',
		'SwitchField',
		'RadioGroupField',
		'SliderField',
		'MultiSelectField',
		'CheckboxGroupField',
		'DateField',
		'DateRangeField',
	] as const

	return Object.fromEntries(keys.map((key) => [key, Stub])) as unknown as FormFieldSlots
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('guardComponents', () => {
	it('passes a complete set through untouched', () => {
		const components = completeComponents()

		const guarded = guardComponents(components)

		expect(guarded.Button).toBe(components.Button)
		expect(guarded.Wizard).toBe(components.Wizard)
	})

	it('replaces a missing component with one that renders nothing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { Button: _omitted, ...partial } = completeComponents()

		const guarded = guardComponents(partial as FormComponents)

		const { container } = render(<>{guarded.Button({} as never)}</>)
		expect(container).toBeEmptyDOMElement()
		expect(warn).toHaveBeenCalledOnce()
		expect(warn.mock.calls[0]?.[0]).toContain('Button')
	})

	it('warns once however often the placeholder renders', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { Section: _omitted, ...partial } = completeComponents()

		const guarded = guardComponents(partial as FormComponents)

		render(
			<>
				{guarded.Section({} as never)}
				{guarded.Section({} as never)}
				{guarded.Section({} as never)}
			</>,
		)
		expect(warn).toHaveBeenCalledOnce()
	})

	it('names each missing component separately', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { Button: _button, Section: _section, ...partial } = completeComponents()

		const guarded = guardComponents(partial as FormComponents)

		render(
			<>
				{guarded.Button({} as never)}
				{guarded.Section({} as never)}
			</>,
		)
		expect(warn).toHaveBeenCalledTimes(2)
		expect(warn.mock.calls.map((call) => String(call[0]))).toEqual([
			expect.stringContaining('Button'),
			expect.stringContaining('Section'),
		])
	})
})

describe('guardFields', () => {
	it('passes a complete set through untouched', () => {
		const fields = completeFields()

		const guarded = guardFields(fields)

		expect(guarded.TextField).toBe(fields.TextField)
		expect(guarded.DateRangeField).toBe(fields.DateRangeField)
	})

	it('keeps an extra key the contract knows nothing about', () => {
		// The field registry is open: the guard may only fill the twelve it can name, never
		// prune what it cannot.
		const RatingField = Stub
		const guarded = guardFields({ ...completeFields(), RatingField })

		expect(guarded.RatingField).toBe(RatingField)
	})

	it('replaces a missing built-in with one that renders nothing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { TextField: _omitted, ...partial } = completeFields()

		const guarded = guardFields(partial)

		const { container } = render(<>{guarded.TextField?.({})}</>)
		expect(container).toBeEmptyDOMElement()
		expect(warn).toHaveBeenCalledOnce()
		expect(warn.mock.calls[0]?.[0]).toContain('TextField')
	})

	it('warns once however often the placeholder renders', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { NumberField: _omitted, ...partial } = completeFields()

		const guarded = guardFields(partial)

		render(
			<>
				{guarded.NumberField?.({})}
				{guarded.NumberField?.({})}
				{guarded.NumberField?.({})}
			</>,
		)
		expect(warn).toHaveBeenCalledOnce()
	})
})

describe('createForm with an incomplete kit', () => {
	it('renders the rest of the form when one field is missing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { TextField: _omitted, ...partial } = completeFields()
		const { Form } = createForm({ components: completeComponents(), fields: partial as FormFieldSlots })

		render(
			<Form defaultValues={{ a: '', b: 0 }}>
				{(form) => (
					<>
						<form.TextField
							name='a'
							label='A'
						/>
						<form.NumberField
							name='b'
							label='B'
						/>
						<span data-testid='sibling'>still here</span>
					</>
				)}
			</Form>,
		)

		expect(screen.getByTestId('sibling')).toBeInTheDocument()
		expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('TextField')
	})

	it('renders the rest of the form when a chrome slot is missing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { Button: _omitted, ...partial } = completeComponents()
		const { Form } = createForm({ components: partial as FormComponents, fields: completeFields() })

		render(
			<Form defaultValues={{ a: '' }}>
				{(form) => (
					<>
						<form.SubmitButton>Save</form.SubmitButton>
						<span data-testid='sibling'>still here</span>
					</>
				)}
			</Form>,
		)

		expect(screen.getByTestId('sibling')).toBeInTheDocument()
		expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('Button')
	})

	it('renders when an untyped consumer passes no fields at all', () => {
		// Unreachable from TypeScript — `fields` is required on `CreateFormOptions` — so the
		// cast is the whole point: this is the JavaScript consumer's path, and the guard is
		// what keeps it twelve named warnings instead of "Element type is invalid".
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const options = { components: completeComponents() } as unknown as CreateFormOptions
		const { Form } = createForm(options)

		render(
			<Form defaultValues={{ a: '' }}>
				{(form) => (
					<>
						<form.TextField
							name='a'
							label='A'
						/>
						<span data-testid='sibling'>still here</span>
					</>
				)}
			</Form>,
		)

		expect(screen.getByTestId('sibling')).toBeInTheDocument()
		expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('TextField')
	})
})
