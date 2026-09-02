// Hand-maintained fallback for dynamic import over shared/form/examples, mirroring
// shared/data-grid/examples/registry.ts: Turbopack cannot statically analyze a context
// module built from a variable path segment when the target files are 'use client'
// components consumed from a Server Component. Keyed by manifest.sourceFile (not id) so
// several ids can share one source file.
import type { ComponentType } from 'react'

export const exampleModules: Record<string, () => Promise<Record<string, ComponentType>>> = {
	'components/async-options-schema.tsx': () => import('./components/async-options-schema'),
	'components/async-options.tsx': () => import('./components/async-options'),
	'components/basic.tsx': () => import('./components/basic'),
	'components/composition.tsx': () => import('./components/composition'),
	'components/creatable-schema.tsx': () => import('./components/creatable-schema'),
	'components/creatable.tsx': () => import('./components/creatable'),
	'components/dates-jsx.tsx': () => import('./components/dates-jsx'),
	'components/dates.tsx': () => import('./components/dates'),
	'components/dialog-schema.tsx': () => import('./components/dialog-schema'),
	'components/dialog.tsx': () => import('./components/dialog'),
	'components/fields-schema.tsx': () => import('./components/fields-schema'),
	'components/fields.tsx': () => import('./components/fields'),
	'components/multi-value-jsx.tsx': () => import('./components/multi-value-jsx'),
	'components/multi-value.tsx': () => import('./components/multi-value'),
	'components/native-api.tsx': () => import('./components/native-api'),
	'components/numeric-options-jsx.tsx': () => import('./components/numeric-options-jsx'),
	'components/numeric-options.tsx': () => import('./components/numeric-options'),
	'components/option-sources-schema.tsx': () => import('./components/option-sources-schema'),
	'components/option-sources.tsx': () => import('./components/option-sources'),
	'components/reactivity.tsx': () => import('./components/reactivity'),
	'components/schema-basic.tsx': () => import('./components/schema-basic'),
	'components/schema-conditional.tsx': () => import('./components/schema-conditional'),
	'components/schema-from-json.tsx': () => import('./components/schema-from-json'),
	'components/searchable-multiselect-schema.tsx': () => import('./components/searchable-multiselect-schema'),
	'components/searchable-multiselect.tsx': () => import('./components/searchable-multiselect'),
	'components/searchable-select-schema.tsx': () => import('./components/searchable-select-schema'),
	'components/searchable-select.tsx': () => import('./components/searchable-select'),
	'components/showcase-schema.tsx': () => import('./components/showcase-schema'),
	'components/showcase.tsx': () => import('./components/showcase'),
	'components/submit-schema.tsx': () => import('./components/submit-schema'),
	'components/submit.tsx': () => import('./components/submit'),
	'components/validation-schema.tsx': () => import('./components/validation-schema'),
	'components/validation.tsx': () => import('./components/validation'),
	'components/wizard-jsx.tsx': () => import('./components/wizard-jsx'),
	'components/wizard.tsx': () => import('./components/wizard'),
}
