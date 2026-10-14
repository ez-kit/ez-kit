import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@form-shadcn/components/ui/field'

import type { FieldRenderProps } from '@ez-kit/form-react'
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

/**
 * The chrome shared by every shadcn field: wrapper, label, description, error text — plus
 * the ids that tie them together for assistive technology.
 *
 * The chrome itself is not hand-rolled: shadcn ships a form-library-agnostic `field`
 * primitive (vendored at `components/ui/field.tsx`) that owns the layout, the
 * `orientation` variants and the typography. shadcn's `form` primitive is *not* usable
 * here — it is bound to react-hook-form's `Controller`/`FormProvider` — but `field` is,
 * so this shell is only the adapter that maps the `@ez-kit/form-react` contract onto it.
 *
 * shadcn fields are plain siblings, so this kit *can* factor the chrome out into one
 * component. `@ez-kit/form-react` deliberately does not: a React-Aria kit needs its chrome
 * nested inside the field root instead, which is why the contract hands each kit a flat
 * props object and lets it build its own tree.
 *
 * These are `blocks/` adapters over the vendored primitives in `components/ui/`, which stay
 * untouched (see CLAUDE.md).
 */

/** Suffixes appended to the field id to build the ids `aria-describedby` points at. */
const DESCRIPTION_ID_SUFFIX = '-description'
const ERROR_ID_SUFFIX = '-error'

/**
 * The `data-slot` values this kit publishes. The vendored primitives stamp their own
 * (`field`, `field-label`, `field-description`, `field-error`); each of them spreads
 * `...props` *after* that attribute, so passing ours through props overrides them — the
 * override lives here rather than in the immutable vendored file. Nothing in the
 * primitives' own CSS keys off the slots we rename: the `orientation` variants target
 * `[data-slot=field-label]` and `[data-slot=field-content]` only as *direct* children, and
 * in the horizontal layout the label sits inside `FieldContent`, whose slot we keep.
 */
const FIELD_SLOT = 'form-field'
const LABEL_SLOT = 'form-label'
const DESCRIPTION_SLOT = 'form-description'
const ERROR_SLOT = 'form-error'

/** Joins several validation messages into the single line the error row renders. */
const ERROR_SEPARATOR = ', '

/** What the shell hands the control so every field wires accessibility identically. */
export type FieldControlBinding = {
	'aria-describedby': string | undefined
}

export type FieldShellProps = Omit<FieldRenderProps, 'name' | 'onBlur' | 'disabled' | 'required'> & {
	children: (binding: FieldControlBinding) => ReactNode
	/** Renders the control before the label — the checkbox reading order. */
	controlFirst?: boolean
}

/** The keys of a field's props that {@link FieldShell} draws — the chrome around the control. */
type ChromeKey = 'label' | 'description' | 'errors' | 'invalid' | 'data-field' | 'data-field-type' | 'data-form-id'

/** The chrome half of a field's props, as {@link FieldShell} takes it beside the field's `id`. */
export type FieldChrome = Pick<FieldRenderProps, ChromeKey>

/**
 * Splits a field's props into the chrome {@link FieldShell} draws and everything else — the
 * computed control props (`id`, `name`, `value`, …) and the kit props an author wrote beside them,
 * which the field forwards to its control.
 */
export function splitChrome<TProps extends FieldChrome>(
	props: TProps,
): { chrome: FieldChrome; control: Omit<TProps, ChromeKey> } {
	const {
		label,
		description,
		errors,
		invalid,
		'data-field': dataField,
		'data-field-type': dataFieldType,
		'data-form-id': dataFormId,
		...control
	} = props
	return {
		chrome: {
			label,
			description,
			errors,
			invalid,
			'data-field': dataField,
			'data-field-type': dataFieldType,
			'data-form-id': dataFormId,
		},
		control,
	}
}

/**
 * Keys a control never takes from an author: the uncontrolled twins of the value the binding
 * controls, the accessibility wiring this kit computes, and `children`, which the field renders.
 */
type ControlledKey = 'defaultValue' | 'defaultChecked' | 'aria-invalid' | 'aria-describedby' | 'children'

/**
 * The props a field forwards to its control, as its kit props: everything `TControl` takes except
 * what the contract computes (`TRenderProps`), the {@link ControlledKey}s, and `TOmit` — the
 * control's own spelling of a computed prop (`onCheckedChange`, `onValueChange`, …).
 *
 * Every member is optional, as a slot requires: they come off an element's or a primitive's props,
 * which name nothing as mandatory.
 */
export type ControlProps<TControl extends ElementType, TRenderProps, TOmit extends PropertyKey = never> = Omit<
	ComponentPropsWithoutRef<TControl>,
	keyof TRenderProps | ControlledKey | TOmit
>

export function FieldShell({
	id,
	label,
	description,
	errors,
	invalid,
	children,
	controlFirst,
	...data
}: FieldShellProps): ReactNode {
	const descriptionId = description != null ? `${id}${DESCRIPTION_ID_SUFFIX}` : undefined
	const errorId = invalid ? `${id}${ERROR_ID_SUFFIX}` : undefined
	const describedBy = [descriptionId, errorId].filter((value) => value !== undefined).join(' ') || undefined

	const labelNode = label != null && (
		<FieldLabel
			data-slot={LABEL_SLOT}
			htmlFor={id}
		>
			{label}
		</FieldLabel>
	)
	const control = children({ 'aria-describedby': describedBy })
	const aside = (
		<>
			{descriptionId !== undefined && (
				<FieldDescription
					data-slot={DESCRIPTION_SLOT}
					id={descriptionId}
				>
					{description}
				</FieldDescription>
			)}
			{errorId !== undefined && (
				<FieldError
					data-slot={ERROR_SLOT}
					id={errorId}
				>
					{errors.join(ERROR_SEPARATOR)}
				</FieldError>
			)}
		</>
	)

	// A checkbox reads as `[control] Label`. The primitive's `horizontal` orientation lays
	// the control and the following block out in a row; wrapping label + help text in
	// `FieldContent` keeps those on their own rows beside the control (and switches the row
	// to `items-start`, so the control aligns with the first line of the label).
	if (controlFirst === true) {
		return (
			<Field
				orientation='horizontal'
				data-slot={FIELD_SLOT}
				data-invalid={invalid || undefined}
				{...data}
			>
				{control}
				<FieldContent>
					{labelNode}
					{aside}
				</FieldContent>
			</Field>
		)
	}

	return (
		<Field
			data-slot={FIELD_SLOT}
			data-invalid={invalid || undefined}
			{...data}
		>
			{labelNode}
			{control}
			{aside}
		</Field>
	)
}
