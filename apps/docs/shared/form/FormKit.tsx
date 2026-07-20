'use client'

import { createContext, useContext } from 'react'

import type { useForm as useShadcnForm } from '@ez-kit/form-shadcn'
import type { ReactNode } from 'react'

/**
 * The docs-only runtime switcher for the form kits — the `shared/DataGrid.tsx` analogue.
 *
 * The grid switches a *component*, so it can `React.lazy` the two kits and pick at render
 * time. A form kit's entry point is a **hook**, which cannot be lazy-loaded, so the chosen
 * kit's `useForm` travels through context instead. The value is supplied once per embed
 * route — the kit is fixed for the lifetime of an iframe — so its identity is stable and
 * calling it below is a well-formed hook call.
 *
 * Examples import `useForm` from here; the source panel rewrites that specifier to the real
 * kit package (see `rewrite-example-imports.ts`), because a reader copying the example
 * installs `@ez-kit/form-shadcn` or `@ez-kit/form-heroui`, not this file.
 */
// Re-exported so an example imports everything from this one specifier: the source panel
// rewrites it to the kit package, and both kits re-export these from `@ez-kit/form-react`.
export { TextInputType } from '@ez-kit/form-react'
export type { SelectOption } from '@ez-kit/form-react'

export type UseFormHook = typeof useShadcnForm

const FormKitContext = createContext<UseFormHook | null>(null)

export function FormKitProvider({ useForm: hook, children }: { useForm: UseFormHook; children: ReactNode }) {
	return <FormKitContext.Provider value={hook}>{children}</FormKitContext.Provider>
}

export const useForm: UseFormHook = (options) => {
	const hook = useContext(FormKitContext)

	if (hook === null) {
		throw new Error('useForm: no form kit in context. Render the example inside a <FormKitProvider />.')
	}

	return hook(options)
}
