import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { defineFieldType } from './field-registry'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import { revalidateLogic } from './index'

import type { KitWithFormProps } from './composition'
import type { AllFormFieldSlots, TextFieldRenderProps } from './contract'
import type { KitFieldProps } from './field-props'
import type { NoInjectedComponents } from './kit-form'
import type { WithFormProps } from '@tanstack/react-form'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type Values = { email: string; address: { city: string } }

const DEFAULTS: Values = { email: '', address: { city: '' } }

const { Form, useForm, withForm, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type RatingProps = { max: number }

const RatingField = defineFieldType<RatingProps, string>()(function Rating(): ReactNode {
	return null
})

const { useForm: useExtendedForm, withForm: withExtendedForm } = createForm({
	FormElement: testFormElement,
	fields: { ...testFields, RatingField },
	components: testComponents,
})

/**
 * Spec §12. Nothing here executes — every assertion is checked by `typecheck`, which is the
 * point: a bare re-export of TanStack's `withForm` types the render prop's `form` as
 * `AppFieldExtendedReactFormApi<…>`, so `form.TextField` would fail to compile inside a block
 * while working perfectly at runtime. Only a type-level test catches that.
 *
 * Every block is **rendered** from a parent component rather than merely asserted to be a
 * function: `expectTypeOf(Block).toBeFunction()` holds for a block whose props are
 * uninhabitable too, so it is the `<Block form={form} />` call site — and only that — which
 * constrains the returned component's prop type.
 */
describe('withForm — types', () => {
	it('exposes the kit field components on the render prop form', () => {
		const EmailBlock = withForm({
			defaultValues: DEFAULTS,
			render: ({ form }) => {
				expectTypeOf(form.TextField).toBeFunction()
				expectTypeOf(form.SubmitButton).toBeFunction()

				return (
					<form.TextField
						name='email'
						label='Email'
					/>
				)
			},
		})

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return <EmailBlock form={form} />
		}

		expectTypeOf(Parent).toBeFunction()
	})

	it('keeps the native TanStack API and the data generic on the render prop form', () => {
		const NativeBlock = withForm({
			defaultValues: DEFAULTS,
			render: ({ form }) => {
				expectTypeOf(form.state.values).toEqualTypeOf<Values>()
				expectTypeOf(form.Field).toBeFunction()
				expectTypeOf<typeof form.handleSubmit>().toBeFunction()

				return null
			},
		})

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return <NativeBlock form={form} />
		}

		expectTypeOf(Parent).toBeFunction()
	})

	it('still rejects a field name the form data does not have', () => {
		const Rejecting = withForm({
			defaultValues: DEFAULTS,
			render: ({ form }) => (
				<form.TextField
					// @ts-expect-error — 'nope' is not a key of Values
					name='nope'
					label='Nope'
				/>
			),
		})

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return <Rejecting form={form} />
		}

		expectTypeOf(Parent).toBeFunction()
	})

	it('passes the caller-declared extra render props through', () => {
		const WithProps = withForm({
			defaultValues: DEFAULTS,
			props: { heading: '' },
			render: ({ form, heading }) => {
				expectTypeOf(heading).toEqualTypeOf<string>()
				expectTypeOf(form.TextField).toBeFunction()

				return null
			},
		})

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<WithProps
					form={form}
					heading='Contact'
				/>
			)
		}

		expectTypeOf(Parent).toBeFunction()
	})

	/**
	 * The wrapper hands its options to TanStack through an `as never` cast (`create-form.tsx`),
	 * which launders the type identity: nothing else checks that our option shape still matches
	 * theirs. This is that check — a TanStack minor that adds or renames an option fails here
	 * rather than at a consumer's call site. `render` is excluded on purpose: substituting
	 * `KitFormApi` for `AppFieldExtendedReactFormApi` in it is the whole reason the wrapper
	 * exists.
	 */
	it('keeps the option shape assignable to TanStack’s WithFormProps', () => {
		type KitOptions = Omit<
			KitWithFormProps<
				Values,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				never,
				Record<never, never>
			>,
			'render'
		>

		type TanStackOptions = Omit<
			WithFormProps<
				Values,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				never,
				NoInjectedComponents,
				NoInjectedComponents,
				Record<never, never>
			>,
			'render'
		>

		expectTypeOf<KitOptions>().toExtend<TanStackOptions>()
	})
})

