import { FormFieldType } from '@ez-kit/form-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

import { createForm } from '../create-form'
import { testComponents } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'
import type * as ReactForm from '@tanstack/react-form'

/**
 * What the `useFormGroup` spy below records. Declared through `vi.hoisted` because `vi.mock`'s
 * factory is hoisted above every other statement in the module.
 */
const groupSpy = vi.hoisted(() => ({ names: [] as string[], validateCauses: [] as string[] }))

// `useFormGroup` is the one piece of the `path` branch with no observable output of its own —
// the collected-names validation runs for *every* step, so deleting `StepGroupBinding` changes
// nothing a rendered DOM can show. Wrapping the real hook is what makes "the step's group is
// bound, and its `validate` is never called" assertable.
vi.mock('@tanstack/react-form', async (importOriginal) => {
	const actual = await importOriginal<typeof ReactForm>()
	return {
		...actual,
		useFormGroup: (options: { name: string }) => {
			groupSpy.names.push(options.name)
			const group = actual.useFormGroup(options as never) as unknown as {
				validate: (cause: string) => unknown
			}
			return {
				validate: (cause: string) => {
					groupSpy.validateCauses.push(cause)
					return group.validate(cause)
				},
			}
		},
	}
})

beforeEach(() => {
	groupSpy.names.length = 0
	groupSpy.validateCauses.length = 0
})

const { FormRenderer } = createForm({ components: testComponents })

type TwoStepValues = { name: string; age: string }

/** The chrome the test kit stamps on each entry of `WizardRenderProps.steps`. */
const STEP_MARKER = 'wizard-step'

test('renders only the current step and advances on next', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{ type: 'step', title: 'One', children: [{ type: FormFieldType.Text, name: 'name', label: 'Name' }] },
			{ type: 'step', title: 'Two', children: [{ type: FormFieldType.Text, name: 'age', label: 'Age' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByLabelText('Name')).toBeInTheDocument()
	expect(screen.queryByLabelText('Age')).not.toBeInTheDocument()
	expect(screen.getAllByTestId(STEP_MARKER)).toHaveLength(2)

	await user.click(screen.getByRole('button', { name: /next/i }))

	expect(screen.getByLabelText('Age')).toBeInTheDocument()
	expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
	expect(screen.getAllByTestId(STEP_MARKER)[1]).toHaveAttribute('aria-current', 'step')
})

test('next is blocked while the current step has invalid fields', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'One',
				children: [{ type: FormFieldType.Text, name: 'name', label: 'Name', validate: { required: true } }],
			},
			{ type: 'step', title: 'Two', children: [{ type: FormFieldType.Text, name: 'age', label: 'Age' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
		/>,
	)

	await user.click(screen.getByRole('button', { name: /next/i }))

	expect(await screen.findByRole('alert')).toHaveTextContent('This field is required')
	expect(screen.getByLabelText('Name')).toBeInTheDocument()
	expect(screen.queryByLabelText('Age')).not.toBeInTheDocument()
})

test('a field on a later step does not block the current step', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{ type: 'step', title: 'One', children: [{ type: FormFieldType.Text, name: 'name', label: 'Name' }] },
			{
				type: 'step',
				title: 'Two',
				children: [{ type: FormFieldType.Text, name: 'age', label: 'Age', validate: { required: true } }],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
		/>,
	)

	await user.click(screen.getByRole('button', { name: /next/i }))

	expect(await screen.findByLabelText('Age')).toBeInTheDocument()
	expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
})

type ConditionalValues = { isCompany: boolean; name: string; company: string; note: string }

