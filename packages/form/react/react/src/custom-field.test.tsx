import { fireEvent, render, screen } from '@testing-library/react'
import { useReducer } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { createForm } from './create-form'
import { defineFieldType } from './field-registry'
import { testComponents, testFields } from './test-kit'

import type { FormFieldSlots, TextFieldRenderProps } from './contract'
import type { CustomFieldRenderProps } from './schema/registries'
import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

// ── a custom field bound to a string, so it can sit on the *same* path as a built-in ──────

type NoteProps = { hint: string }

const noteCalls: CustomFieldRenderProps<string, NoteProps>[] = []

const NoteField = defineFieldType<NoteProps, string>()(function Note(props): ReactNode {
	noteCalls.push(props)
	return (
		<input
			data-testkit='note'
			id={props.id}
			name={props.name}
			value={props.value}
			onBlur={props.onBlur}
			onChange={(event) => {
				props.onChange(event.target.value)
			}}
		/>
	)
})

const textCalls: TextFieldRenderProps[] = []

/**
 * A stand-in for the kit's own `TextField` that records exactly what the bespoke binder
 * handed it — the reference the custom field's binding is compared against below.
 */
const CapturingTextField: FormFieldSlots['TextField'] = (props) => {
	textCalls.push(props)
	return (
		<input
			data-testkit='captured-text'
			value={props.value}
			onChange={(event) => {
				props.onChange(event.target.value)
			}}
		/>
	)
}

const { Form, FormRenderer } = createForm({
	components: testComponents,
	fields: { ...testFields, TextField: CapturingTextField, NoteField },
})

beforeEach(() => {
	noteCalls.length = 0
	textCalls.length = 0
})

describe('a custom field on the form instance', () => {
	it('is reachable under the key it was registered at', () => {
		render(
			<Form defaultValues={{ note: 'hi' }}>
				{(form) => (
					<form.NoteField
						name='note'
						label='Note'
						hint='x'
					/>
				)}
			</Form>,
		)

		expect(document.querySelector('[data-testkit="note"]')).not.toBeNull()
		expect(noteCalls).toHaveLength(1)
		expect(noteCalls[0]?.value).toBe('hi')
	})

	it('receives the identical binding a built-in field receives', () => {
		render(
			<Form defaultValues={{ note: 'hi' }}>
				{(form) => (
					<>
						<form.TextField
							name='note'
							label='Note'
							description='D'
							disabled
							required
						/>
						<form.NoteField
							name='note'
							label='Note'
							description='D'
							disabled
							required
							hint='x'
						/>
					</>
				)}
			</Form>,
		)

		const text = textCalls[0]
		const note = noteCalls[0]
		expect(text).toBeDefined()
		expect(note).toBeDefined()
		if (text === undefined || note === undefined) return

		// Compared against the real built-in binding rather than a hand-written list of keys,
		// so a seventh member of `FieldRenderProps` is covered the day it lands. `onBlur` is
		// excluded only because the two fields hold two `FieldApi` instances and therefore two
		// distinct bound handlers — its presence is asserted separately.
		const { value: _v, onChange: _oc, type: _t, placeholder: _p, onBlur: _ob, ...builtInBinding } = text
		const { value: _cv, onChange: _coc, props: _cp, onBlur: customBlur, ...customBinding } = note

		expect(typeof customBlur).toBe('function')
		expect(customBinding).toEqual({ ...builtInBinding, 'data-field-type': 'note' })
	})

	it('stamps the id derived from its registry key as data-field-type', () => {
		render(
			<Form defaultValues={{ note: 'hi' }}>
				{(form) => (
					<form.NoteField
						name='note'
						hint='x'
					/>
				)}
			</Form>,
		)

		expect(noteCalls[0]?.['data-field-type']).toBe('note')
	})

	it('nests the flat author props under `props` and lets nothing else in', () => {
		render(
			<Form defaultValues={{ note: 'hi' }}>
				{(form) => (
					<form.NoteField
						name='note'
						label='Note'
						description='D'
						disabled
						required
						validate={{ required: true }}
						hint='x'
					/>
				)}
			</Form>,
		)

		// The author's own keys, and only those: `label` / `disabled` / `validate` / `name` are
		// the binding's business and must not reach a delivered document's namespace.
		expect(noteCalls[0]?.props).toEqual({ hint: 'x' })
	})
})

