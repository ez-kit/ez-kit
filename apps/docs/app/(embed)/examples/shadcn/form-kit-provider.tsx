'use client'

import { Form, useForm } from '@ez-kit/form-shadcn'

import { FormKitProvider } from '@/shared/form/FormKit'

import type { ReactNode } from 'react'

/**
 * Supplies the shadcn form bundle to every form example rendered under this route.
 *
 * It lives beside the kit's layout — rather than inside a shared switcher — so the shadcn
 * embed bundle never pulls in the HeroUI kit, and vice versa.
 */
export function ShadcnFormKitProvider({ children }: { children: ReactNode }) {
	return <FormKitProvider kit={{ useForm, Form }}>{children}</FormKitProvider>
}
