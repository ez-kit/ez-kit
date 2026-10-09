import { Button, Description, ErrorMessage, Fieldset } from '@heroui/react'

import type { ArrayFieldRenderProps, ArrayItemRenderProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The repeatable-group pair of the HeroUI v3 kit: `ArrayField` draws the list, `ArrayItem`
 * draws one entry of it.
 *
 * `Fieldset` is HeroUI's own grouping primitive and maps onto the contract one-for-one —
 * `Fieldset.Legend` takes the list's label, `Description` its description, `Fieldset.Group`
 * the entries and `Fieldset.Actions` the add control. It also renders a real `<fieldset>`,
 * which is what makes `disabled` mean something: the native attribute disables every control
 * inside the list, entry fields included, rather than only greying the add button.
 *
 * The list's errors use `ErrorMessage`, not `FieldError`. HeroUI documents the split
 * explicitly — `FieldError` belongs to a form field and reads its React Aria validation
 * state, while `ErrorMessage` is the low-level display for a non-field container. An array
 * is the latter: its `minLength` failure belongs to the list, and the entries' own fields
 * each render their own `FieldError` through `field-chrome.tsx`.
 *
 * Nothing here passes a `data-slot` to a HeroUI primitive: the library stamps its own
 * (`fieldset`, `fieldset-legend`, …) *before* spreading props, so ours would win and detach
 * the element from `@heroui/styles`. The hand-written elements inside an entry do carry one,
 * exactly as `layout.tsx`'s do.
 */

/** Glyphs for the reorder controls; each one's caption carries the accessible name beside it. */
const MOVE_UP_GLYPH = '↑'
const MOVE_DOWN_GLYPH = '↓'

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
	'data-field': dataField,
	'data-field-type': dataFieldType,
}: ArrayFieldRenderProps): ReactNode {
	return (
		<Fieldset
			data-field={dataField}
			data-field-type={dataFieldType}
			className='flex flex-col gap-4'
			// React rejects neither, but "not disabled" has to mean the attribute is absent —
			// `disabled={undefined}` and `data-invalid={false}` both read as a stale `false` in a
			// CSS selector, and the contract's `undefined` means "the author said nothing".
			{...(disabled === true ? { disabled: true } : {})}
			{...(invalid ? { 'data-invalid': '' } : {})}
			{...(required === true ? { 'data-required': '' } : {})}
		>
			{label != null && (
				<Fieldset.Legend className='text-foreground text-base font-medium'>
					{label}
					{required === true && (
						<span
							aria-hidden='true'
							className='text-danger ms-1'
						>
							*
						</span>
					)}
				</Fieldset.Legend>
			)}
			{description != null && <Description>{description}</Description>}
			<Fieldset.Group className='flex flex-col gap-3'>{children}</Fieldset.Group>
			{invalid && <ErrorMessage>{errors.join(', ')}</ErrorMessage>}
			<Fieldset.Actions>
				<Button
					variant='secondary'
					size='sm'
					onPress={onAdd}
					// Disabled rather than absent: a `maxLength` bound should not make the control
					// vanish from under the user's cursor. See `canAdd` in the contract.
					{...(canAdd ? {} : { isDisabled: true })}
				>
					{addLabel}
				</Button>
			</Fieldset.Actions>
		</Fieldset>
	)
}

export function ArrayItem({
	label,
	removeLabel,
	moveUpLabel,
	moveDownLabel,
	disabled,
	onRemove,
	onMoveUp,
	onMoveDown,
	children,
	// `index` is not destructured: the contract carries it twice, and `data-index` is the
	// spelling that reaches the DOM for CSS and tests to address.
	'data-index': dataIndex,
}: ArrayItemRenderProps): ReactNode {
	// Both absent means reordering is off for this list, so the controls are not drawn at all.
	// One absent means the move is merely impossible *here* — the first entry cannot move up —
	// and the control stays, disabled, so the row's shape does not change down the list.
	const reorderable = onMoveUp !== undefined || onMoveDown !== undefined

	return (
		<div
			data-index={dataIndex}
			data-slot='form-array-item'
			className='border-border bg-surface flex flex-col gap-3 rounded-lg border p-4'
		>
			{label != null && (
				<h4
					data-slot='form-array-item-label'
					className='text-foreground text-sm font-medium'
				>
					{label}
				</h4>
			)}
			<div
				data-slot='form-array-item-fields'
				className='flex flex-col gap-4'
			>
				{children}
			</div>
			<div
				data-slot='form-array-item-actions'
				className='flex items-center gap-2'
			>
				{reorderable && (
					<>
						<MoveButton
							label={moveUpLabel}
							glyph={MOVE_UP_GLYPH}
							disabled={disabled}
							onMove={onMoveUp}
						/>
						<MoveButton
							label={moveDownLabel}
							glyph={MOVE_DOWN_GLYPH}
							disabled={disabled}
							onMove={onMoveDown}
						/>
					</>
				)}
				<Button
					variant='danger-soft'
					size='sm'
					className='ms-auto'
					onPress={onRemove}
					{...(disabled === true ? { isDisabled: true } : {})}
				>
					{removeLabel}
				</Button>
			</div>
		</div>
	)
}

type MoveButtonProps = {
	/** Already resolved by the adapter, and present even when the move is impossible. */
	label: ReactNode
	glyph: string
	/** The whole list is disabled. */
	disabled: boolean | undefined
	/** `undefined` when this move is impossible from this position. */
	onMove: (() => void) | undefined
}

/**
 * One reorder control: an arrow, plus its caption carried off-screen.
 *
 * The caption is content rather than an `aria-label` because the contract types it as a
 * `ReactNode` — a translated caption may be an element, and only a string can be an attribute.
 * Naming the button by its own text also survives a caption the adapter renders as markup,
 * which an `aria-label` would silently drop.
 */
function MoveButton({ label, glyph, disabled, onMove }: MoveButtonProps): ReactNode {
	return (
		<Button
			isIconOnly
			variant='tertiary'
			size='sm'
			// Disabled by the list, or by this entry already sitting at that end of it. `onPress`
			// still goes on when it exists: React Aria will not fire it while disabled, and
			// spreading both keeps the two conditions independent instead of nesting them.
			{...(disabled === true || onMove === undefined ? { isDisabled: true } : {})}
			{...(onMove !== undefined ? { onPress: onMove } : {})}
		>
			<span aria-hidden='true'>{glyph}</span>
			<span className='sr-only'>{label}</span>
		</Button>
	)
}
