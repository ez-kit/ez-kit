'use client'

import { Form } from 'shared/form/FormKit'

type Order = {
	quantity: number
	unitPrice: number
	notes: string
}

const DEFAULT_ORDER: Order = { quantity: 1, unitPrice: 12.5, notes: '' }

const NOTES_LIMIT = 120

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

/**
 * Reading form state without re-rendering the form.
 *
 * `form.Subscribe` takes a `selector` and re-renders **only its own children**, only when
 * the selected value changes. That is the whole point: a component that read
 * `form.state.values` directly would re-render on every keystroke in every field, and it
 * would not even be correct — `form.state` is a snapshot, so nothing would tell React to
 * render again when it moves on.
 *
 * Keep a selector returning something comparable — a primitive, or a small object rebuilt
 * from primitives. A selector returning `state.values` wholesale subscribes to everything
 * and gives back exactly the re-render you were avoiding.
 *
 * **Do not wrap a field in `Subscribe`.** Every flat field is already its own subscriber:
 * `form.TextField` renders through `form.AppField`, which subscribes to that one field's
 * value and meta. Wrapping one adds a second subscription over a wider slice of state and
 * makes the field re-render for edits elsewhere in the form. The one legitimate reason to
 * wrap a field is that a *prop* of it depends on another field — `disabled`, or the
 * `optionsParams` of a dependent select — which is what the option-sources example does.
 *
 * The same subscription is also available as a hook, `useStore(form.store, selector)`, for
 * when the value is needed in the component body rather than in the JSX — but it subscribes
 * the **whole component**, so inside a form it costs precisely what `Subscribe` exists to
 * avoid. It is worth reaching for one level up, in a component that renders no fields of its
 * own. It comes from `@tanstack/react-store`, which the kits do not re-export; the examples
 * here use `Subscribe` throughout.
 */
export function ReactivityExample() {
	return (
		<Form defaultValues={DEFAULT_ORDER}>
			{(form) => (
				<>
					<form.NumberField
						name='quantity'
						label='Quantity'
						min={1}
					/>
					<form.NumberField
						name='unitPrice'
						label='Unit price'
						step={0.5}
					/>

					{/* Two values in, one derived number out. The children re-render when the
					    total changes — editing `notes` does not touch them. */}
					<form.Subscribe selector={(state) => state.values.quantity * state.values.unitPrice}>
						{(total) => <p className='text-sm font-medium'>Total {currency.format(total)}</p>}
					</form.Subscribe>

					<form.TextareaField
						name='notes'
						label='Notes'
						rows={3}
					/>

					{/* A selector narrow enough that the counter re-renders on a keystroke in
					    `notes` and on nothing else. */}
					<form.Subscribe selector={(state) => state.values.notes.length}>
						{(used) => (
							<p className={used > NOTES_LIMIT ? 'text-sm text-red-600 dark:text-red-400' : 'text-sm opacity-70'}>
								{used} / {NOTES_LIMIT} characters
							</p>
						)}
					</form.Subscribe>

					<form.SubmitButton>Place order</form.SubmitButton>
				</>
			)}
		</Form>
	)
}
