'use client'

import { DataGridVisibilityItem } from '@ez-kit/data-grid-react'
import { useColumnDragKeyboardGuard, useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Button, buttonVariants, Checkbox, Dropdown, Label, Popover } from '@heroui/react'
import { ArrowDown, ArrowUp, Columns2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { GridList, GridListItem } from 'react-aria-components'

import { KIT_CLASS_NAME } from '../../lib/kit-class-name'
import { ColumnGrip } from '../ordering/ColumnDragHandle'

import type { GridMessages, VisibilityMenuProps, VisibilityColumnItem } from '@ez-kit/data-grid-react'
import type { Selection } from '@heroui/react'

/**
 * The panel's trigger content — icon and label, and **not** a `<Button>`.
 *
 * `Popover.Trigger` renders its own `div[role="button"]` around whatever it is given (it wraps
 * the child in react-aria's `Pressable`), so a `<Button>` inside it is a button inside a button:
 * axe reports `nested-interactive`, serious, on every grid that mounts this control. HeroUI's own
 * "interactive content" example puts plain markup in the trigger for exactly this reason.
 *
 * The button's looks come from `buttonVariants`, which is HeroUI's documented way to put a
 * component's styles on an element that is not that component — so this stays the kit's own
 * button styling rather than a hand-rolled copy of it, and follows the recipe when it changes.
 *
 * The trigger also carries `inline-flex`. `Popover.Trigger` adds its own `popover__trigger`, whose
 * `display: inline-block` sits in the same layer and at the same specificity as `.button`'s
 * `inline-flex` and comes later in HeroUI's stylesheet, so it wins and the icon stacks above the
 * label. A utility is in a later layer than both, which is what puts the button's layout back.
 */
function TriggerContent({ label }: { label: string }) {
	return (
		<>
			<Columns2 size={16} />
			{label}
		</>
	)
}

/**
 * The same trigger as a real `<Button>`, for the `Dropdown` form below.
 *
 * `Dropdown` follows react-aria's menu-trigger pattern and takes the button itself rather than
 * wrapping it, so here the `<Button>` is right — the nesting above is a `Popover.Trigger`
 * property, not a rule about triggers.
 */
function Trigger({ label }: { label: string }) {
	return (
		<Button
			data-slot='column-visibility-trigger'
			size='sm'
			variant='outline'
		>
			<TriggerContent label={label} />
		</Button>
	)
}

/**
 * The column panel: a grid collection rather than a selection menu.
 *
 * A react-aria menu item owns the press that lands on it, and a menu item may hold no control of
 * its own — which is exactly what makes the selection form below right for a plain visibility
 * toggle, and wrong the moment a row also carries a grip or a move pair. A `GridList` is the one
 * react-aria collection whose rows may: each row is focusable, the controls inside it are reachable
 * and announced, and the row's selection is the column's visibility, exactly as the menu's is.
 *
 * Every row is the collection's own element. `<DataGridVisibilityItem>`'s render function hands it
 * the item slot, the column id and the drag's ref to spread, so no wrapper sits around a row — a
 * wrapper could not, since the collection renders the row itself — and the grip gets its activator
 * as `handleProps`. A column whose visibility the author fixed (`canHide: false`) stays listed with
 * its checkbox disabled: `disabledBehavior='selection'` takes it out of the selection without taking
 * it out of focus, the drag or the move pair.
 *
 * `disallowEmptySelection` is what keeps `Escape` closing the panel. A collection with multiple
 * selection clears it on `Escape` by default, and the selection here is the columns' visibility, so
 * one `Escape` meant for the popover hid every column while the panel stayed open. With an empty
 * selection disallowed the key is not the collection's and reaches the popover. The cost is that the
 * last visible column cannot be hidden from here, which leaves no grid worth showing anyway.
 *
 * That alone does not close the panel, though, and the panel closes itself on `Escape` for it. A
 * react-aria grid row stops `Escape` whatever the collection makes of it — its shortcut handler lets
 * a key go on only when the action asks for that explicitly, and the selection's `Escape` action
 * does not — so the popover's own dismissal never sees the key while focus is in a row. Hence the
 * controlled popover and an `Escape` listener on the collection.
 *
 * The dialog is named after the trigger that opens it and the collection after what it controls, so
 * entering the panel does not read one name twice.
 *
 * The collection carries `useColumnDragKeyboardGuard`. During a keyboard drag the same keys mean two
 * things here — the collection moves focus on an arrow and toggles a row on `Space` — so without it
 * one `ArrowDown` moved the row two places, and the `Space` that drops it could hide a column.
 *
 * Keyboard, as measured in a browser: the collection is one tab stop, the arrows walk its rows and
 * `ArrowRight` steps into a row's controls, the grip first. While a row is being dragged, focus
 * leaves the grip — the collection recovers it onto another row when the moving row is re-rendered
 * — and the drop returns it to the grip of the row that moved. The guard is what makes the
 * stray focus harmless: no key reaches the row it landed on until the drag is over.
 *
 * The arrows point up and down: the contract names the two moves logically (`start` / `end`,
 * because the column order flips under RTL) and leaves the glyph to the kit, and this list runs
 * top to bottom in either writing direction.
 */
function ColumnPanel({ columns, messages }: { columns: VisibilityColumnItem[]; messages: GridMessages }) {
	const [isOpen, setIsOpen] = useState(false)
	const guardRef = useColumnDragKeyboardGuard()
	/*
	 * One ref for the collection: the guard's, plus a native `Escape` listener that closes the panel.
	 * Native because a key aimed inside the collection reaches it before React dispatches the row's
	 * handlers, which stop the key. During a drag the same key also cancels the drag — the guard lets
	 * `Escape` through, and the drag library reads it on the document, after this.
	 */
	const collectionRef = useCallback(
		(node: HTMLDivElement | null) => {
			guardRef(node)
			if (node === null) return undefined
			const onKeyDown = (event: KeyboardEvent) => {
				if (event.key === ESCAPE_KEY) setIsOpen(false)
			}
			node.addEventListener('keydown', onKeyDown)
			return () => {
				node.removeEventListener('keydown', onKeyDown)
				guardRef(null)
			}
		},
		[guardRef],
	)
	const selectedKeys = new Set(columns.filter((col) => col.isVisible).map((col) => col.id))
	const disabledKeys = columns.filter((col) => !col.canHide).map((col) => col.id)

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setIsOpen}
		>
			<Popover.Trigger
				data-slot='column-visibility-trigger'
				className={`${buttonVariants({ size: 'sm', variant: 'outline' })} inline-flex`}
			>
				<TriggerContent label={messages.visibility.trigger} />
			</Popover.Trigger>
			<Popover.Content className={KIT_CLASS_NAME}>
				<Popover.Dialog
					aria-label={messages.visibility.trigger}
					className='p-2'
				>
					<GridList
						ref={collectionRef}
						aria-label={messages.visibility.menu}
						className='grid min-w-60 gap-1 outline-hidden'
						disabledBehavior='selection'
						disallowEmptySelection
						disabledKeys={disabledKeys}
						items={columns}
						selectedKeys={selectedKeys}
						selectionMode='multiple'
						onSelectionChange={(keys) => {
							toggleChanged(columns, keys)
						}}
					>
						{(col: VisibilityColumnItem) => (
							<DataGridVisibilityItem columnId={col.id}>
								{({ itemProps, handleProps }) => (
									<GridListItem
										{...itemProps}
										id={col.id}
										className='flex items-center gap-1 rounded pe-1 outline-hidden'
										textValue={col.label}
									>
										{/*
										 * Absent unless this row is draggable — no adapter, the panel's moves
										 * switched off, or a column whose place the author fixed. First in the row,
										 * where a grip belongs, and before the label so a pointer looking for it
										 * does not have to cross the checkbox.
										 *
										 * The name carries the column, which the header's handle does not need:
										 * there each grip sits in its own `<th>` beside the column name, while here
										 * a screen reader would otherwise read N identical "Drag column" buttons in
										 * one list. Same shape the move pair below already uses.
										 */}
										{handleProps && (
											<ColumnGrip
												aria-label={`${messages.ordering.dragColumn}: ${col.label}`}
												handleRef={handleProps.ref}
											/>
										)}
										{/*
										 * The row's selection checkbox: react-aria wires `slot='selection'` to the
										 * row's selected state, so this is the visibility toggle without a handler of
										 * its own. The label is a plain span inside `Checkbox.Content`, which is
										 * already the `<label>`; nesting a `Label` there would be invalid markup.
										 */}
										<Checkbox
											className='min-w-0 flex-1 px-2 py-1.5'
											slot='selection'
										>
											<Checkbox.Content>
												<Checkbox.Control>
													<Checkbox.Indicator />
												</Checkbox.Control>
												<span className='truncate'>{col.label}</span>
											</Checkbox.Content>
										</Checkbox>
										<MoveControls
											column={col}
											labels={{ start: messages.visibility.moveStart, end: messages.visibility.moveEnd }}
										/>
									</GridListItem>
								)}
							</DataGridVisibilityItem>
						)}
					</GridList>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}

