'use client'

import { Button as HeroButton } from '@heroui/react'

import { ButtonKitProvider } from '@/shared/form/Button'

import type { ButtonProps } from '@/shared/form/Button'
import type { ReactNode } from 'react'

/** Supplies the HeroUI button to every form example rendered under this route. */

function Button({ children, onClick, disabled }: ButtonProps) {
	return (
		<HeroButton
			variant='secondary'
			onPress={onClick}
			{...(disabled !== undefined && { isDisabled: disabled })}
		>
			{children}
		</HeroButton>
	)
}

export function HerouiButtonKitProvider({ children }: { children: ReactNode }) {
	return <ButtonKitProvider kit={{ Button }}>{children}</ButtonKitProvider>
}