/**
 * `withFieldGroup`'s render prop receives a **group** API: a group carries TanStack's `Field`
 * (stage 4 makes it ours) and `NativeField`, and no flat fields (stage 5). What has to hold is
 * that the component it returns still accepts a kit form instance as its parent `form`.
 */
describe('withFieldGroup — types', () => {
	it('accepts a kit form instance as the parent form', () => {
		const AddressGroup = withFieldGroup({
			defaultValues: { city: '' },
			render: ({ group }) => {
				expectTypeOf(group.Field).toBeFunction()
				expectTypeOf(group.NativeField).toBeFunction()

				return null
			},
		})

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<AddressGroup
					form={form}
					fields='address'
				/>
			)
		}

		expectTypeOf(Parent).toBeFunction()
	})
})

describe("withForm — the app's own field kinds", () => {
	/**
	 * `withForm` is declared inside `createForm<TFields>`, so the registry is already in scope
	 * and a block should see it without the call site spelling anything. Before `TFields` reached
	 * `KitFormBlock`, `form` inside a block fell back to the kit's twelve and this was
	 * "Property 'RatingField' does not exist" — against a form that demonstrably carries one.
	 */
	it('exposes a registered field on the render prop form', () => {
		const ScoreBlock = withExtendedForm({
			defaultValues: DEFAULTS,
			render: ({ form }) => (
				<form.RatingField
					name='email'
					label='Score'
					max={5}
				/>
			),
		})

		function Parent(): ReactNode {
			const form = useExtendedForm({ defaultValues: DEFAULTS })
			return <ScoreBlock form={form} />
		}

		expectTypeOf(Parent).toBeFunction()
	})

	it('still types a block built from the plain kit against the twelve', () => {
		const EmailBlock = withForm({
			defaultValues: DEFAULTS,
			render: ({ form }) => (
				<form.TextField
					name='email'
					label='Email'
				/>
			),
		})

		expectTypeOf(EmailBlock).toBeFunction()
	})
})

describe('withForm — the form prop is optional (D7)', () => {
	it('compiles without form, and still checks a form that is passed', () => {
		const Block = withForm({
			defaultValues: { login: '' },
			render: ({ form }) => (
				<form.TextField
					name='login'
					label='Login'
				/>
			),
		})
		function Parent(): ReactNode {
			const other = useForm({ defaultValues: { amount: 0 } })
			return (
				<>
					<Block />
					<Block
						// @ts-expect-error -- a form of another shape is still rejected
						form={other}
					/>
				</>
			)
		}
		expectTypeOf(Parent).toBeFunction()
	})

	it("accepts a form whatever validators it was given, and still checks the form's shape", () => {
		const Block = withForm({
			defaultValues: { login: '' },
			render: ({ form }) => (
				<form.TextField
					name='login'
					label='Login'
				/>
			),
		})
		const schema = testSchema<{ login: string }>(() => [])
		function Parent(): ReactNode {
			const dynamic = useForm({
				defaultValues: { login: '' },
				validationLogic: revalidateLogic(),
				validators: { onDynamic: schema },
			})
			const onChange = useForm({ defaultValues: { login: '' }, validators: { onChange: schema } })
			const other = useForm({ defaultValues: { amount: 0 }, validators: { onChange: () => undefined } })
			return (
				<>
					<Block form={dynamic} />
					<Block form={onChange} />
					<Block
						// @ts-expect-error -- a form of another shape is still rejected, validators or not
						form={other}
					/>
				</>
			)
		}
		expectTypeOf(Parent).toBeFunction()
	})

	it("still checks the form's fields against the block's", () => {
		const Block = withExtendedForm({
			defaultValues: { login: '' },
			render: ({ form }) => (
				<form.RatingField
					name='login'
					max={5}
				/>
			),
		})
		function Parent(): ReactNode {
			const plain = useForm({ defaultValues: { login: '' } })
			return (
				<Block
					// @ts-expect-error -- a form whose bundle has no RatingField is rejected
					form={plain}
				/>
			)
		}
		expectTypeOf(Parent).toBeFunction()
	})
})