/** The key that dismisses the panel. */
const ESCAPE_KEY = 'Escape'

/**
 * react-aria reports the whole next selection rather than the item that was pressed, so toggle
 * exactly the columns whose visibility flipped. `'all'` means every key is selected.
 */
function toggleChanged(columns: VisibilityColumnItem[], keys: Selection): void {
	for (const col of columns) {
		const willBeVisible = keys === 'all' || keys.has(col.id)
		if (willBeVisible !== col.isVisible) col.onToggle()
	}
}

/**
 * The move pair, drawn as arrows along the list rather than along the table — the same component
 * the shadcn kit draws, for the same reasons, and gated the same way.
 *
 * **Absent, not disabled, when the item carries no `ordering`.** It used to render unconditionally
 * with `col.ordering?.canMoveStart !== true` standing in for both "this column is at the end" and
 * "this panel has no moves", which was indistinguishable while a panel always had them. A
 * drag-only panel has none, and two permanently dead buttons beside every grip is not what
 * "the drag instead of the arrows" means.
 */
function MoveControls({ column, labels }: { column: VisibilityColumnItem; labels: { start: string; end: string } }) {
	const ordering = column.ordering
	if (!ordering) return null
	return (
		<>
			<Button
				aria-label={`${labels.start}: ${column.label}`}
				data-slot='column-visibility-move-start'
				isDisabled={!ordering.canMoveStart}
				isIconOnly
				size='sm'
				variant='ghost'
				onPress={ordering.onMoveStart}
			>
				<ArrowUp className='size-4' />
			</Button>
			<Button
				aria-label={`${labels.end}: ${column.label}`}
				data-slot='column-visibility-move-end'
				isDisabled={!ordering.canMoveEnd}
				isIconOnly
				size='sm'
				variant='ghost'
				onPress={ordering.onMoveEnd}
			>
				<ArrowDown className='size-4' />
			</Button>
		</>
	)
}

