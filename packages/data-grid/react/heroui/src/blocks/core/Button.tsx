'use client'

import { Button as HeroButton } from '@heroui/react'

import type { ButtonProps } from '@ez-kit/data-grid-react'
import type { ComponentProps } from 'react'

/**
 * `onClick` is forwarded as-is: react-aria accepts it as an official alias of `onPress`
 * and hands the handler a real `MouseEvent`, so the contract's DOM handler gets the
 * event it is typed for. The cast is `exactOptionalPropertyTypes` only — react-aria
 * declares its optional props without `| undefined`.
 */
export function Button({ disabled, type, children, ...props }: ButtonProps) {
	return (
		<HeroButton
			{...(props as ComponentProps<typeof HeroButton>)}
			type={type ?? 'button'}
			{...(disabled === undefined ? {} : { isDisabled: disabled })}
		>
			{children}
		</HeroButton>
	)
}
