import { buildValidator, isFieldNode, setValueAtPath, stripHiddenValues, walkNodes } from '@ez-kit/form-core'

import { SchemaTranslate } from '../options/source-context'

import { FormWizard, isStepNode } from './form-wizard'
import { renderChildren } from './render-children'

import type { BlockRegistry, CustomFieldRegistry } from './registries'
import type { LayoutComponents } from './render-node'
import type { SubmittableForm } from '../bindable-form'
import type { FormElementProps } from '../contract'
import type { FormFieldComponents } from '../field-props'
import type {
	AnyFormSchema,
	FormAsyncValidateOrFn,
	FormOptions,
	FormValidateOrFn,
	NamedRule,
	StandardSchemaV1,
	Translate,
} from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * The `<form>` element's own props, minus the ones `FormRenderer` owns.
 *
 * `translate` is dropped as well as `onSubmit`/`children`: `<form>` carries a DOM `translate`
 * attribute typed `'yes' | 'no'`, and without this the two definitions intersect into
 * `('yes' | 'no') & Translate` — a type nothing can satisfy, which made the renderer's own
 * documented `translate` prop impossible to pass.
 */
type FormElementRest = Omit<FormElementProps, 'onSubmit' | 'children' | 'translate'>

export type SharedRendererProps<TValues> = {
	/**
	 * The document `FormRenderer` walks — field nodes, optionally grouped into `section`s.
	 * Typed `AnyFormSchema` (`FormSchema<TValues, string>`), not `FormSchema<TValues>`
	 * (`TCustom` defaulting to `never`): a schema authored with `defineFormSchema<TValues,
	 * TCustom>()` carries its own closed `TCustom` set, which would otherwise make it
	 * unassignable here the moment it declares a single custom field type.
	 */
	schema: AnyFormSchema<TValues>
	/** Resolves a `LocalizedText` translation key. Required only if the schema uses one. */
	translate?: Translate
	/**
	 * Custom field kinds referenced from the schema by `type` (spec §4.7, §8) — a field with
	 * a `name`, bound to a value, that receives the same binding a built-in field gets.
	 * `FormRenderer` throws if a key here collides with a reserved node type (see
	 * `assertNoReservedFieldKeyCollision`).
	 */
	fields?: CustomFieldRegistry
	/**
	 * Block components referenced from the schema by `component` (spec §4.7, §8) — markup
	 * with no `name` and no value binding, rendered from its own `props` only.
	 */
	blocks?: BlockRegistry
	/**
	 * Named validation rules a `validate.rule` reference resolves against — the same shape
	 * `@ez-kit/form-core`'s `buildValidator` consumes. Only meaningful in uncontrolled mode,
	 * where `FormRenderer` calls `buildValidator` itself (see `resolveSchemaValidators`); a
	 * controlled caller builds its own instance and so builds its own validator too, the same
	 * reason `keepHiddenValues` only exists on the uncontrolled props below.
	 */
	rules?: Record<string, NamedRule>
}

/**
 * What `FormRenderer` needs from a form instance: enough to wire `<form onSubmit>` (from
 * `SubmittableForm`) and one bound component per field kind (from `FormFieldComponents`).
 * Narrower than the full `KitFormApi` on purpose — mirrors why `FormControlledProps` types
 * its `form` as `SubmittableForm` rather than the whole TanStack surface.
 */
export type RendererForm<TValues> = SubmittableForm & FormFieldComponents<TValues>

/**
 * Controlled mode: the caller owns the instance and passes it in.
 *
 * In this mode `FormRenderer` cannot strip hidden values for you — you own `onSubmit`, not
 * it — so there is deliberately no `keepHiddenValues` here (see
 * `FormRendererUncontrolledProps`, the only mode that has it). Call `stripHiddenValues`
 * yourself at the top of your own handler to get the same default the uncontrolled mode
 * gives you for free:
 *
 * ```ts
 * const form = useForm({
 *   defaultValues,
 *   onSubmit: ({ value }) => save(stripHiddenValues(schema, value)),
 * })
 * <FormRenderer form={form} schema={schema} />
 * ```
 *
 * (`stripHiddenValues` is re-exported from `@ez-kit/form-react`'s root, so this needs no
 * second dependency on `@ez-kit/form-core`.)
 *
 * Why `FormRenderer` can't do this itself: uncontrolled mode wraps `onSubmit` *before* it is
 * ever handed to `useForm` (see `UncontrolledFormRenderer` in `../create-form.tsx`), which
 * only works because `FormRenderer` is the one calling `useForm`. Here, `onSubmit` is already
 * closed over inside an instance you built yourself — by the time `FormRenderer` sees `form`,
 * there is no seam left to wrap. Reaching into the live instance from here wouldn't help
 * either: TanStack's own `useForm` re-syncs your original, unwrapped options into it on every
 * render (a per-render `formApi.update(opts)`), so any wrap `FormRenderer` applied would just
 * lose that race back to your unwrapped `onSubmit`.
 */
