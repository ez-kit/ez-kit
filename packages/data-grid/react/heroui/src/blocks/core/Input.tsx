'use client'

import { Input as HeroInput } from '@heroui/react'

import type { InputProps } from '@ez-kit/data-grid-react'
import type { ComponentProps } from 'react'

/**
 * The cast is `exactOptionalPropertyTypes` only: react-aria-components declares its
 * optional props without `| undefined`, so no spread of `InputHTMLAttributes` is
 * assignable to them. The two shapes agree on every prop name and value type.
 */
export function Input(props: InputProps) {
	return <HeroInput {...(props as ComponentProps<typeof HeroInput>)} />
}
