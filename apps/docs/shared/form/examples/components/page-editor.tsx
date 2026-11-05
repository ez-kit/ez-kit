'use client'

import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { useState } from 'react'

import { Dialog } from 'shared/form/Dialog'
import { Form } from 'shared/form/FormKit'

import type { ArrayItemScope } from '@ez-kit/form-react'

type Rule = { field: 'country' | 'plan'; operator: 'is' | 'is not'; value: string }
type Item = { id: string; title: string; description: string }
type Page = {
	title: string
	description: string
	date: string
	enabled: boolean
	query: Rule[]
	items: Item[]
}

type ItemDialog = { item: Item; save: (item: Item) => void; creating: boolean }

const INITIAL_PAGE: Page = {
	title: 'Customer onboarding',
	description: 'A checklist for welcoming new customers.',
	date: '2026-11-05',
	enabled: true,
	query: [{ field: 'country', operator: 'is', value: 'Germany' }],
	items: [
		{ id: 'welcome', title: 'Send a welcome email', description: 'Introduce the team and share the first steps.' },
		{ id: 'setup', title: 'Schedule a kickoff', description: 'Help the customer get started.' },
	],
}
const EMPTY_ITEM: Item = { id: '', title: '', description: '' }
const buttonClass =
	'rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40'
const inputClass = 'min-w-0 rounded-md border bg-background px-2 py-1.5 text-sm'

function QueryBuilder({
	value,
	onChange,
	onBlur,
}: {
	value: Rule[]
	onChange: (value: Rule[]) => void
	onBlur: () => void
}) {
	function update(index: number, rule: Rule) {
		onChange(value.map((current, i) => (i === index ? rule : current)))
	}

	return (
		<div
			className='space-y-2'
			onBlur={onBlur}
		>
			{value.map((rule, index) => (
				<div
					key={index}
					className='flex flex-wrap gap-2'
				>
					<select
						aria-label={`Condition ${String(index + 1)} field`}
						className={inputClass}
						value={rule.field}
						onChange={(event) => {
							update(index, { ...rule, field: event.target.value as Rule['field'] })
						}}
					>
						<option value='country'>Country</option>
						<option value='plan'>Plan</option>
					</select>
					<select
						aria-label={`Condition ${String(index + 1)} operator`}
						className={inputClass}
						value={rule.operator}
						onChange={(event) => {
							update(index, { ...rule, operator: event.target.value as Rule['operator'] })
						}}
					>
						<option value='is'>is</option>
						<option value='is not'>is not</option>
					</select>
					<input
						aria-label={`Condition ${String(index + 1)} value`}
						className={inputClass}
						value={rule.value}
						onChange={(event) => {
							update(index, { ...rule, value: event.target.value })
						}}
					/>
					<button
						type='button'
						className={buttonClass}
						onClick={() => {
							onChange(value.filter((_, i) => i !== index))
						}}
					>
						Remove condition
					</button>
				</div>
			))}
			<button
				type='button'
				className={buttonClass}
				onClick={() => {
					onChange([...value, { field: 'plan', operator: 'is', value: '' }])
				}}
			>
				Add condition
			</button>
		</div>
	)
}

function SortableItem({ item, value, edit }: { item: ArrayItemScope<Item>; value: Item; edit: () => void }) {
	const { ref, handleRef, isDragging } = useSortable({ id: item.key, index: item.index })
	return (
		<div
			ref={ref}
			className='rounded-lg border bg-background'
			data-dragging={isDragging || undefined}
		>
			<div className='flex items-start gap-2 p-3'>
				<button
					ref={handleRef}
					type='button'
					aria-label={`Reorder ${value.title}`}
					className='cursor-grab rounded px-2 py-1 hover:bg-muted'
				>
					⠿
				</button>
				<details className='min-w-0 flex-1'>
					<summary className='cursor-pointer py-1 text-sm font-medium'>{value.title}</summary>
					<p className='pt-2 text-sm text-muted-foreground'>{value.description}</p>
				</details>
				<button
					type='button'
					className={buttonClass}
					onClick={edit}
				>
					Edit
				</button>
				<button
					type='button'
					className={buttonClass}
					aria-label={`Remove ${value.title}`}
					onClick={item.remove}
				>
					Remove
				</button>
			</div>
		</div>
	)
}

