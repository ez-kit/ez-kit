'use client'

import { Button as HeroButton } from '@heroui/react'

import type { ButtonProps } from '@ez-kit/data-grid-react'
import type { ComponentProps } from 'react'

export function Button({ disabled, type, onClick, children, ...props }: ButtonProps) {
	const heroProps = props as unknown as ComponentProps<typeof HeroButton>

	return (
		<HeroButton
			{...heroProps}
			type={type ?? 'button'}
			{...(disabled === undefined ? {} : { isDisabled: disabled })}
			onPress={(e) => {
				onClick?.(e as unknown as Parameters<NonNullable<ButtonProps['onClick']>>[0])
			}}
		>
			{children}
		</HeroButton>
	)
}
