'use client'

import { useEffect, useState } from 'react'

import { FormRenderer, FormSchemaError, parseFormSchema } from 'shared/form/FormKit'

import type { AnyFormSchema } from 'shared/form/FormKit'

type Contact = {
	firstName: string
	lastName: string
	email: string
	plan: string
	vat: string
}

/**
 * Exactly what `GET /api/forms/contact` returns — a JSON string, no TypeScript involved.
 *
 * It is the same document `defineFormSchema<Contact>()({ … })` would produce in your own
 * bundle: `FormFieldType.Text` *is* `'text'`, a condition is a plain object, and nothing in
 * the format is a function. Authoring in TS and delivering over the wire are the same data
 * in two spellings — the TS spelling only adds compile-time checking of `name` against
 * `Contact`.
 */
const RESPONSE_BODY = `{
	"version": 1,
	"children": [
		{
			"type": "section",
			"title": "Contact",
			"columns": 2,
			"children": [
				{ "type": "text", "name": "firstName", "label": "First name", "defaultValue": "", "validate": { "required": true } },
				{ "type": "text", "name": "lastName", "label": "Last name", "defaultValue": "" },
				{
					"type": "text",
					"name": "email",
					"label": "Email",
					"inputType": "email",
					"colSpan": 2,
					"defaultValue": "",
					"validate": { "required": true, "format": "email" }
				},
				{
					"type": "select",
					"name": "plan",
					"label": "Plan",
					"colSpan": 2,
					"defaultValue": "free",
					"options": [
						{ "value": "free", "label": { "key": "plan.free" } },
						{ "value": "pro", "label": { "key": "plan.pro" } }
					]
				},
				{
					"type": "text",
					"name": "vat",
					"label": "VAT number",
					"colSpan": 2,
					"defaultValue": "",
					"when": { "field": "plan", "eq": "pro" }
				}
			]
		},
		{ "type": "submit", "label": "Save" }
	]
}`

/**
 * The app's own copy. An option's `label` is `LocalizedText` like every other label in the
 * format, so the document above ships keys rather than English — which is the only way one
 * stored form can serve more than one language.
 */
const COPY: Record<string, string> = {
	'plan.free': 'Free',
	'plan.pro': 'Pro',
}

/** Stands in for `await fetch('/api/forms/contact').then((res) => res.json())`. */
async function fetchSchemaDocument(): Promise<unknown> {
	await new Promise((resolve) => setTimeout(resolve, 300))

	return JSON.parse(RESPONSE_BODY)
}

export function SchemaFromJsonExample() {
	const [schema, setSchema] = useState<AnyFormSchema<Contact> | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [saved, setSaved] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false

		void fetchSchemaDocument()
			.then((document) => {
				// The trust boundary: a document from the network is validated **once**, here,
				// where it can be logged and fallen back from — not on every render, and never
				// inside `FormRenderer`. Passing the registries' keys is what makes the parser
				// check the document against *this* app's capabilities.
				// `hasTranslate` is part of the same check: a document may only name a
				// translation key when the renderer will actually be given a `translate`.
				const parsed = parseFormSchema<Contact>(document, {
					fieldTypes: [],
					blocks: [],
					rules: [],
					hasTranslate: true,
				})

				if (!cancelled) {
					setSchema(parsed)
				}
			})
			.catch((cause: unknown) => {
				if (cancelled) {
					return
				}
				// A `FormSchemaError` names the offending node's path — its `message` already
				// ends in `(at children[0].children[2])`, and `error.path` carries it alone.
				setError(cause instanceof FormSchemaError ? cause.message : 'Could not load the form')
			})

		return () => {
			cancelled = true
		}
	}, [])

	if (error !== null) {
		return <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
	}

	if (schema === null) {
		return <p className='text-sm opacity-60'>Loading the form…</p>
	}

	return (
		<div className='flex flex-col gap-4'>
			<FormRenderer
				schema={schema}
				translate={(key) => COPY[key] ?? key}
				onSubmit={({ value }) => {
					setSaved(JSON.stringify(value, null, 2))
				}}
			/>

			{saved === null ? null : <pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{saved}</pre>}
		</div>
	)
}
