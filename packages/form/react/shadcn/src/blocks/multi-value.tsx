import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@form-shadcn/components/ui/button'
import { Checkbox } from '@form-shadcn/components/ui/checkbox'
import { FieldSet } from '@form-shadcn/components/ui/field'
import { Label } from '@form-shadcn/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@form-shadcn/components/ui/popover'

import { FieldShell } from './field-shell'
import { OptionListSkeleton, OptionSkeleton } from './option-skeleton'

import type { CheckboxGroupFieldRenderProps, MultiSelectFieldRenderProps, SelectOption } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The multi-value fields of the shadcn kit.
 *
 * Radix's select is single-selection only, so the multi-select is a `Popover` holding a list
 * of checkboxes — the same composition this repo's data-grid kit already uses for its faceted
 * filter, and the reason no extra primitive library is pulled in for it. The checkbox group
 * needs no popover at all: it is a `<fieldset>` of the vendored `Checkbox`.
 */

/** Joins the field id and an option value into the per-option id a `<label for>` targets. */
const OPTION_ID_SEPARATOR = '-'

/** How many selected labels the trigger spells out before it switches to a count. */
const MAX_LISTED_LABELS = 2

/** The trigger's text: the chosen labels, a count once there are too many, or the placeholder. */
function summarise(
	options: readonly SelectOption[],
	value: readonly string[],
	placeholder: string | undefined,
): string {
	if (value.length === 0) return placeholder ?? 'Select…'

	const labels = value.map((entry) => options.find((option) => option.value === entry)?.label ?? entry)
	return labels.length > MAX_LISTED_LABELS ? `${String(labels.length)} selected` : labels.join(', ')
}

/** Adds or removes one option value, always returning a new list. */
function toggle(value: readonly string[], option: string): string[] {
	return value.includes(option) ? value.filter((entry) => entry !== option) : [...value, option]
}

export function MultiSelectField({
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
}: MultiSelectFieldRenderProps): ReactNode {
	const [open, setOpen] = useState(false)

	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<>
					{/* The selection lives in the popover, so a plain form submit would not see it. */}
					{value.map((entry) => (
						<input
							key={entry}
							type='hidden'
							name={name}
							value={entry}
						/>
					))}
					<Popover
						open={open}
						onOpenChange={setOpen}
					>
						<PopoverTrigger asChild>
							<Button
								id={id}
								type='button'
								variant='outline'
								// While the list is arriving there is nothing to open the popover onto, and a
								// selected value has no option to be labelled by — so: disabled, plus a skeleton.
								disabled={disabled === true || loading}
								data-loading={loading || undefined}
								aria-invalid={field.invalid}
								aria-required={required}
								aria-busy={loading || undefined}
								onBlur={onBlur}
								className='w-full justify-between font-normal'
								{...binding}
							>
								{loading ? (
									<OptionSkeleton className='h-4 w-24' />
								) : (
									<span className={value.length === 0 ? 'text-muted-foreground' : undefined}>
										{summarise(options, value, placeholder)}
									</span>
								)}
								<ChevronDownIcon className='opacity-50' />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className='w-(--radix-popover-trigger-width) p-1'
							align='start'
						>
							<div
								role='group'
								aria-label={typeof field.label === 'string' ? field.label : undefined}
								className='max-h-56 overflow-auto'
							>
								{options.map((option) => (
									<label
										key={option.value}
										className='flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent'
									>
										<Checkbox
											checked={value.includes(option.value)}
											disabled={option.disabled}
											onCheckedChange={() => {
												onChange(toggle(value, option.value))
											}}
										/>
										<span className='flex-1 truncate'>{option.label}</span>
									</label>
								))}
							</div>
						</PopoverContent>
					</Popover>
				</>
			)}
		</FieldShell>
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
	disabled,
	required,
	...field
}: CheckboxGroupFieldRenderProps): ReactNode {
	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				// A real `<fieldset>`: the group's own label is the shell's, and each option keeps
				// its own `<label for>` — which is what makes every box clickable by its text.
				<FieldSet
					id={id}
					data-loading={loading || undefined}
					aria-invalid={field.invalid}
					aria-required={required}
					aria-busy={loading || undefined}
					className='gap-2'
					{...binding}
				>
					{/*
					 * An expanded group has no trigger to put one skeleton in, so the loading state is
					 * a short list of placeholder rows — the shape the real options will take.
					 */}
					{loading && <OptionListSkeleton />}
					{options.map((option) => {
						const optionId = `${id}${OPTION_ID_SEPARATOR}${option.value}`

						return (
							<div
								key={option.value}
								className='flex items-center gap-2'
							>
								<Checkbox
									id={optionId}
									name={name}
									value={option.value}
									disabled={disabled === true || loading || option.disabled === true}
									checked={value.includes(option.value)}
									onBlur={onBlur}
									onCheckedChange={() => {
										onChange(toggle(value, option.value))
									}}
								/>
								<Label htmlFor={optionId}>{option.label}</Label>
							</div>
						)
					})}
				</FieldSet>
			)}
		</FieldShell>
	)
}