export type FormRendererControlledProps<TValues> = FormElementRest &
	SharedRendererProps<TValues> & {
		form: RendererForm<TValues>
	}

/**
 * Uncontrolled mode: pass the options `useForm` takes (mirrors `FormUncontrolledProps`) and
 * `FormRenderer` runs the hook itself.
 */
export type FormRendererUncontrolledProps<
	TValues,
	TOnMount extends undefined | FormValidateOrFn<TValues>,
	TOnChange extends undefined | FormValidateOrFn<TValues>,
	TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TValues>,
	TOnBlur extends undefined | FormValidateOrFn<TValues>,
	TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TValues>,
	TOnSubmit extends undefined | FormValidateOrFn<TValues>,
	TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TValues>,
	TOnDynamic extends undefined | FormValidateOrFn<TValues>,
	TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TValues>,
	TOnServer extends undefined | FormAsyncValidateOrFn<TValues>,
	TSubmitMeta,
> = FormElementRest &
	FormOptions<
		TValues,
		TOnMount,
		TOnChange,
		TOnChangeAsync,
		TOnBlur,
		TOnBlurAsync,
		TOnSubmit,
		TOnSubmitAsync,
		TOnDynamic,
		TOnDynamicAsync,
		TOnServer,
		TSubmitMeta
	> &
	SharedRendererProps<TValues> & {
		/** Mutually exclusive with the inline options — never pass both. */
		form?: never
		/**
		 * Keep fields hidden by a `when` condition in the submitted value instead of
		 * stripping them (spec §6's default). Stripping happens once, at submit — hiding a
		 * field never deletes what the user already typed into it (see `stripHiddenValues`).
		 */
		keepHiddenValues?: boolean
	}

/** The widest shape that covers both modes — what sits behind `FormRenderer`'s overloads. */
export type AnyFormRendererProps = FormElementRest &
	SharedRendererProps<unknown> & {
		form?: RendererForm<unknown>
	}

/** The uncontrolled shape at its least specific, once the overloads have validated the caller. */
export type FormRendererUncontrolledImplProps = FormRendererUncontrolledProps<
	unknown,
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
	never
>

/** Which mode the caller picked — `form` is the discriminant, exactly as for `Form`. */
export function isRendererControlled<TValues>(props: {
	form?: unknown
}): props is FormRendererControlledProps<TValues> {
	return props.form !== undefined
}

/**
 * Every field node's own `defaultValue`, written at the path its `name` describes.
 *
 * Spec §4.6: a backend-delivered schema is the only thing that knows its own fields exist,
 * so a caller who supplies no `defaultValues` still gets one built from the schema — a
 * caller-supplied `defaultValues` always wins over this (see the caller of this function).
 *
 * `name` is a full root path, so `'company.inn'` must become `{ company: { inn } }` and not
 * the literal key `"company.inn"`: TanStack binds the field to the nested path, so a flat key
 * would leave the input empty, discard the author's default, and ship a phantom dotted key in
 * the submitted payload that `stripHiddenValues` would then treat as a top-level name of its
 * own. `setValueAtPath` is the exact inverse of the `getValueAtPath` conditions read through.
 */
export function schemaDefaultValues<TValues>(schema: AnyFormSchema<TValues>): Record<string, unknown> {
	// Rebound rather than mutated — `setValueAtPath` returns a new object each time.
	let defaults: Record<string, unknown> = {}
	walkNodes(schema, (node) => {
		if (isFieldNode(node) && node.defaultValue !== undefined) {
			defaults = setValueAtPath(defaults, node.name, node.defaultValue)
		}
	})
	return defaults
}

/**
 * The one submit-time hook: strip fields spec §5 currently hides (per `stripHiddenValues`)
 * out of `value` before the caller's own `onSubmit` ever sees it, unless `keepHiddenValues`
 * opted out. Returns `onSubmit` untouched when there is nothing to wrap — `undefined` stays
 * `undefined` rather than becoming a no-op function TanStack would still treat as "handler
 * provided".
 *
 * Deliberately loose-typed (`unknown` in, `unknown` out): this runs in `UncontrolledFormRenderer`
 * against `options` before it is cast to the real, deeply-generic `FormOptions<…>` shape — see
 * the call site in `../create-form.tsx`, which already casts the same object the same way.
 */
export function stripHiddenValuesOnSubmit<TValues>(
	schema: AnyFormSchema<TValues>,
	onSubmit: unknown,
	keepHiddenValues: boolean | undefined,
): unknown {
	if (typeof onSubmit !== 'function' || keepHiddenValues === true) return onSubmit

	return (submitProps: { value: TValues } & Record<string, unknown>) =>
		(onSubmit as (props: unknown) => unknown)({
			...submitProps,
			value: stripHiddenValues(schema, submitProps.value),
		})
}

/**
 * Whether any field node in `schema` declares a `validate` block. Cheap on its own, but called
 * from `resolveSchemaValidators`, which `UncontrolledFormRenderer` memoises — so in practice
 * this only re-walks the tree when `schema` itself changes identity, not on every render.
 */
