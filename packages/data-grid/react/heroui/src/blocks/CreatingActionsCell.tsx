'use client'

import { Button } from '@heroui/react'
import { Check, X } from 'lucide-react'

import type { CreatingActionsCellProps } from '@ez-kit/data-grid-react'

export function CreatingActionsCell({ onSave, onCancel, isPinRow }: CreatingActionsCellProps) {
	return (
		<>
			<Button
				variant='ghost'
				isIconOnly
				onPress={() => void onSave()}
			>
				<Check size={16} />
			</Button>
			{!isPinRow && (
				<Button
					variant='ghost'
					isIconOnly
					onPress={onCancel}
				>
					<X size={16} />
				</Button>
			)}
		</>
	)
}