describe('replacing a built-in field at its own key', () => {
	const replacementCalls: TextFieldRenderProps[] = []

	const ReplacementTextField: FormFieldSlots['TextField'] = (props) => {
		replacementCalls.push(props)
		return (
			<input
				data-testkit='replacement-text'
				value={props.value}
				onChange={(event) => {
					props.onChange(event.target.value)
				}}
			/>
		)
	}

	const { Form: ReplacedForm } = createForm({
		components: testComponents,
		fields: { ...testFields, TextField: ReplacementTextField },
	})

	it('renders the replacement and still routes through the bespoke text binder', () => {
		replacementCalls.length = 0
		render(
			// A number in form state where the field expects text: only the bespoke binder's
			// `asText` coercion turns it into `'7'`. The generic binder would pass it through
			// raw, so this is what proves a built-in key never falls to the generic route.
			<ReplacedForm defaultValues={{ note: 7 as unknown as string }}>
				{(form) => (
					<form.TextField
						name='note'
						label='Note'
					/>
				)}
			</ReplacedForm>,
		)

		expect(document.querySelector('[data-testkit="replacement-text"]')).not.toBeNull()
		expect(replacementCalls[0]?.value).toBe('7')
		// The generic binder always passes a `props` bag; the bespoke one never does.
		expect(replacementCalls[0]).not.toHaveProperty('props')
		expect(replacementCalls[0]?.['data-field-type']).toBe('text')
	})
})

describe('a custom field inside an array entry', () => {
	type RatingProps = { max: number }

	const ratingCalls: CustomFieldRenderProps<number, RatingProps>[] = []

	const RatingField = defineFieldType<RatingProps, number>()(function Rating(props): ReactNode {
		ratingCalls.push(props)
		return (
			<output
				data-testkit='rating'
				data-field={props['data-field']}
			>
				{props.value} / {props.props.max}
			</output>
		)
	})

	const { Form: ArrayForm } = createForm({
		components: testComponents,
		fields: { ...testFields, RatingField },
	})

	it('binds to the entry path with no extra work', () => {
		ratingCalls.length = 0
		render(
			<ArrayForm defaultValues={{ items: [{ score: 3 }] }}>
				{(form) => (
					<form.ArrayField
						name='items'
						newItem={{ score: 0 }}
					>
						{({ items }) =>
							items.map((item) => (
								<item.RatingField
									key={item.key}
									name='score'
									max={5}
								/>
							))
						}
					</form.ArrayField>
				)}
			</ArrayForm>,
		)

		expect(ratingCalls[0]?.name).toBe('items[0].score')
		expect(ratingCalls[0]?.value).toBe(3)
		expect(document.querySelector('[data-testkit="rating"]')?.getAttribute('data-field')).toBe('items[0].score')
	})
})

// ── regressions found in review of this slice ─────────────────────────────────────────────

describe('author props named after Object.prototype members', () => {
	type ShadowProps = { toString: string; constructor: string; ordinary: string }

	const shadowCalls: CustomFieldRenderProps<string, ShadowProps>[] = []

	const ShadowField = defineFieldType<ShadowProps, string>()(function Shadow(props): ReactNode {
		shadowCalls.push(props)
		return null
	})

	const { Form: ShadowForm } = createForm({
		components: testComponents,
		fields: { ...testFields, ShadowField },
	})

	it('reach the component instead of being swallowed by the prototype chain', () => {
		// `key in BASE_FIELD_PROP_KEYS` walks `Object.prototype`, so these three would arrive as
		// `{ ordinary }` alone — the other two lost between the call site and the component with
		// nothing reported. The split must ask about own properties only.
		shadowCalls.length = 0

		render(
			<ShadowForm defaultValues={{ note: '' }}>
				{(form) => (
					<form.ShadowField
						name='note'
						toString='mine'
						constructor='mine2'
						ordinary='mine3'
					/>
				)}
			</ShadowForm>,
		)

		expect(shadowCalls[0]?.props).toEqual({ toString: 'mine', constructor: 'mine2', ordinary: 'mine3' })
	})
})

describe('the two entry points meet the same component', () => {
	/**
	 * The point of a single registration site: `NoteField` is registered once, on the factory,
	 * and is reached two ways — `<form.NoteField name='note' hint='x' />` through the generic
	 * binder, and `{ type: 'note', props: { hint: 'x' } }` through `RenderNode`'s custom branch.
	 * Those are two separate binders in two separate files, so nothing but a test holds them to
	 * one shape. Before Slice B the document half was fed by a per-form `fields` prop that took
	 * a *differently keyed* registry of *differently shaped* components, and the two could
	 * disagree about what `note` meant without anything noticing.
	 *
	 * The nested `props` bag is the part worth pinning: the JSX call site writes `hint` flat and
	 * the binder collects it back into `props`, while a document authors it under `props`
	 * already — so a component written for one path works unchanged on the other.
	 */
	it('hands a document-mounted field the same props a JSX-mounted one gets', () => {
		render(
			<Form defaultValues={{ note: 'hi' }}>
				{(form) => (
					<form.NoteField
						name='note'
						label='Note'
						description='D'
						// Written explicitly so the two mounts are comparable: `RenderNode` always
						// computes a boolean for `disabled` (there is a `disabledWhen` condition to
						// evaluate, false when the node declares none), where the JSX call site may
						// simply omit the prop and leave it `undefined`. Both are falsy and no kit
						// can tell them apart; pinning it here keeps the comparison about the
						// binding rather than about that one optional prop.
						disabled={false}
						required
						hint='x'
					/>
				)}
			</Form>,
		)

		const schema = {
			version: 1,
			children: [{ type: 'note', name: 'note', label: 'Note', description: 'D', required: true, props: { hint: 'x' } }],
		} as FormSchema<{ note: string }, 'note'>

		render(
			<FormRenderer
				schema={schema}
				defaultValues={{ note: 'hi' }}
				onSubmit={() => {}}
			/>,
		)

		const jsx = noteCalls[0]
		const document_ = noteCalls[1]
		expect(jsx).toBeDefined()
		expect(document_).toBeDefined()
		if (jsx === undefined || document_ === undefined) return

		// `onBlur` and `onChange` are excluded for the reason the built-in comparison above
		// excludes `onBlur`: the two mounts hold two `FieldApi` instances, so their bound
		// handlers are distinct functions by construction. Everything else — `id`,
		// `data-field`, `data-field-type`, the normalised `errors`, `invalid`, `disabled`, and
		// the whole `props` bag — is compared verbatim.
		const { onBlur: jsxBlur, onChange: jsxChange, ...jsxRest } = jsx
		const { onBlur: docBlur, onChange: docChange, ...docRest } = document_

		expect(typeof jsxBlur).toBe('function')
		expect(typeof docBlur).toBe('function')
		expect(typeof jsxChange).toBe('function')
		expect(typeof docChange).toBe('function')
		expect(docRest).toEqual(jsxRest)
		expect(docRest.props).toEqual({ hint: 'x' })
	})
})