export function VisibilityMenu({ columns, isColumnPanel }: VisibilityMenuProps) {
	const messages = useGridMessages()
	/*
	 * Branched on the panel, not on `col.ordering`. The two are different questions once the
	 * panel's affordances are independent: a draggable panel carries no move pair, and reading
	 * the shape off the pair sent it back down the list-box path below — which renders no
	 * `<DataGridVisibilityItem>`, so the drag disappeared with the arrows.
	 */
	if (isColumnPanel) {
		return (
			<ColumnPanel
				columns={columns}
				messages={messages}
			/>
		)
	}

	const selectedKeys = new Set(columns.filter((col) => col.isVisible).map((col) => col.id))

	return (
		<Dropdown>
			<Trigger label={messages.visibility.trigger} />
			<Dropdown.Popover
				className={KIT_CLASS_NAME}
				placement='bottom end'
			>
				<Dropdown.Menu
					aria-label={messages.visibility.menu}
					items={columns}
					selectedKeys={selectedKeys}
					selectionMode='multiple'
					onSelectionChange={(keys) => {
						toggleChanged(columns, keys)
					}}
				>
					{(col: VisibilityColumnItem) => (
						<Dropdown.Item
							id={col.id}
							textValue={col.label}
						>
							<Label>{col.label}</Label>
							<Dropdown.ItemIndicator />
						</Dropdown.Item>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
