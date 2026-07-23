'use client'

import dynamic from 'next/dynamic'
import { createElement } from 'react'

import { exampleModules as dataGridModules } from '@/shared/data-grid/examples/registry'
import { DataGridTypeProvider } from '@/shared/DataGrid'
import { ExampleProduct, findExample } from '@/shared/examples-registry'
import { exampleModules as formModules } from '@/shared/form/examples/registry'

import type { ComponentType } from 'react'

type ExampleKit = 'heroui' | 'shadcn'

type ExampleRendererProps = {
	kit: ExampleKit
	slug: string
}

/** Per-product `sourceFile` → dynamic import. See each registry for why they are hand-maintained. */
const MODULE_REGISTRIES: Record<ExampleProduct, Record<string, () => Promise<Record<string, ComponentType>>>> = {
	[ExampleProduct.DataGrid]: dataGridModules,
	[ExampleProduct.Form]: formModules,
}

// The `@ez-kit/data-grid-heroui` bundle contains a dynamic `require` that Turbopack/RSC
// cannot execute during server-side rendering (`Error: dynamic usage of require is not
// supported`). SSR of example content is not required by spec, so every example — for
// both kits — renders client-only via `next/dynamic` with `ssr: false`. This keeps the
// shadcn and heroui routes on one shared, symmetric rendering path instead of shadcn
// SSRing while heroui silently falls back to client rendering.
function loadExample(slug: string) {
	const entry = findExample(slug)

	if (!entry) {
		throw new Error(`Example "${slug}" has no manifest entry`)
	}

	const loadModule = MODULE_REGISTRIES[entry.product][entry.sourceFile]

	if (!loadModule) {
		throw new Error(`Example "${slug}" has no registry entry for "${entry.sourceFile}"`)
	}

	return loadModule().then((mod) => {
		const Example = mod[entry.exportName]

		if (!Example) {
			throw new Error(`Example "${slug}" has no export "${entry.exportName}"`)
		}

		return { default: Example }
	})
}

// `next/dynamic` returns a fresh component identity on every call, so creating it in the render
// body would remount the example (losing grid state, re-flashing the loading fallback) on every
// re-render. The loaded module depends only on `slug`, so memoize the dynamic component at module
// scope — keeping its identity stable across all renders and instances for a given slug.
const exampleComponents = new Map<string, ComponentType>()

function getExampleComponent(slug: string): ComponentType {
	let component = exampleComponents.get(slug)
	if (!component) {
		component = dynamic(() => loadExample(slug), { ssr: false })
		exampleComponents.set(slug, component)
	}
	return component
}

export function ExampleRenderer({ kit, slug }: ExampleRendererProps) {
	// Render the dynamic component via `createElement` rather than a `<Example />` JSX tag:
	// `react-hooks/static-components` flags any JSX tag whose identity traces back to a call
	// (here `getExampleComponent`), even though the module-scope cache above makes it stable.
	// Passing it as a `createElement` argument is the idiomatic way to render a runtime-selected
	// component and satisfies the rule without an eslint-disable.
	const example = createElement(getExampleComponent(slug))

	// A form example takes its kit from the `FormKitProvider` the kit's `(embed)` layout
	// mounts — a hook cannot be lazy-selected at render time the way `DataGrid` is, so the
	// route supplies it instead. Only the grid needs the provider below.
	if (findExample(slug)?.product === ExampleProduct.Form) {
		return example
	}

	return <DataGridTypeProvider type={kit}>{example}</DataGridTypeProvider>
}
