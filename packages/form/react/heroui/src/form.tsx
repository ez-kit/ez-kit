'use client'

import { createForm, createSchemaForm } from '@ez-kit/form-react'

import { FormElement } from './blocks/form-parts'
import { allFormComponents, allFormFields } from './sets'

import type { FormBundle, SchemaFormBundle } from '@ez-kit/form-react'
import type { ComponentType } from 'react'

/**
 * The prebuilt bundle's types, named through `@ez-kit/form-react` so the kit's declarations do
 * too: an inferred type would be spelled out in `dist/index.d.ts` in terms of TanStack Form and
 * `@ez-kit/form-core`, which this kit does not depend on and so cannot resolve.
 */
type KitFormBundle = FormBundle<typeof allFormFields, typeof allFormComponents>
type KitSchemaFormBundle = SchemaFormBundle<typeof allFormFields, typeof allFormComponents>

/**
 * Both calls are pure with flat, spread-free arguments, and nothing at the top level reads a
 * property of either: every export delegates inside a function body. So a consumer that imports
 * only `TextField` from the kit root keeps neither bundle, and one that imports `Form` keeps the
 * form bundle and not the schema renderer. A property read here (`export const Form = kit.Form`)
 * would anchor the bundle and every component it registers — the defect this module replaced.
 */
const kit: KitFormBundle = /* @__PURE__ */ createForm({
	FormElement,
	fields: allFormFields,
	components: allFormComponents,
})
const schemaKit: KitSchemaFormBundle = /* @__PURE__ */ createSchemaForm({
	FormElement,
	fields: allFormFields,
	components: allFormComponents,
})

export const useForm: KitFormBundle['useForm'] = (options) => kit.useForm(options)
export const withForm: KitFormBundle['withForm'] = (options) => kit.withForm(options)
export const withFieldGroup: KitFormBundle['withFieldGroup'] = (options) => kit.withFieldGroup(options)

// The two components are overloaded (controlled and uncontrolled), which no arrow can be
// contextually typed by — so each one delegates through a plain props bag and is asserted back
// to the bundle's own type.
export const Form = ((props: object) => {
	const Impl = kit.Form as ComponentType<object>

	return <Impl {...props} />
}) as unknown as KitFormBundle['Form']

export const SchemaForm = ((props: object) => {
	const Impl = schemaKit.SchemaForm as ComponentType<object>

	return <Impl {...props} />
}) as unknown as KitSchemaFormBundle['SchemaForm']
