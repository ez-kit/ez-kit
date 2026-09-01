import {
	Select as SelectRoot,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@form-shadcn/components/ui/select'

import { FieldShell } from './field-shell'
import { OptionSkeleton } from './option-skeleton'

import type { SelectFieldRenderProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * Adapts the contract's flat `options` list onto shadcn's compound Radix select.
 *
 * Radix reserves the empty string: an item may not carry `value=''`, and passing it to the
 * root would be read as "no selection". So an empty form value maps to `undefined`, and the
 * placeholder is rendered by `SelectValue` rather than as an option.
 */
export function SelectField({
	value,
	onChange,
	options,
	loading,
	placeholder,
	id,
	name,
	onBlur,
	disabled,
	required,
	...field
}: SelectFieldRenderProps): ReactNode {
	// A list that is still arriving cannot be chosen from, and the trigger has no option to
	// draw a label from — so the field is disabled and shows a skeleton until it lands.
	const controlDisabled = loading ? true : disabled

	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<SelectRoot
					onValueChange={onChange}
					name={name}
					// `''` is passed through rather than omitted: Radix reserves it for "no selection"
					// on the *root* (only an item may not carry it), and its `shouldShowPlaceholder`
					// reads it as exactly that. Omitting the key instead would drop the select into
					// uncontrolled mode the moment the field is emptied — Radix would keep its own last
					// value, and a select cleared by an option source (see `optionsFrom`) would render a
					// blank trigger with no placeholder rather than an empty one.
					value={value}
					// Spread rather than pass: under `exactOptionalPropertyTypes` Radix's props reject an
					// explicit `undefined`, and "not disabled" must mean the key is absent.
					{...(controlDisabled !== undefined ? { disabled: controlDisabled } : {})}
					{...(required !== undefined ? { required } : {})}
				>
					<SelectTrigger
						id={id}
						data-loading={loading || undefined}
						aria-invalid={field.invalid}
						aria-busy={loading || undefined}
						onBlur={onBlur}
						className='w-full'
						{...binding}
					>
						{loading ? <OptionSkeleton className='h-4 w-24' /> : <SelectValue placeholder={placeholder} />}
					</SelectTrigger>
					<SelectContent>
						{options.map((option) => (
							<SelectItem
								key={option.value}
								value={option.value}
								{...(option.disabled !== undefined ? { disabled: option.disabled } : {})}
							>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</SelectRoot>
			)}
		</FieldShell>
	)
}
