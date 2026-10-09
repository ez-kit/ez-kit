import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { Button as ButtonPrimitive } from '@form-shadcn/components/ui/button'
import { FieldDescription, FieldError, FieldLegend, FieldSet } from '@form-shadcn/components/ui/field'

import type { ArrayFieldRenderProps, ArrayItemRenderProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The repeatable group of the shadcn kit: `ArrayField` draws the list, `ArrayItem` draws one
 * entry of it.
 *
 * Two adapters rather than one for the reason the contract gives — only the entry can place its
 * own remove control, because only it knows where its row ends. Both are `blocks/` adapters over
 * the vendored, immutable `components/ui/**` primitives (`FieldSet` for the list's chrome,
 * `Button` for every control), same as every other adapter in this package.
 *
 * The errors `ArrayField` renders are the **list's own** — a `minLength`, or a cross-item rule
 * that blamed the list. An entry's field errors reach that field through its own slot and are
 * drawn by {@link FieldShell}, which is why this file never has to merge the two.
 */

/** The `data-slot` values this file publishes; the vendored primitives' own are overridden. */
const ARRAY_SLOT = 'form-array'
const ARRAY_ITEMS_SLOT = 'form-array-items'
const ARRAY_ERROR_SLOT = 'form-array-error'
const ARRAY_ADD_SLOT = 'form-array-add'
const ITEM_SLOT = 'form-array-item'
const ITEM_LABEL_SLOT = 'form-array-item-label'
const ITEM_FIELDS_SLOT = 'form-array-item-fields'
const ITEM_ACTIONS_SLOT = 'form-array-item-actions'
const ITEM_REMOVE_SLOT = 'form-array-item-remove'
const ITEM_MOVE_UP_SLOT = 'form-array-item-move-up'
const ITEM_MOVE_DOWN_SLOT = 'form-array-item-move-down'

/** Joins the list's own validation messages into the single line the error row renders. */
const ERROR_SEPARATOR = ', '

/**
 * Fallback captions.
 *
 * Every caption arrives resolved from the adapter, so these are not the normal path. They cover
 * the two cases the contract allows and a button cannot survive: an `addLabel` the author never
 * gave, and a caption that resolved to an element rather than a string — the three icon-only
 * controls put theirs in `aria-label`, which takes text and nothing else.
 */
const ADD_FALLBACK_LABEL = 'Add'
const REMOVE_FALLBACK_LABEL = 'Remove'
const MOVE_UP_FALLBACK_LABEL = 'Move up'
const MOVE_DOWN_FALLBACK_LABEL = 'Move down'

/** The accessible name for an icon-only control, which is text or nothing. */
function ariaLabel(caption: ReactNode, fallback: string): string {
	return typeof caption === 'string' ? caption : fallback
}

export function ArrayField({
	label,
	description,
	errors,
	invalid,
	disabled,
	required,
	children,
	addLabel,
	onAdd,
	canAdd,
	...data
}: ArrayFieldRenderProps): ReactNode {
	return (
		<FieldSet
			data-slot={ARRAY_SLOT}
			data-invalid={invalid || undefined}
			aria-required={required}
			{...data}
		>
			{label != null && <FieldLegend>{label}</FieldLegend>}
			{description != null && <FieldDescription>{description}</FieldDescription>}

			<div
				data-slot={ARRAY_ITEMS_SLOT}
				className='flex flex-col gap-3'
			>
				{children}
			</div>

			{invalid && <FieldError data-slot={ARRAY_ERROR_SLOT}>{errors.join(ERROR_SEPARATOR)}</FieldError>}

			<div>
				<ButtonPrimitive
					data-slot={ARRAY_ADD_SLOT}
					type='button'
					variant='outline'
					size='sm'
					// `canAdd` is a boolean rather than an absent `onAdd` precisely so the control can
					// stay put and read as unavailable instead of vanishing under the cursor.
					disabled={disabled === true || !canAdd}
					onClick={onAdd}
				>
					<PlusIcon />
					{addLabel ?? ADD_FALLBACK_LABEL}
				</ButtonPrimitive>
			</div>
		</FieldSet>
	)
}

/**
 * The reorder pair, or nothing at all.
 *
 * `onMoveUp` / `onMoveDown` are `undefined` both when reordering is off and when *that* move is
 * impossible, which the contract folds into one question on purpose. The two cases are still
 * distinguishable from the pair: neither handler means the feature is off, so the controls are
 * not drawn; one handler means the entry sits at an end of the list, so both are drawn and the
 * impossible one is disabled — a row whose controls came and went as it moved would be far worse
 * than one whose control greys out.
 */
function ReorderControls({
	onMoveUp,
	onMoveDown,
	moveUpLabel,
	moveDownLabel,
	disabled,
}: Pick<ArrayItemRenderProps, 'onMoveUp' | 'onMoveDown' | 'moveUpLabel' | 'moveDownLabel' | 'disabled'>): ReactNode {
	if (onMoveUp === undefined && onMoveDown === undefined) return null

	return (
		<>
			<ButtonPrimitive
				data-slot={ITEM_MOVE_UP_SLOT}
				type='button'
				variant='ghost'
				size='icon-sm'
				aria-label={ariaLabel(moveUpLabel, MOVE_UP_FALLBACK_LABEL)}
				disabled={disabled === true || onMoveUp === undefined}
				onClick={onMoveUp}
			>
				<ChevronUpIcon />
			</ButtonPrimitive>
			<ButtonPrimitive
				data-slot={ITEM_MOVE_DOWN_SLOT}
				type='button'
				variant='ghost'
				size='icon-sm'
				aria-label={ariaLabel(moveDownLabel, MOVE_DOWN_FALLBACK_LABEL)}
				disabled={disabled === true || onMoveDown === undefined}
				onClick={onMoveDown}
			>
				<ChevronDownIcon />
			</ButtonPrimitive>
		</>
	)
}

export function ArrayItem({
	// The row's position reaches the DOM through `data-index`, which rides in `...data`; the
	// number itself is never drawn, so this kit reads it only as a duplicate of that attribute.
	index: _index,
	label,
	removeLabel,
	moveUpLabel,
	moveDownLabel,
	disabled,
	onRemove,
	onMoveUp,
	onMoveDown,
	children,
	...data
}: ArrayItemRenderProps): ReactNode {
	const heading = label != null && (
		<div
			data-slot={ITEM_LABEL_SLOT}
			className='text-sm leading-none font-medium'
		>
			{label}
		</div>
	)

	return (
		<div
			data-slot={ITEM_SLOT}
			className='flex flex-col gap-3 rounded-lg border border-border bg-card p-4'
			{...data}
		>
			<div
				data-slot={ITEM_ACTIONS_SLOT}
				className='flex items-center justify-between gap-2'
			>
				{heading}
				<div className='ml-auto flex items-center gap-1'>
					<ReorderControls
						onMoveUp={onMoveUp}
						onMoveDown={onMoveDown}
						moveUpLabel={moveUpLabel}
						moveDownLabel={moveDownLabel}
						disabled={disabled}
					/>
					<ButtonPrimitive
						data-slot={ITEM_REMOVE_SLOT}
						type='button'
						variant='ghost'
						size='icon-sm'
						aria-label={ariaLabel(removeLabel, REMOVE_FALLBACK_LABEL)}
						disabled={disabled}
						onClick={onRemove}
					>
						<Trash2Icon />
					</ButtonPrimitive>
				</div>
			</div>

			<div
				data-slot={ITEM_FIELDS_SLOT}
				className='grid gap-4'
			>
				{children}
			</div>
		</div>
	)
}
