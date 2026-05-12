'use client'

import { Check, Loader2, X } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'

import type { CreatingActionsCellProps } from '@ez-kit/data-grid-react'

export function CreatingActionsCell({ onSave, onCancel, isPinRow, isPending }: CreatingActionsCellProps) {
	return (
		<>
			<Button
				variant='ghost'
				size='icon'
				disabled={isPending}
				onClick={() => void onSave()}
			>
				{isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Check />}
			</Button>
			{!isPinRow && (
				<Button
					variant='ghost'
					size='icon'
					onClick={onCancel}
				>
					<X />
				</Button>
			)}
		</>
	)
}
