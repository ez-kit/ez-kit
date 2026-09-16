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
 * `form.Array` renders nothing at all, so the add control can sit in the section heading and the
 * row can be a table row — neither is reachable through `form.ArrayField`, which owns its frame
 * and draws its own add control. Note `errors` is rendered here explicitly: nothing renders it
 * for a bare `form.Array`, and a `minLength` failure would otherwise block submit silently.
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
									 * the cell out of table layout.
									 */}
									<table
										role='presentation'
										className='w-full'
									>
										<tbody>
											{items.map((item) => (
												<tr key={item.key}>
													<td>
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
													<td>
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
