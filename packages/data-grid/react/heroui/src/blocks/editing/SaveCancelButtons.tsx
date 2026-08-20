'use client'

import { Button } from '@heroui/react'
import { Check, Loader2, X } from 'lucide-react'

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
 */
export function SaveCancelButtons({ onSave, onCancel, isPending, showCancel = true }: SaveCancelButtonsProps) {
	return (
		<>
			<Button
				variant='ghost'
				size='sm'
				isIconOnly
				isDisabled={isPending}
				onPress={() => void onSave()}
			>
				{isPending ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
			</Button>
			{showCancel && (
				<Button
					variant='ghost'
					size='sm'
					isIconOnly
					onPress={onCancel}
				>
					<X className='size-4' />
				</Button>
			)}
		</>
	)
}