export function PageEditorExample() {
	const [saved, setSaved] = useState(INITIAL_PAGE)
	const [dialog, setDialog] = useState<ItemDialog | null>(null)
	const [saveCount, setSaveCount] = useState(0)

	return (
		<div className='space-y-4'>
			<Form
				defaultValues={saved}
				onSubmit={({ value, formApi }) => {
					setSaved(value)
					formApi.reset(value)
					setSaveCount((count) => count + 1)
				}}
			>
				{(form) => (
					<>
						<section className='space-y-4 rounded-xl border p-4'>
							<div>
								<h3 className='font-semibold'>Page details</h3>
								<p className='text-sm text-muted-foreground'>Describe this workflow.</p>
							</div>
							<form.TextField
								name='title'
								label='Title'
								validate={{ required: true }}
							/>
							<form.TextareaField
								name='description'
								label='Description'
								rows={2}
							/>
							<form.TextField
								name='date'
								label='Date'
								type='date'
							/>
						</section>
						<section className='space-y-4 rounded-xl border p-4'>
							<div>
								<h3 className='font-semibold'>Audience rules</h3>
								<p className='text-sm text-muted-foreground'>Choose who this workflow applies to.</p>
							</div>
							<form.CheckboxField
								name='enabled'
								label='Enable audience rules'
							/>
							<form.Subscribe selector={(state) => state.values.enabled}>
								{(enabled) =>
									enabled ? (
										<form.Field name='query'>
											{({ value, onChange, onBlur }) => (
												<QueryBuilder
													value={value}
													onChange={onChange}
													onBlur={onBlur}
												/>
											)}
										</form.Field>
									) : (
										<p className='text-sm text-muted-foreground'>
											Rules are disabled; your conditions are kept in the draft.
										</p>
									)
								}
							</form.Subscribe>
						</section>
						<form.Array
							name='items'
							newItem={EMPTY_ITEM}
						>
							{({ items, insert, move }) => (
								<section className='space-y-3 rounded-xl border p-4'>
									<header className='flex flex-wrap items-center justify-between gap-2'>
										<div>
											<h3 className='font-semibold'>Steps</h3>
											<p className='text-sm text-muted-foreground'>Drag the handle to reorder.</p>
										</div>
										<button
											type='button'
											className={buttonClass}
											onClick={() => {
												setDialog({
													item: EMPTY_ITEM,
													creating: true,
													save: (value) => {
														insert(items.length, { ...value, id: crypto.randomUUID() })
													},
												})
											}}
										>
											Add step
										</button>
									</header>
									<DragDropProvider
										onDragEnd={(event) => {
											if (event.canceled) return
											const { source } = event.operation
											if (isSortable(source) && source.initialIndex !== source.index)
												move(source.initialIndex, source.index)
										}}
									>
										<div className='space-y-2'>
											{items.map((item) => {
												const value = form.getFieldValue('items')[item.index]
												if (!value) return null
												return (
													<SortableItem
														key={item.key}
														item={item}
														value={value}
														edit={() => {
															setDialog({
																item: value,
																creating: false,
																save: (updated) => {
																	form.setFieldValue(`items[${String(item.index)}]` as `items[${number}]`, updated)
																},
															})
														}}
													/>
												)
											})}
										</div>
									</DragDropProvider>
								</section>
							)}
						</form.Array>
						<form.Subscribe selector={(state) => state.isDefaultValue}>
							{(isDefaultValue) => (
								<div className='flex flex-wrap items-center gap-3'>
									<form.SubmitButton disabled={isDefaultValue}>Save changes</form.SubmitButton>
									<button
										type='button'
										className={buttonClass}
										disabled={isDefaultValue}
										onClick={() => {
											form.reset()
										}}
									>
										Discard changes
									</button>
									<span
										className='text-sm text-muted-foreground'
										aria-live='polite'
									>
										{isDefaultValue ? 'No unsaved changes' : 'Unsaved changes'}
									</span>
								</div>
							)}
						</form.Subscribe>
					</>
				)}
			</Form>
			{saveCount > 0 && (
				<p
					className='text-sm text-muted-foreground'
					role='status'
				>
					Saved locally for this demo.
				</p>
			)}
			<Dialog
				open={dialog !== null}
				onOpenChange={(open) => {
					if (!open) setDialog(null)
				}}
			>
				<Dialog.Content title={dialog?.creating ? 'Add step' : 'Edit step'}>
					{dialog && (
						<Form
							defaultValues={{ stepTitle: dialog.item.title, stepDescription: dialog.item.description }}
							onSubmit={({ value }) => {
								dialog.save({ ...dialog.item, title: value.stepTitle, description: value.stepDescription })
								setDialog(null)
							}}
						>
							{(form) => (
								<>
									<Dialog.Body>
										<form.TextField
											name='stepTitle'
											label='Step title'
											validate={{ required: true }}
										/>
										<form.TextareaField
											name='stepDescription'
											label='Step description'
											rows={3}
										/>
									</Dialog.Body>
									<Dialog.Footer>
										<Dialog.Close>Cancel</Dialog.Close>
										<form.SubmitButton>{dialog.creating ? 'Add step' : 'Apply changes'}</form.SubmitButton>
									</Dialog.Footer>
								</>
							)}
						</Form>
					)}
				</Dialog.Content>
			</Dialog>
		</div>
	)
}
