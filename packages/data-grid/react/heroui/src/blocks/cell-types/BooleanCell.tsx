'use client'

import { Description, FieldError, Label, ListBox, Select, Switch } from '@heroui/react'

import type { CellViewProps, FieldState } from '@ez-kit/data-grid-react'

const ALL_SENTINEL = '__all__'
const TRUE_KEY = 'true'
const FALSE_KEY = 'false'

function BooleanCellView({ value }: CellViewProps) {
	return <>{value ? '✓' : '✗'}</>
}

/**
 * Boolean cell input on HeroUI v3. HeroUI `<Switch>` has no native FieldError
 * slot, so we render it as a sibling. `<Label>` / `<Description>` live inside
 * `<Switch.Content>`; both are conditional.
 */
function BooleanCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	const hasContent = label !== undefined || description !== undefined
	return (
		<div data-error={hasError || undefined}>
			<Switch
				id={id}
				isSelected={Boolean(value)}
				onChange={(checked) => {
					onChange(checked)
				}}
				onBlur={onBlur}
			>
				<Switch.Control>
					<Switch.Thumb />
				</Switch.Control>
				{hasContent && (
					<Switch.Content>
						{label !== undefined && <Label>{label}</Label>}
						{description !== undefined && <Description>{description}</Description>}
					</Switch.Content>
				)}
			</Switch>
			{hasError && <FieldError>{errors[0]}</FieldError>}
		</div>
	)
}

/**
 * Tri-state filter for boolean columns. `All` clears the filter (undefined),
 * the other options apply a strict boolean predicate.
 */
function BooleanFilterInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	const selectedKey = value === true ? TRUE_KEY : value === false ? FALSE_KEY : ALL_SENTINEL
	return (
		<Select
			value={selectedKey}
			isInvalid={hasError}
			aria-label={label ?? 'Filter'}
			onChange={(key) => {
				if (key == null || Array.isArray(key)) return
				const k = String(key)
				if (k === TRUE_KEY) onChange(true)
				else if (k === FALSE_KEY) onChange(false)
				else onChange(undefined)
			}}
			onBlur={onBlur}
		>
			{label !== undefined && <Label htmlFor={id}>{label}</Label>}
			<Select.Trigger id={id}>
				<Select.Value />
			</Select.Trigger>
			<Select.Popover>
				<ListBox>
					<ListBox.Item
						id={ALL_SENTINEL}
						textValue='All'
					>
						All
					</ListBox.Item>
					<ListBox.Item
						id={TRUE_KEY}
						textValue='Yes'
					>
						Yes
					</ListBox.Item>
					<ListBox.Item
						id={FALSE_KEY}
						textValue='No'
					>
						No
					</ListBox.Item>
				</ListBox>
			</Select.Popover>
			{description !== undefined && <Description>{description}</Description>}
			{hasError && <FieldError>{errors[0]}</FieldError>}
		</Select>
	)
}

export { BooleanCellInput, BooleanCellView, BooleanFilterInput }
