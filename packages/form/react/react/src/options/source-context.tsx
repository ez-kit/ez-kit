'use client'

import { createContext, useContext } from 'react'

import type { OptionSourceRegistry } from './source-types'
import type { Translate } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

const NO_SOURCES: OptionSourceRegistry = {}

const OptionSourceContext = createContext<OptionSourceRegistry>(NO_SOURCES)

/**
 * Registers the app's option sources for every form beneath it.
 *
 * **A provider, unlike `fields` / `blocks` / `rules`, which are props on `FormRenderer`.**
 * Those three are schema-only concepts — nothing outside a document can refer to a block
 * component or a named rule — so they belong to the one component that renders a document.
 * An option source is not: `<form.SelectField optionsFrom='cities' />` is plain TSX with no
 * schema anywhere in sight, and it needs the same registry. One mechanism serves both paths;
 * there is deliberately **no** `optionSources` prop on `FormRenderer` to drift from it.
 *
 * Mount it once, near the provider that owns the data layer the sources query:
 *
 * ```tsx
 * <QueryClientProvider client={client}>
 *   <FormOptionSources value={optionSources}>
 *     <App />
 *   </FormOptionSources>
 * </QueryClientProvider>
 * ```
 *
 * `value` must be **stable across renders** — hoist it to a module constant or memoise it.
 * Each entry is a hook (see {@link OptionSource}), so a fresh object every render would swap
 * hook identities underneath React.
 */
export function FormOptionSources({
	value,
	children,
}: {
	value: OptionSourceRegistry
	children: ReactNode
}): ReactNode {
	return <OptionSourceContext value={value}>{children}</OptionSourceContext>
}

/** The registered sources, or an empty registry when no provider is mounted. */
export function useOptionSourceRegistry(): OptionSourceRegistry {
	return useContext(OptionSourceContext)
}

const SchemaTranslateContext = createContext<Translate | undefined>(undefined)

/**
 * Internal: carries `FormRenderer`'s `translate` down to the option-source plumbing.
 *
 * A source may return `LocalizedSelectOption`s with translation keys (spec-wise it is the
 * same list a document could have written inline), and the resolution happens inside the
 * field component — which receives only the field's own props and so has no other way to
 * reach the renderer's translator. Not exported: the JSX API has no `translate` at all, and
 * there a source's labels are plain strings.
 */
export function SchemaTranslate({
	translate,
	children,
}: {
	translate: Translate | undefined
	children: ReactNode
}): ReactNode {
	return <SchemaTranslateContext value={translate}>{children}</SchemaTranslateContext>
}

export function useSchemaTranslate(): Translate | undefined {
	return useContext(SchemaTranslateContext)
}