test('a step hidden by `when` is removed from steps and indices are recomputed', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<ConditionalValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'One',
				children: [
					{ type: FormFieldType.Checkbox, name: 'isCompany', label: 'Company' },
					{ type: FormFieldType.Text, name: 'name', label: 'Name' },
				],
			},
			{
				type: 'step',
				title: 'Two',
				when: { field: 'isCompany', eq: true },
				children: [{ type: FormFieldType.Text, name: 'company', label: 'Company name' }],
			},
			{ type: 'step', title: 'Three', children: [{ type: FormFieldType.Text, name: 'note', label: 'Note' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ isCompany: false, name: '', company: '', note: '' }}
			onSubmit={() => {}}
		/>,
	)

	const steps = screen.getAllByTestId(STEP_MARKER)
	expect(steps).toHaveLength(2)
	expect(steps[0]).toHaveTextContent('One')
	expect(steps[1]).toHaveTextContent('Three')

	// The surviving steps are renumbered, so "next" from index 0 lands on index 1 — the third
	// authored step — rather than on the hidden one.
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(screen.getByLabelText('Note')).toBeInTheDocument()
	expect(screen.getAllByTestId(STEP_MARKER)[1]).toHaveAttribute('aria-current', 'step')

	// Turning the condition on brings the hidden step back and renumbers again.
	await user.click(screen.getByRole('button', { name: /back/i }))
	await user.click(screen.getByLabelText('Company'))
	expect(screen.getAllByTestId(STEP_MARKER)).toHaveLength(3)
})

test('invalid is false for a step that has never been visited', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'One',
				children: [{ type: FormFieldType.Text, name: 'name', label: 'Name', validate: { required: true } }],
			},
			{
				type: 'step',
				title: 'Two',
				children: [{ type: FormFieldType.Text, name: 'age', label: 'Age', validate: { required: true } }],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
		/>,
	)

	// Both steps hold an empty required field; only the visited one may report as invalid.
	await user.click(screen.getByRole('button', { name: /next/i }))
	await screen.findByRole('alert')

	const steps = screen.getAllByTestId(STEP_MARKER)
	expect(steps[0]).toHaveAttribute('data-invalid', 'true')
	expect(steps[1]).not.toHaveAttribute('data-invalid')
})

type GroupedValues = { contact: { email: string }; alias: string; note: string }

/**
 * The step declares `path: 'contact'` **and** holds a required field outside that path. The three
 * assertions pin the ruling: the group is *bound* (so `path` means something and group-level
 * validators have somewhere to attach), its `validate` is never *called* (it could only redden
 * fields under `path` that live on later steps), and step composition is still decided by the
 * collected names — so `alias`, which `FormGroupApi.validate` would never look at, still blocks
 * "next".
 */
test('a step with `path` binds a form group, never calls its validate, and still validates fields outside the path', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<GroupedValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'Contact',
				path: 'contact',
				children: [
					{ type: FormFieldType.Text, name: 'contact.email', label: 'Email', validate: { required: true } },
					{ type: FormFieldType.Text, name: 'alias', label: 'Alias', validate: { required: true } },
				],
			},
			{ type: 'step', title: 'Note', children: [{ type: FormFieldType.Text, name: 'note', label: 'Note' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ contact: { email: '' }, alias: '', note: '' }}
			onSubmit={() => {}}
		/>,
	)

	// The declared path is bound as a group, once, and before any navigation.
	expect(groupSpy.names).toContain('contact')

	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(await screen.findAllByRole('alert')).toHaveLength(2)
	// …and "next" never reached for the group: `FormGroupApi.validate` re-runs the *form's*
	// validators scoped by data path, which cannot change the verdict above and would redden
	// `contact.*` fields sitting on later steps.
	expect(groupSpy.validateCauses).toEqual([])

	// Only the in-path field filled: the out-of-path one still blocks, which `group.validate`
	// alone could never see.
	await user.type(screen.getByLabelText('Email'), 'a@b.co')
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(screen.getByLabelText('Alias')).toBeInTheDocument()
	expect(screen.queryByLabelText('Note')).not.toBeInTheDocument()

	await user.type(screen.getByLabelText('Alias'), 'ann')
	await user.click(screen.getByRole('button', { name: /next/i }))

	expect(await screen.findByLabelText('Note')).toBeInTheDocument()
})

