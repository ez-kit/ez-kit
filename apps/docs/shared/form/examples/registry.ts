// Hand-maintained fallback for dynamic import over shared/form/examples, mirroring
// shared/data-grid/examples/registry.ts: Turbopack cannot statically analyze a context
// module built from a variable path segment when the target files are 'use client'
// components consumed from a Server Component. Keyed by manifest.sourceFile (not id) so
// several ids can share one source file.
import type { ComponentType } from 'react'

export const exampleModules: Record<string, () => Promise<Record<string, ComponentType>>> = {
	'components/async-options.tsx': () => import('./components/async-options'),
	'components/basic.tsx': () => import('./components/basic'),
	'components/dialog.tsx': () => import('./components/dialog'),
	'components/dates.tsx': () => import('./components/dates'),
	'components/fields.tsx': () => import('./components/fields'),
	'components/multi-value.tsx': () => import('./components/multi-value'),
	'components/native-api.tsx': () => import('./components/native-api'),
	'components/numeric-options.tsx': () => import('./components/numeric-options'),
	'components/option-sources.tsx': () => import('./components/option-sources'),
	'components/schema-basic.tsx': () => import('./components/schema-basic'),
	'components/schema-conditional.tsx': () => import('./components/schema-conditional'),
	'components/schema-from-json.tsx': () => import('./components/schema-from-json'),
	'components/searchable-multiselect.tsx': () => import('./components/searchable-multiselect'),
	'components/searchable-select.tsx': () => import('./components/searchable-select'),
	'components/validation.tsx': () => import('./components/validation'),
}
