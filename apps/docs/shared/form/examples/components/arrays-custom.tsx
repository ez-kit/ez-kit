'use client'

import { useState } from 'react'

import { Form } from 'shared/form/FormKit'

type Line = { sku: string; qty: number }
type Order = { reference: string; lines: Line[] }

const NEW_LINE: Line = { sku: '', qty: 1 }

const DEFAULTS: Order = {
	reference: 'PO-1042',
	lines: [{ sku: 'EZ-100', qty: 2 }],
}

/**
 * The same data as `form-arrays`, composed by hand.
 *
 * `form.Array` renders nothing at all, so the add control can sit in the section heading — a
 * placement `form.ArrayField`'s own frame never offers, since it draws its own add control and
 * gives up no say over where it goes. The row being a `<table>` row rather than a card is a
 * different kind of freedom: `item.Item` is available here too, this example just chose not to
 * use it. Note `errors` is rendered here explicitly: nothing renders it for a bare `form.Array`,
 * and a `minLength` failure would otherwise block submit silently.
 */
export function ArraysCustomExample() {
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
							validate={{ minLength: 1, maxLength: 5 }}
						>
							{({ items, add, insert, canAdd, errors, invalid, Button }) => (
								<section className='flex flex-col gap-2'>
									<header className='flex items-center justify-between'>
										<h3 className='text-sm font-medium'>Lines</h3>
										<Button
											onClick={() => {
												add()
											}}
											disabled={!canAdd}
										>
											Add line
										</Button>
									</header>

									{/*
									 * `role='presentation'` because this table lays out the row's fields rather than
									 * presenting tabular data — no `<th>` header names a column of data, so none is
									 * claimed. Each cell stays a cell: the actions column wraps its buttons in an
									 * inner `<div>` instead of putting `flex` on the `<td>` itself, which would take
									 * the cell out of table layout. That cell is `align-bottom` because the field
									 * cells beside it are a label stacked over a control: a middle-aligned button
									 * centres against the pair and so floats above the inputs it acts on. The gaps
									 * are cell padding rather than `border-spacing`, which would also inset the
									 * table's outer edges and pull the rows out of line with the field above.
									 */}
									<table
										role='presentation'
										className='w-full'
									>
										<tbody>
											{items.map((item) => (
												<tr
													key={item.key}
													className='[&>td]:pt-2'
												>
													<td className='pr-2'>
														<item.TextField
															name='sku'
															label={`SKU ${String(item.index + 1)}`}
														/>
													</td>
													<td className='pr-2'>
														<item.NumberField
															name='qty'
															label={`Qty ${String(item.index + 1)}`}
														/>
													</td>
													<td className='align-bottom'>
														<div className='flex gap-1'>
															<Button
																onClick={() => {
																	insert(item.index + 1, { ...NEW_LINE })
																}}
															>
																{`Duplicate ${String(item.index + 1)}`}
															</Button>
															<Button onClick={item.remove}>{`Remove ${String(item.index + 1)}`}</Button>
															<Button
																onClick={item.moveUp}
																disabled={item.isFirst}
															>
																{`Up ${String(item.index + 1)}`}
															</Button>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>

									{invalid && <p role='alert'>{errors.join(', ')}</p>}
								</section>
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
