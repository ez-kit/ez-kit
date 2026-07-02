'use client'

import { Input as HeroInput } from '@heroui/react'

import type { InputProps } from '@ez-kit/data-grid-react'
import type { ComponentProps } from 'react'

export function Input(props: InputProps) {
	return <HeroInput {...(props as unknown as ComponentProps<typeof HeroInput>)} />
}