describe('the factory runs the registry checks', () => {
	const Noop = (): ReactNode => null

	/**
	 * `createForm` calls `deriveFieldTypeIds` for its throw and discards the map. A discarded
	 * return value reads as dead code, and `field-registry.test.ts` exercises the function
	 * directly — so deleting the call leaves every test green while no real form is ever
	 * checked again. This is the test that goes red instead.
	 */
	it('rejects a key whose derived id shadows a reserved node type', () => {
		expect(() => createForm({ components: testComponents, fields: { ...testFields, SectionField: Noop } })).toThrow(
			/section/i,
		)
	})

	/**
	 * `binders[key]` reaches through `Object.prototype`, so a key named `toString` resolved
	 * `Object.prototype.toString` — a function — and was misclassified as a built-in. That
	 * function was then called as a binder and put the string `'[object Object]'` where a
	 * component belongs, which React reports as `Element type is invalid`, naming nothing.
	 */
	it('binds a key named after an Object.prototype member as a custom field, not a built-in', () => {
		const { Form: ProtoForm } = createForm({
			components: testComponents,
			fields: { ...testFields, toString: Noop },
		})

		expect(() =>
			render(
				<ProtoForm defaultValues={{ note: '' }}>
					{(form) => (
						<form.toString
							name='note'
							label='Note'
						/>
					)}
				</ProtoForm>,
			),
		).not.toThrow()
	})

	/**
	 * The builder writes five of its own keys over the registry's output, so a field registered
	 * under one of them was accepted everywhere and then silently overwritten — `form.GridItem`
	 * rendered the layout component and the author's field never appeared. `Section` and `Array`
	 * were caught only by accident, their ids happening to be reserved node types.
	 */
	it.each(['GridItem', 'SubmitButton'])('rejects %s, which the builder would overwrite', (key) => {
		expect(() => createForm({ components: testComponents, fields: { ...testFields, [key]: Noop } })).toThrow(
			new RegExp(key),
		)
	})

	it('rejects two keys deriving one id', () => {
		expect(() =>
			createForm({ components: testComponents, fields: { ...testFields, Rating: Noop, RatingField: Noop } }),
		).toThrow(/rating/i)
	})
})

describe('the authored props bag', () => {
	type BagProps = { hint: string }

	const bags: Record<string, unknown>[] = []

	const BagField = defineFieldType<BagProps, string>()(function Bag(props): ReactNode {
		bags.push(props.props)
		return null
	})

	const { Form: BagForm } = createForm({ components: testComponents, fields: { ...testFields, BagField } })

	function Harness(): ReactNode {
		const [, force] = useReducer((n: number) => n + 1, 0)
		return (
			<BagForm defaultValues={{ note: '' }}>
				{(form) => (
					<>
						<form.BagField
							name='note'
							hint='same'
						/>
						<button
							type='button'
							data-testid='rerender'
							onClick={force}
						>
							again
						</button>
					</>
				)}
			</BagForm>
		)
	}

	/**
	 * A document's `node.props` is a stable reference off the schema object, so the same field
	 * driven from a document keeps `React.memo` and `useMemo(…, [props.props])` across a parent
	 * render. A fresh bag per render would give the JSX path the opposite behaviour and make the
	 * "one component, both paths" claim false in the one way an author feels.
	 */
	it('keeps its identity across a re-render when nothing in it changed', () => {
		bags.length = 0

		render(<Harness />)
		fireEvent.click(screen.getByTestId('rerender'))

		expect(bags.length).toBeGreaterThan(1)
		expect(bags.at(-1)).toBe(bags[0])
	})
})
