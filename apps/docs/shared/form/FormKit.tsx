'use client'

import { createContext, useContext } from 'react'

import type {
	AnyFormProps,
	FormControlledProps,
	SchemaFormControlledProps,
	Form as ShadcnForm,
	SchemaForm as ShadcnSchemaForm,
	useForm as useShadcnForm,
	withFieldGroup as shadcnWithFieldGroup,
	withForm as shadcnWithForm,
} from '@ez-kit/form-shadcn'
import type { ComponentType, ReactNode } from 'react'

/**
 * The docs-only runtime switcher for the form kits — the `shared/DataGrid.tsx` analogue.
 *
 * The grid switches a *component*, so it can `React.lazy` the two kits and pick at render
 * time. A form kit's entry point includes a **hook**, which cannot be lazy-loaded, so the
 * chosen kit's bundle travels through context instead. The value is supplied once per embed
 * route — the kit is fixed for the lifetime of an iframe — so its identity is stable and
 * calling the hook below is a well-formed hook call.
 *
 * Examples import `Form` / `useForm` from here; the source panel rewrites that specifier to
 * the real kit package (see `rewrite-example-imports.ts`), because a reader copying the
 * example installs `@ez-kit/form-shadcn` or `@ez-kit/form-heroui`, not this file.
 */
// Re-exported so an example imports everything from this one specifier: the source panel
// rewrites it to the kit package, and both kits re-export these from `@ez-kit/form-react`.
export { FormFieldType } from '@ez-kit/form-react'
export type { FormInstance, SelectOption, ServerErrors } from '@ez-kit/form-react'

// The schema-authoring API, re-exported for the same reason — both kits re-export these
// verbatim from `@ez-kit/form-core`, so an example that imports them from here displays
// (and copies) as a single import from the kit the reader installed.
export { buildValidator, defineFormItem, defineFormSchema, FormSchemaError, parseFormSchema } from '@ez-kit/form-core'
export type { AnyFormSchema, FormSchema, NamedRule, RuleIssue } from '@ez-kit/form-core'

export type FormKit = {
	useForm: typeof useShadcnForm
	Form: typeof ShadcnForm
	SchemaForm: typeof ShadcnSchemaForm
	withForm: typeof shadcnWithForm
	withFieldGroup: typeof shadcnWithFieldGroup
}

const FormKitContext = createContext<FormKit | null>(null)

function useFormKit(): FormKit {
	const kit = useContext(FormKitContext)

	if (kit === null) {
		throw new Error('form kit: none in context. Render the example inside a <FormKitProvider />.')
	}

	return kit
}

export function FormKitProvider({ kit, children }: { kit: FormKit; children: ReactNode }) {
	return <FormKitContext.Provider value={kit}>{children}</FormKitContext.Provider>
}

export const useForm: FormKit['useForm'] = (options) => useFormKit().useForm(options)

/**
 * The kit's `<Form>`, resolved at render time.
 *
 * The cast restores the two overloads the delegating wrapper would otherwise flatten —
 * without it every example would lose the render prop's inferred form type. Only the docs
 * need this indirection; an app imports `Form` from its kit directly.
 */
export const Form = ((props: AnyFormProps) => {
	const { Form: KitForm } = useFormKit()

	// Which overload the props satisfy was settled at the call site; at runtime the two
	// modes are one component, so forwarding through either signature is equivalent.
	return <KitForm {...(props as FormControlledProps)} />
}) as typeof ShadcnForm

/**
 * The kit's `<SchemaForm>` — the config-driven entry point — resolved the same way as
 * `Form` above, and cast for the same reason: the two overloads (controlled / uncontrolled)
 * would otherwise flatten and an example would lose the inferred value type of `onSubmit`.
 */
export const SchemaForm = ((props: SchemaFormControlledProps<unknown>) => {
	const { SchemaForm: KitSchemaForm } = useFormKit()

	// Which overload the props satisfy was settled at the call site; at runtime the two
	// modes are one component, so forwarding through either signature is equivalent.
	return <KitSchemaForm {...props} />
}) as typeof ShadcnSchemaForm

/**
 * A block helper of the kit, resolved at render time. A block is declared at module scope in an
 * example, while the kit is only known inside the embed route, so the real block is built on the
 * first render under each kit and cached per kit.
 */
function delegateBlock<TOptions>(
	build: (kit: FormKit, options: TOptions) => unknown,
): (options: TOptions) => ComponentType<object> {
	return (options) => {
		const blocks = new WeakMap<FormKit, ComponentType<object>>()

		return function KitBlock(props: object) {
			const kit = useFormKit()
			let Block = blocks.get(kit)

			if (Block === undefined) {
				Block = build(kit, options) as ComponentType<object>
				blocks.set(kit, Block)
			}

			return <Block {...props} />
		}
	}
}

/** The kit's `withForm`, resolved at render time ({@link delegateBlock}). */
export const withForm = delegateBlock((kit, options: Parameters<FormKit['withForm']>[0]) =>
	kit.withForm(options),
) as unknown as FormKit['withForm']

/** The kit's `withFieldGroup`, resolved at render time ({@link delegateBlock}). */
export const withFieldGroup = delegateBlock((kit, options: Parameters<FormKit['withFieldGroup']>[0]) =>
	kit.withFieldGroup(options),
) as unknown as FormKit['withFieldGroup']
