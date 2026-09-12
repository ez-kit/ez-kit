'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'
import { Check, Loader2, X } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'

export type SaveCancelButtonsProps = {
	onSave: () => Promise<void>
	onCancel: () => void
	/** True while a commit is in flight — disables Save and swaps its icon for a spinner. */
	isPending: boolean
	/** The pinned creating row has nothing to cancel back to, so it hides the cancel button. */
	showCancel?: boolean
}

/**
 * The Save / Cancel icon pair shared by the inline editing row (`ActionsCell`)
 * and the creating row (`CreatingActionsCell`) — identical in both, down to the
 * pending spinner.
 *
 * Both are icon-only, so both carry an `aria-label` from the grid's dictionary: a bare glyph
 * announces as "button" to a screen reader, which is the whole control gone.
 */
export function SaveCancelButtons({ onSave, onCancel, isPending, showCancel = true }: SaveCancelButtonsProps) {
	const messages = useGridMessages()
	return (
		<>
			<Button
				variant='ghost'
				size='icon'
				aria-label={messages.form.save}
				disabled={isPending}
				onClick={() => void onSave()}
			>
				{isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Check />}
			</Button>
			{showCancel && (
				<Button
					variant='ghost'
					size='icon'
					aria-label={messages.form.cancel}
					onClick={onCancel}
				>
					<X />
				</Button>
			)}
		</>
	)
}
