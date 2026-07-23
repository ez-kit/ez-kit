'use client'

import { useForm } from '@ez-kit/form-heroui'

import { FormKitProvider } from '@/shared/form/FormKit'

import type { ReactNode } from 'react'

/**
 * Supplies the HeroUI `useForm` to every form example rendered under this route.
 *
 * It lives beside the kit's layout — rather than inside a shared switcher — so the HeroUI
 * embed bundle never pulls in the shadcn kit, and vice versa.
 */
export function HerouiFormKitProvider({ children }: { children: ReactNode }) {
	return <FormKitProvider useForm={useForm}>{children}</FormKitProvider>
}
