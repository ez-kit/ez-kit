import { Checkbox, CheckboxGroup, ListBox, Select as HeroSelect } from '@heroui/react'

import { FieldDescription, FieldErrorText, FieldLabel } from './field-chrome'
import { fieldRoot } from './field-state'
import { OptionListSkeleton, OptionSkeleton } from './option-skeleton'
import { SearchableMultiSelectField } from './searchable-multi-select'

import type { CheckboxGroupFieldRenderProps, MultiSelectFieldRenderProps } from '@ez-kit/form-react'
import type { Key } from '@heroui/react'
import type { ReactNode } from 'react'

/**
 * The multi-value fields of the HeroUI kit.
 *
 * The multi-select is the *same* `Select` the single-value field uses, switched to
 * `selectionMode='multiple'` — React Aria models that as a mode rather than a second
 * component, and this repo's data-grid kit already does the same for its faceted filter. The
 * checkbox group is HeroUI's real `CheckboxGroup`, whose value is already a `string[]`.
 */

/** React Aria reports a selection as one key, a list of keys, or `null` for "nothing". */
function toValues(keys: Key | Key[] | null): string[] {
	if (keys === null) return []
	return (Array.isArray(keys) ? keys : [keys]).map(String)
}

export function MultiSelectField(props: MultiSelectFieldRenderProps): ReactNode {
	// `search` present *is* the mode switch — see `MultiSelectFieldRenderProps`. The two are
	// different React Aria widgets (`Select` vs `ComboBox`) with different anatomy, so they
	// are separate components rather than one with branches inside it.
	if (props.search !== undefined) {
		return (
			<SearchableMultiSelectField
				{...props}
				search={props.search}
			/>
		)
	}

	return <PlainMultiSelectField {...props} />
}

function PlainMultiSelectField({
	value,
	onChange,
	options,
	loading,
	search: _search,
	placeholder,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: MultiSelectFieldRenderProps): ReactNode {
	return (
		<HeroSelect
			selectionMode='multiple'
			// The contract's value is readonly; React Aria wants a plain array it can hold on to.
			value={[...value]}
			onChange={(next) => {
				onChange(toValues(next))
			}}
			name={name}
			{...(placeholder !== undefined ? { placeholder } : {})}
			// See `select.tsx` — same reasoning, same treatment.
			{...fieldRoot(loading ? { ...field, disabled: true } : field)}
		>
			<FieldLabel label={label} />
			<HeroSelect.Trigger
				id={id}
				data-loading={loading || undefined}
				onBlur={onBlur}
			>
				{loading ? <OptionSkeleton /> : <HeroSelect.Value />}
				<HeroSelect.Indicator />
			</HeroSelect.Trigger>
			<HeroSelect.Popover>
				<ListBox>
					{options.map((option) => (
						<ListBox.Item
							key={option.value}
							id={option.value}
							textValue={option.label}
							{...(option.disabled !== undefined ? { isDisabled: option.disabled } : {})}
						>
							{option.label}
							<ListBox.ItemIndicator />
						</ListBox.Item>
					))}
				</ListBox>
			</HeroSelect.Popover>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroSelect>
	)
}

export function CheckboxGroupField({
	value,
	onChange,
	options,
	loading,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: CheckboxGroupFieldRenderProps): ReactNode {
	return (
		<CheckboxGroup
			id={id}
			name={name}
			value={[...value]}
			onChange={onChange}
			onBlur={onBlur}
			data-loading={loading || undefined}
			{...fieldRoot(loading ? { ...field, disabled: true } : field)}
		>
			<FieldLabel label={label} />
			<FieldDescription description={description} />
			{/*
			 * An expanded group has no trigger to put one skeleton in, so the loading state is a
			 * short list of placeholder rows — the shape the real options will take.
			 */}
			{loading && <OptionListSkeleton />}
			{options.map((option) => (
				<Checkbox
					key={option.value}
					value={option.value}
					{...(option.disabled !== undefined ? { isDisabled: option.disabled } : {})}
				>
					{/*
					 * Control first, then `Checkbox.Content` — the anatomy this kit's single
					 * `CheckboxField` already uses, and the one its CSS is written against.
					 * HeroUI's CheckboxGroup docs nest the control *inside* Content instead,
					 * which renders the box above the text at the wrong type scale here.
					 */}
					<Checkbox.Control>
						<Checkbox.Indicator />
					</Checkbox.Control>
					<Checkbox.Content>
						<FieldLabel label={option.label} />
					</Checkbox.Content>
				</Checkbox>
			))}
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</CheckboxGroup>
	)
}