test('step titles and descriptions are resolved before the kit sees them', () => {
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: { key: 'step.one.title' },
				description: { key: 'step.one.description' },
				children: [{ type: FormFieldType.Text, name: 'name', label: 'Name' }],
			},
			{ type: 'step', title: 'Two', children: [{ type: FormFieldType.Text, name: 'age', label: 'Age' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
			translate={(key: string): string => (key === 'step.one.title' ? 'Personal' : 'Who you are')}
		/>,
	)

	expect(screen.getByRole('button', { name: 'Personal' })).toBeInTheDocument()
	expect(screen.getByText('Who you are')).toBeInTheDocument()
})

test('a step does not open red on arrival after the user has typed elsewhere', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'One',
				children: [{ type: FormFieldType.Text, name: 'name', label: 'Name', validate: { required: true } }],
			},
			{
				type: 'step',
				title: 'Two',
				children: [{ type: FormFieldType.Text, name: 'age', label: 'Age', validate: { required: true } }],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
		/>,
	)

	// Typing anywhere runs the form-level `onChange` validator, which writes a "required" error
	// onto step two's untouched field long before the user reaches it.
	await user.type(screen.getByLabelText('Name'), 'Ann')
	await user.click(screen.getByRole('button', { name: /next/i }))

	expect(await screen.findByLabelText('Age')).toBeInTheDocument()
	expect(screen.getAllByTestId(STEP_MARKER)[1]).not.toHaveAttribute('data-invalid')
	expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	expect(screen.queryByText('This field is required')).not.toBeInTheDocument()
})

type HidingValues = { name: string; note: string; skip: boolean }

test('hiding the current step falls back to the nearest earlier step, not to the first', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<HidingValues> = {
		version: 1,
		children: [
			{ type: 'step', title: 'One', children: [{ type: FormFieldType.Text, name: 'name', label: 'Name' }] },
			{ type: 'step', title: 'Two', children: [{ type: FormFieldType.Text, name: 'note', label: 'Note' }] },
			{
				type: 'step',
				title: 'Three',
				when: { field: 'skip', eq: false },
				children: [{ type: FormFieldType.Checkbox, name: 'skip', label: 'Skip this step' }],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', note: '', skip: false }}
			onSubmit={() => {}}
		/>,
	)

	await user.click(screen.getByRole('button', { name: /next/i }))
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(screen.getByLabelText('Skip this step')).toBeInTheDocument()

	// The step the user is on hides itself. The wizard lands on step two — the nearest surviving
	// step *before* it — rather than throwing the user back to step one.
	await user.click(screen.getByLabelText('Skip this step'))

	expect(screen.getByLabelText('Note')).toBeInTheDocument()
	expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
	const steps = screen.getAllByTestId(STEP_MARKER)
	expect(steps).toHaveLength(2)
	expect(steps[1]).toHaveAttribute('aria-current', 'step')
})

type LockingValues = { name: string; lock: boolean }

test('`disabledWhen` disables an already-visited step and its goTo', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<LockingValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'One',
				disabledWhen: { field: 'lock', eq: true },
				children: [{ type: FormFieldType.Text, name: 'name', label: 'Name' }],
			},
			{
				type: 'step',
				title: 'Two',
				children: [{ type: FormFieldType.Checkbox, name: 'lock', label: 'Lock step one' }],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', lock: false }}
			onSubmit={() => {}}
		/>,
	)

	// Step one is visited — so `disabledWhen` is the only thing that can disable it.
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(screen.getByRole('button', { name: 'One' })).toBeEnabled()

	await user.click(screen.getByLabelText('Lock step one'))

	const trigger = screen.getByRole('button', { name: 'One' })
	expect(trigger).toBeDisabled()

	// …and the navigation it would have performed does not happen.
	await user.click(trigger)
	expect(screen.getByLabelText('Lock step one')).toBeInTheDocument()
	expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
})

type FallbackValues = { name: string; email: string; show: boolean; skip: boolean }

/**
 * The F5 fallback is a second way onto a step, and it can land the user on one they have never
 * seen. Clearing the stale errors only inside `goNext` therefore left this arrival red.
 */
