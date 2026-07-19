import {
	Select as SelectRoot,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@form-shadcn/components/ui/select'

import type { SelectProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * Adapts the contract's flat `options` list onto shadcn's compound Radix select.
 *
 * Radix reserves the empty string: an item may not carry `value=''`, and passing it to the
 * root would be read as "no selection". So an empty form value maps to `undefined`, and the
 * placeholder is rendered by `SelectValue` rather than as an option.
 */
export function Select({
	value,
	onChange,
	options,
	placeholder,
	invalid,
	disabled,
	id,
	name,
	onBlur,
	required,
	...props
}: SelectProps): ReactNode {
	return (
		<SelectRoot
			onValueChange={onChange}
			name={name}
			// Radix reserves `''` for "no selection", and under `exactOptionalPropertyTypes` an
			// explicit `undefined` is rejected — so an empty form value omits the key entirely.
			{...(value === '' ? {} : { value })}
			// Spread rather than pass: under `exactOptionalPropertyTypes` Radix's props reject an
			// explicit `undefined`, and "not disabled" must mean the key is absent.
			{...(disabled !== undefined ? { disabled } : {})}
			{...(required !== undefined ? { required } : {})}
		>
			<SelectTrigger
				id={id}
				aria-invalid={invalid}
				onBlur={onBlur}
				className='w-full'
				{...props}
			>
				<SelectValue placeholder={placeholder} />
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
	)
}
