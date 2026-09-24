'use client'

import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { useState } from 'react'

import { Form } from 'shared/form/FormKit'

import type { ArrayItemScope } from '@ez-kit/form-react'

type Line = { sku: string; qty: number }
type Order = { reference: string; lines: Line[] }

const NEW_LINE: Line = { sku: '', qty: 1 }

const DEFAULTS: Order = {
	reference: 'PO-1042',
	lines: [
		{ sku: 'EZ-100', qty: 2 },
		{ sku: 'EZ-200', qty: 1 },
		{ sku: 'EZ-300', qty: 4 },
	],
}

type LineItem = ArrayItemScope<Line>

/**
 * One draggable row. `item.Item` takes no `ref` and spreads no props, so a sortable hook cannot
 * attach to it — this is why the example is built on the bare `form.Array` primitive instead of
 * `form.ArrayField`. `item.key` doubles as the sortable `id`: it is minted once and carried across
 * every add, remove and move, which is exactly the identity `useSortable` needs to track a row
 * through a drag.
 *
 * `ref` goes on the row so the whole `<tr>` is what reorders; `handleRef` goes on a dedicated
 * grip button in the leading cell so only that button is grabbable. Without it the row's only
 * visible surface is its two inputs, each with its own cursor and its own idea of what a
 * pointer-down means — the grab affordance would sit on padding the user cannot see, and dragging
 * from a text input fights text selection. A real `<button>` also keeps `role="button"` and
 * `tabindex` off the `<tr>` itself, which would otherwise sit in front of two editable fields.
 */
function Row({ item }: { item: LineItem }) {
	const { ref, handleRef, isDragging } = useSortable({ id: item.key, index: item.index })

	return (
		<tr
			ref={ref}
			data-dragging={isDragging || undefined}
			className='data-[dragging]:opacity-50 [&>td]:pt-2'
		>
			<td className='pr-2 align-bottom'>
				<button
					ref={handleRef}
					type='button'
					aria-label={`Reorder SKU ${String(item.index + 1)}`}
					data-dragging={isDragging || undefined}
					className='flex h-8 w-8 cursor-grab items-center justify-center rounded-sm text-muted-foreground hover:bg-muted data-[dragging]:cursor-grabbing'
				>
					⠿
				</button>
			</td>
			<td className='pr-2'>
				<item.TextField
					name='sku'
					label={`SKU ${String(item.index + 1)}`}
				/>
			</td>
			<td>
				<item.NumberField
					name='qty'
					label={`Qty ${String(item.index + 1)}`}
				/>
			</td>
		</tr>
	)
}

/**
 * Drag-and-drop reordering of a `form.Array`, using `@dnd-kit/react`. `move(from, to)` — the
 * scope method every reorder control in this package's examples already calls — maps one-to-one
 * onto the result of a drag: `useSortable`'s `index` reports where a row started and where it
 * landed, and `move` is handed exactly that pair. `@dnd-kit/react` optimistically reorders the DOM
 * during the drag and writes form state once, on drop, in `onDragEnd` — there is no per-frame
 * `move` call to make. The `KeyboardSensor` `DragDropProvider` includes by default means the same
 * rows are reorderable from the keyboard with no extra wiring: focus a row's drag handle, press
 * Space to pick it up, the arrow keys to move it, and Space again to drop it.
 *
 * For an explicit up control instead of a gesture, see the custom-layout example above, built on
 * `item.moveUp`.
 */
export function ArraysDndExample() {
	const [saved, setSaved] = useState<Order | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Form
				defaultValues={DEFAULTS}
				onSubmit={({ value }) => {
					setSaved(value)
				}}
			>
				{(form) => (
					<>
						<form.TextField
							name='reference'
							label='Reference'
						/>

						<form.Array
							name='lines'
							newItem={NEW_LINE}
						>
							{({ items, move }) => (
								<DragDropProvider
									onDragEnd={(event) => {
										if (event.canceled) return
										const { source } = event.operation
										if (isSortable(source) && source.initialIndex !== source.index) {
											move(source.initialIndex, source.index)
										}
									}}
								>
									<table
										role='presentation'
										className='w-full'
									>
										<tbody>
											{items.map((item) => (
												<Row
													key={item.key}
													item={item}
												/>
											))}
										</tbody>
									</table>
								</DragDropProvider>
							)}
						</form.Array>

						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>

			{saved ? (
				<pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{JSON.stringify(saved, null, 2)}</pre>
			) : null}
		</div>
	)
}