test('a step reached by the hidden-step fallback does not open red either', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<FallbackValues> = {
		version: 1,
		children: [
			{ type: 'step', title: 'One', children: [{ type: FormFieldType.Text, name: 'name', label: 'Name' }] },
			{
				type: 'step',
				title: 'Two',
				when: { field: 'show', eq: true },
				children: [{ type: FormFieldType.Text, name: 'email', label: 'Email', validate: { required: true } }],
			},
			{
				type: 'step',
				title: 'Three',
				when: { field: 'skip', eq: false },
				children: [
					{ type: FormFieldType.Checkbox, name: 'show', label: 'Show step two' },
					{ type: FormFieldType.Checkbox, name: 'skip', label: 'Skip step three' },
				],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', email: '', show: false, skip: false }}
			onSubmit={() => {}}
		/>,
	)

	// Step two is hidden, so "next" from step one lands on step three.
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(screen.getByLabelText('Skip step three')).toBeInTheDocument()

	// Revealing step two runs the form-level validator, which writes "required" onto its empty
	// field while the user is still standing on step three.
	await user.click(screen.getByLabelText('Show step two'))
	expect(screen.getAllByTestId(STEP_MARKER)).toHaveLength(3)

	// Step three now hides itself: the wizard falls back onto step two, which the user has never
	// visited and which `goNext` never got the chance to clear.
	await user.click(screen.getByLabelText('Skip step three'))

	expect(await screen.findByLabelText('Email')).toBeInTheDocument()
	expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	expect(screen.queryByText('This field is required')).not.toBeInTheDocument()
	expect(screen.getAllByTestId(STEP_MARKER)[1]).not.toHaveAttribute('data-invalid')
})

type ThreeStepValues = { name: string; age: string; note: string }

/**
 * `visited` means "validated at least once", which is why only `goNext` writes to it. Both
 * directions of spec §10.2 are pinned here: backing out of a step must not make it count as
 * validated (or the errors it still carries would be reported as clean, and its stale errors
 * would never be cleared again), and a step the user genuinely failed to leave must keep
 * reporting `invalid` after they navigate away from it.
 */
test('backing out of a step does not count as validating it, but failing to leave one does', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<ThreeStepValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'One',
				children: [{ type: FormFieldType.Text, name: 'name', label: 'Name', validate: { required: true } }],
			},
			{
				type: 'step',
				title: 'Two',
				children: [{ type: FormFieldType.Text, name: 'age', label: 'Age', validate: { required: true } }],
			},
			{ type: 'step', title: 'Three', children: [{ type: FormFieldType.Text, name: 'note', label: 'Note' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '', note: '' }}
			onSubmit={() => {}}
		/>,
	)

	await user.type(screen.getByLabelText('Name'), 'Ann')
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(await screen.findByLabelText('Age')).toBeInTheDocument()
	expect(screen.queryByRole('alert')).not.toBeInTheDocument()

	// Back, then forward again. Step two was never *left*, so it is still unvisited and its stale
	// errors are cleared on arrival exactly as they were the first time.
	await user.click(screen.getByRole('button', { name: /back/i }))
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(await screen.findByLabelText('Age')).toBeInTheDocument()
	expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	expect(screen.getAllByTestId(STEP_MARKER)[1]).not.toHaveAttribute('data-invalid')

	// Trying to leave step two is what validates it. It fails, so it is visited *and* failing…
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(await screen.findByRole('alert')).toHaveTextContent('This field is required')
	expect(screen.getAllByTestId(STEP_MARKER)[1]).toHaveAttribute('data-invalid', 'true')

	// …and it must keep saying so once the user walks away from it (spec §10.2). Leaving a step
	// unmounts its fields, which drops their meta, so the marker only has something to report
	// again once any edit re-runs the document-wide validator — but `visited` must survive that
	// round trip, or the stepper would call a step that blocks submission clean.
	await user.click(screen.getByRole('button', { name: /back/i }))
	await user.type(screen.getByLabelText('Name'), 'e')
	expect(screen.getAllByTestId(STEP_MARKER)[1]).toHaveAttribute('data-invalid', 'true')
})
