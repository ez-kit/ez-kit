'use client'

import { useState } from 'react'

import { Dialog } from 'shared/form/Dialog'
import { Form } from 'shared/form/FormKit'

/**
 * A form inside a dialog — the case the uncontrolled mode exists for.
 *
 * `<Form>` sits inside the dialog and wraps both its body and its footer, so the dialog's
 * own unmount-while-closed is what resets the form. Type something, close, reopen: the
 * fields are empty again, with no reset call anywhere. Had the hook been called in this
 * component instead, the values (and any validation errors) would still be there.
 *
 * `Dialog` here is the docs' kit switcher — a shadcn `Dialog` under the shadcn route, a
 * HeroUI `Modal` under the HeroUI one. In an app it is whichever dialog you already have;
 * only the arrangement matters.
 */
export function DialogExample() {
	const [open, setOpen] = useState(false)
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Dialog
				open={open}
				onOpenChange={setOpen}
			>
				<Dialog.Trigger>Edit profile</Dialog.Trigger>

				<Dialog.Content title='Edit profile'>
					<Form
						defaultValues={{ name: '', title: '' }}
						onSubmit={({ value }) => {
							setSaved(value.name)
							setOpen(false)
						}}
					>
						{(form) => (
							<>
								<Dialog.Body>
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
								</Dialog.Body>

								{/* Still inside the same <form>, so this is a native submit button. */}
								<Dialog.Footer>
									<Dialog.Close>Cancel</Dialog.Close>
									<form.SubmitButton>Save</form.SubmitButton>
								</Dialog.Footer>
							</>
						)}
					</Form>
				</Dialog.Content>
			</Dialog>

			{saved ? <p className='text-sm opacity-70'>Saved {saved}</p> : null}
		</div>
	)
}
