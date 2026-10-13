'use client'

import { Form, SchemaForm, useForm, withFieldGroup, withForm } from '@ez-kit/form-heroui'

import { FormKitProvider } from '@/shared/form/FormKit'

import type { FormKit } from '@/shared/form/FormKit'
import type { ReactNode } from 'react'

/** Module-level, so a provider re-render hands the same kit and the cached blocks never remount. */
const FORM_KIT: FormKit = { useForm, Form, SchemaForm, withForm, withFieldGroup }

/**
 * Supplies the HeroUI form bundle to every form example rendered under this route.
 *
 * It lives beside the kit's layout — rather than inside a shared switcher — so the HeroUI
 * embed bundle never pulls in the shadcn kit, and vice versa.
 */
export function HerouiFormKitProvider({ children }: { children: ReactNode }) {
	return <FormKitProvider kit={FORM_KIT}>{children}</FormKitProvider>
}
