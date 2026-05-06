'use client'

import { Check, X } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'

import type { CreatingActionsCellProps } from '@ez-kit/data-grid-react'

export function CreatingActionsCell({ onSave, onCancel, isPinRow }: CreatingActionsCellProps) {
	return (
		<>
			<Button
				variant='ghost'
				size='icon'
				onClick={() => void onSave()}
			>
				<Check />
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
