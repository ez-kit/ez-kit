'use client'

import { Button as ShadcnButton } from '@/components/ui/button'
import { ButtonKitProvider } from '@/shared/form/Button'

import type { ButtonProps } from '@/shared/form/Button'
import type { ReactNode } from 'react'

/** Supplies the shadcn button to every form example rendered under this route. */

function Button({ children, onClick, disabled }: ButtonProps) {
	return (
		<ShadcnButton
			type='button'
			variant='outline'
			onClick={onClick}
			disabled={disabled}
		>
			{children}
		</ShadcnButton>
	)
}

export function ShadcnButtonKitProvider({ children }: { children: ReactNode }) {
	return <ButtonKitProvider kit={{ Button }}>{children}</ButtonKitProvider>
}