describe('group fields — types (D7)', () => {
	it('types group.X relative to the group, with a checked and an unchecked placement', () => {
		type Pair = { password: string; confirm: string }
		type PairValues = { email: string; n: number; security: Pair; newPassword: string; newPasswordRepeat: string }
		const Block = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			render: ({ group }) => (
				<>
					<group.TextField name='password' />
					<group.TextField
						// @ts-expect-error -- names are relative to the block
						name='security.password'
					/>
				</>
			),
		})
		const pairDefaults: PairValues = {
			email: '',
			n: 0,
			security: { password: '', confirm: '' },
			newPassword: '',
			newPasswordRepeat: '',
		}
		function Parent(): ReactNode {
			const form = useForm({ defaultValues: pairDefaults })
			return (
				<>
					<Block
						form={form}
						fields='security'
					/>
					<Block
						form={form}
						fields={{ password: 'newPassword', confirm: 'newPasswordRepeat' }}
					/>
					{/* @ts-expect-error -- email is not a Pair branch (an overloaded call reports at the tag) */}
					<Block
						form={form}
						fields='email'
					/>
					{/* @ts-expect-error -- n is not a string path */}
					<Block
						form={form}
						fields={{ password: 'n', confirm: 'newPasswordRepeat' }}
					/>
					<Block fields='security' />
					{/* @ts-expect-error -- a map names every key of the block */}
					<Block fields={{ password: 'newPassword' }} />
					<form.FormGroup name='security'>
						{(group) => (
							<group.TextField
								// @ts-expect-error -- relative to the group
								name='security.password'
							/>
						)}
					</form.FormGroup>
				</>
			)
		}
		expectTypeOf(Parent).toBeFunction()
	})
})

/** A text field taking every native `<input>` attribute the contract does not already compute. */
const InputTextField = (
	_props: TextFieldRenderProps & Omit<ComponentPropsWithoutRef<'input'>, keyof TextFieldRenderProps>,
): ReactNode => null
const inputKit = createForm({ fields: { ...testFields, TextField: InputTextField } })

describe('group fields — props beyond the binding come from the kit component', () => {
	it('passes a native attribute on a group field when the kit accepts it, and only then', () => {
		const InputBlock = inputKit.withFieldGroup({
			defaultValues: { city: '' },
			render: ({ group }) => (
				<group.TextField
					name='city'
					autoComplete='address-level2'
				/>
			),
		})
		const PlainBlock = withFieldGroup({
			defaultValues: { city: '' },
			render: ({ group }) => (
				<group.TextField
					name='city'
					// @ts-expect-error -- the test kit's TextField declares no `autoComplete`
					autoComplete='address-level2'
				/>
			),
		})
		function Parent(): ReactNode {
			const form = inputKit.useForm({ defaultValues: DEFAULTS })
			return (
				<>
					<InputBlock
						form={form}
						fields='address'
					/>
					<form.FormGroup name='address'>
						{(group) => (
							<group.TextField
								name='city'
								autoComplete='address-level2'
							/>
						)}
					</form.FormGroup>
				</>
			)
		}
		expectTypeOf(Parent).toBeFunction()
		expectTypeOf(PlainBlock).toBeFunction()
	})

	it('adds nothing beyond the binding for the contract-typed default set', () => {
		expectTypeOf<KitFieldProps<AllFormFieldSlots, 'TextField'>>().toEqualTypeOf<Record<never, never>>()
		expectTypeOf<KitFieldProps<AllFormFieldSlots, 'SelectField'>>().toEqualTypeOf<Record<never, never>>()
		expectTypeOf<KitFieldProps<AllFormFieldSlots, 'DateRangeField'>>().toEqualTypeOf<Record<never, never>>()
	})
})

describe('a form schema on onDynamic — types', () => {
	const valuesSchema = testSchema<Values>(() => [])
	const citySchema = testSchema<{ city: string }>(() => [])

	it('takes revalidateLogic and onDynamic on the form, and no onDynamic on a block', () => {
		void (
			<Form
				defaultValues={DEFAULTS}
				validationLogic={revalidateLogic()}
				validators={{ onDynamic: valuesSchema }}
			>
				{() => null}
			</Form>
		)

		withFieldGroup({
			defaultValues: { city: '' },
			// @ts-expect-error -- a block takes no `onDynamic`: it needs the form's `revalidateLogic`
			validators: { onDynamic: citySchema },
			render: () => null,
		})
	})
})
