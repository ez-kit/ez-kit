'use client'

import { useState } from 'react'

import { Form } from 'shared/form/FormKit'

/**
 * A form inside a dialog — the case the uncontrolled mode exists for.
 *
 * The panel is rendered conditionally, so opening it mounts `<Form>` and closing it
 * unmounts the whole instance. Type something, close, reopen: the fields are empty again,
 * with no reset call anywhere. Had the hook been called in this component instead, the
 * values (and any validation errors) would still be there on the second open.
 */
export function DialogExample() {
	const [open, setOpen] = useState(false)
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<button
				type='button'
				onClick={() => {
					setOpen(true)
				}}
				className='self-start rounded-md bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black'
			>
				Edit profile
			</button>

			{open ? (
				<div className='rounded-lg border border-black/10 shadow-lg dark:border-white/15'>
					<Form
						defaultValues={{ name: '', title: '' }}
						onSubmit={({ value }) => {
							setSaved(value.name)
							setOpen(false)
						}}
					>
						{(form) => (
							<>
								{/* body */}
								<div className='flex flex-col gap-3 p-4'>
									<p className='text-sm font-medium'>Edit profile</p>
									<form.TextField
										name='name'
										label='Name'
										placeholder='Ada Lovelace'
									/>
									<form.TextField
										name='title'
										label='Title'
										placeholder='Mathematician'
									/>
								</div>

								{/* footer — inside the same <form>, so this is a native submit button */}
								<div className='flex justify-end gap-2 border-t border-black/10 p-3 dark:border-white/15'>
									<button
										type='button'
										onClick={() => {
											setOpen(false)
										}}
										className='rounded-md px-3 py-1.5 text-sm opacity-70'
									>
										Cancel
									</button>
									<form.SubmitButton>Save</form.SubmitButton>
								</div>
							</>
						)}
					</Form>
				</div>
			) : null}

			{saved ? <p className='text-sm opacity-70'>Saved {saved}</p> : null}
		</div>
	)
}
