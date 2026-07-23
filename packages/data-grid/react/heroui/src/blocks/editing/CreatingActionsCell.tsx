'use client'

import { Button } from '@heroui/react'
import { Check, Loader2, X } from 'lucide-react'

import type { CreatingActionsCellProps } from '@ez-kit/data-grid-react'

export function CreatingActionsCell({ onSave, onCancel, isPinRow, isPending }: CreatingActionsCellProps) {
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
			{!isPinRow && (
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