export function schemaHasValidateConstraints<TValues>(schema: AnyFormSchema<TValues>): boolean {
	let hasConstraints = false
	walkNodes(schema, (node) => {
		if (isFieldNode(node) && node.validate !== undefined) hasConstraints = true
	})
	return hasConstraints
}

/**
 * The `validators` option `UncontrolledFormRenderer` hands to `useForm` — either the schema's
 * declarative constraints compiled by `buildValidator`, or the caller's own `validators`
 * verbatim. Never both: TanStack Form accepts exactly one validator per trigger, a standard
 * schema *or* a function, so there is no way to merge two issue sets onto one path without
 * risking duplicated messages in an undefined order (spec §7.4, §9.3). A caller who needs both
 * a schema and hand-written checks still has the documented escape hatch — field-level
 * validators through the native `form.Field` compose with either mode, because TanStack runs
 * field-level and form-level validators together.
 *
 * Throws (rather than silently picking a winner) when the schema declares constraints *and*
 * the caller also supplied `validators` — the two would otherwise race for the same
 * `onChange`/`onSubmit` slot with no defined precedence.
 *
 * Not memoised here: this is a plain function so it stays trivially unit-testable. Its one
 * call site (`UncontrolledFormRenderer`) wraps it in `useMemo` — every call otherwise re-walks
 * the schema and, when constraints exist, builds a fresh `buildValidator` instance and a fresh
 * `{ onChange, onSubmit }` object, which would hand `useForm` a differently-identitied
 * `validators` value on every render.
 */
export function resolveSchemaValidators<TValues>(
	schema: AnyFormSchema<TValues>,
	callerValidators: unknown,
	rules: Record<string, NamedRule> | undefined,
	translate: Translate | undefined,
): unknown {
	if (!schemaHasValidateConstraints(schema)) return callerValidators

	if (callerValidators !== undefined) {
		throw new Error(
			'FormRenderer received both schema `validate` constraints and a `validators` prop. ' +
				'Use either the schema constraints or your own `validators` — never both. ' +
				'Field-level validators through `form.Field` still compose with either.',
		)
	}

	const validator: StandardSchemaV1<TValues, TValues> = buildValidator(schema, {
		...(rules !== undefined && { rules }),
		...(translate !== undefined && { translate }),
	})
	return { onChange: validator, onSubmit: validator }
}

/**
 * Whether the document is a wizard — its top-level children are `step` nodes.
 *
 * Spec §4.5 makes mixing `step` with non-`step` siblings a parse error, which `parseFormSchema`
 * enforces for a delivered document. A TS-authored schema never goes through the parser, so
 * the same rule is enforced here: a half-wizard would otherwise silently drop the loose nodes
 * (they would never be rendered by any step) instead of telling the author.
 */
export function isWizardSchema<TValues>(schema: AnyFormSchema<TValues>): boolean {
	const stepCount = schema.children.filter((node) => isStepNode(node)).length
	if (stepCount === 0) return false
	if (stepCount !== schema.children.length) {
		throw new Error(
			'A form schema may not mix `step` nodes with non-`step` siblings at the same level. ' +
				'Move the loose nodes into a step, or drop the steps.',
		)
	}
	return true
}

/**
 * Render the schema's top-level children — one already-bound field component per field
 * node, a headed, column-gridded block per `section`, recursively — via `renderChildren`.
 *
 * `layout` carries `Section`/`GridItem`/`Wizard` straight from the kit's raw `components`,
 * separate from `form`'s bound field components: unlike a field, a container has no form state
 * of its own. There is no enclosing grid at the top level, so `parentColumns` starts
 * `undefined`. `fields` and `blocks` resolve `type: '<custom>'` and `type: 'block'` nodes
 * respectively (spec §4.7, §8).
 *
 * A document whose top level is `step` nodes is a wizard and goes to `FormWizard` instead,
 * which renders one step at a time through the kit's `Wizard` (spec §4.5, §10). A `step` found
 * anywhere else still throws via `renderChildren`, exactly as a genuinely unknown `type` does.
 */
export function renderSchemaFields<TValues>(
	schema: AnyFormSchema<TValues>,
	form: FormFieldComponents<TValues>,
	layout: LayoutComponents,
	translate: Translate | undefined,
	fields: CustomFieldRegistry | undefined,
	blocks: BlockRegistry | undefined,
): ReactNode {
	const context = { translate, fields, blocks }

	// `SchemaTranslate` is the one thing the renderer publishes through context rather than
	// through `RenderNode`'s props: an option source's labels are `LocalizedText` too, and the
	// source is resolved inside the *field* component, which sees only the field's own props.
	return (
		<SchemaTranslate translate={translate}>
			{isWizardSchema(schema) ? (
				<FormWizard
					schema={schema}
					form={form}
					layout={layout}
					context={context}
				/>
			) : (
				renderChildren(schema.children, { form, layout, context, parentColumns: undefined })
			)}
		</SchemaTranslate>
	)
}
