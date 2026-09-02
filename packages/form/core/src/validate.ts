import { resolveText } from './localized-text'
import { getValueAtPath } from './rules'
import { visibleFieldNames } from './visibility'
import { isFieldNode, walkNodes } from './walk'

import type { LocalizedText, Translate } from './localized-text'
import type { AnyFormSchema, FieldValidate } from './schema'
import type { StandardSchemaV1 } from '@tanstack/form-core'

export type { FieldValidate } from './schema'

/**
 * A validation rule an app registers under a name (e.g. `'ru-inn'`) so a schema can reference
 * it via `validate.rule` without the schema itself carrying executable code — required for a
 * schema that may arrive as BDUI JSON (spec I2/I3). Returns `true` when the value passes, or
 * the failure message to show otherwise.
 */
export type NamedRule = (value: unknown, values: unknown) => true | string

type BuildValidatorOptions = {
	rules?: Record<string, NamedRule>
	translate?: Translate
}

/** The constraint kinds `validate.messages` can override. */
export type FieldConstraintKey = 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'format' | 'rule'

/**
 * One small, anchored regex per format — nothing user-supplied. There is deliberately no
 * `pattern` constraint in `FieldValidate`: a regular expression arriving from an untrusted
 * document is a ReDoS hazard, and a hung tab is worse than a missing client-side check.
 */
const FORMAT_PATTERNS: Record<NonNullable<FieldValidate['format']>, RegExp> = {
	email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	url: /^https?:\/\/[^\s]+$/,
	tel: /^\+?[0-9()\-.\s]{7,20}$/,
}

/**
 * `undefined`, `null`, `''`, `false` (a checkbox-style boolean field) and `[]` all count as
 * empty. The empty array matters: a multi-select always *holds* a list, so without this a
 * `required` multi-select would be satisfied by having selected nothing.
 */
function isEmpty(value: unknown): boolean {
	if (Array.isArray(value)) return value.length === 0
	return value === undefined || value === null || value === '' || value === false
}

/** The length `minLength` / `maxLength` measure: characters of a string, entries of a list. */
function lengthOf(value: unknown): number | undefined {
	if (typeof value === 'string') return value.length
	return Array.isArray(value) ? value.length : undefined
}

/**
 * A bound only ever compares against a value of its own type: a numeric bound ignores a
 * string value and vice versa, so a `min` meant for a date can never accidentally reject a
 * number (or a half-typed string) somewhere else in the document. String comparison is the
 * point for dates — `'2026-02-03' < '2026-08-31'` holds because ISO dates sort as text.
 */
function isBelow(value: unknown, bound: number | string): boolean {
	if (typeof bound === 'number') return typeof value === 'number' && value < bound
	return typeof value === 'string' && value.length > 0 && value < bound
}

function isAbove(value: unknown, bound: number | string): boolean {
	if (typeof bound === 'number') return typeof value === 'number' && value > bound
	return typeof value === 'string' && value.length > 0 && value > bound
}

/** "characters" for a string, "items" for a list — the same constraint, read the right way. */
function minLengthMessage(value: unknown, bound: number): string {
	const unit = Array.isArray(value) ? 'items' : 'characters'
	return `Must be at least ${String(bound)} ${unit}`
}

function maxLengthMessage(value: unknown, bound: number): string {
	const unit = Array.isArray(value) ? 'items' : 'characters'
	return `Must be at most ${String(bound)} ${unit}`
}

function resolveMessage(
	key: FieldConstraintKey,
	config: FieldValidate,
	translate: Translate | undefined,
	fallback: string,
): string {
	const override: LocalizedText | undefined = config.messages?.[key]
	if (override === undefined) return fallback
	// Past the guard `override` is a required `LocalizedText`, so `resolveText`'s
	// non-optional overload applies and there is nothing left to fall back from.
	return resolveText(override, translate)
}

/** Looks up `config.rule` in the registered rules, throwing at build time if it is unknown. */
function resolveNamedRule(config: FieldValidate, rules: Record<string, NamedRule> | undefined): NamedRule | undefined {
	if (config.rule === undefined) return undefined
	const rule = rules?.[config.rule]
	if (rule === undefined) {
		throw new Error(
			`FormSchema references validation rule "${config.rule}" but it was not registered in \`buildValidator\`'s \`rules\` option.`,
		)
	}
	return rule
}

/**
 * Runs a single field's constraints, in a fixed order, stopping at the first failure — a field
 * with several violated constraints reports only the most relevant one rather than piling up
 * redundant messages for the user.
 */
function runConstraints(
	value: unknown,
	values: unknown,
	config: FieldValidate,
	rule: NamedRule | undefined,
	translate: Translate | undefined,
): string | undefined {
	if (config.required === true && isEmpty(value)) {
		return resolveMessage('required', config, translate, 'This field is required')
	}
	// An optional, empty value has nothing left to check.
	if (isEmpty(value)) return undefined

	if (config.min !== undefined && isBelow(value, config.min)) {
		return resolveMessage('min', config, translate, `Must be at least ${String(config.min)}`)
	}
	if (config.max !== undefined && isAbove(value, config.max)) {
		return resolveMessage('max', config, translate, `Must be at most ${String(config.max)}`)
	}
	const length = lengthOf(value)
	if (config.minLength !== undefined && length !== undefined && length < config.minLength) {
		return resolveMessage('minLength', config, translate, minLengthMessage(value, config.minLength))
	}
	if (config.maxLength !== undefined && length !== undefined && length > config.maxLength) {
		return resolveMessage('maxLength', config, translate, maxLengthMessage(value, config.maxLength))
	}
	if (config.format !== undefined && typeof value === 'string' && !FORMAT_PATTERNS[config.format].test(value)) {
		return resolveMessage('format', config, translate, `Must be a valid ${config.format}`)
	}
	if (rule !== undefined) {
		const result = rule(value, values)
		if (result !== true) return resolveMessage('rule', config, translate, result)
	}

	return undefined
}

/** What {@link runFieldValidate} needs beyond the value: the same two `buildValidator` takes. */
export type RunFieldValidateOptions = BuildValidatorOptions

/**
 * Run one field's `validate` block against one value — the per-field entry point into the
 * very engine `buildValidator` compiles a whole schema into.
 *
 * It exists so the JSX API can offer the identical `FieldValidate` vocabulary a schema
 * document uses without a second implementation of it: `<form.TextField validate={…} />`
 * attaches this to that field's `onChange`, while a schema attaches `buildValidator`'s
 * output to the form's. Same constraints, same order, same messages, one code path.
 *
 * `values` is the whole form's data, and is only read by a named `rule` — pass the form
 * state when one may be in play, and anything (`{}`) when none can be.
 *
 * @returns the first failing constraint's message, or `undefined` when the value passes.
 */
export function runFieldValidate(
	value: unknown,
	values: unknown,
	config: FieldValidate,
	options: RunFieldValidateOptions = {},
): string | undefined {
	return runConstraints(value, values, config, resolveNamedRule(config, options.rules), options.translate)
}

type FieldCheck = {
	name: string
	run: (value: unknown, values: unknown) => string | undefined
}

/**
 * Walks the schema once, resolving each field's `rule` reference eagerly so an unregistered
 * rule key throws when the validator is built (on mount) rather than on the user's first
 * keystroke.
 */
function collectChecks<TValues>(schema: AnyFormSchema<TValues>, options: BuildValidatorOptions): FieldCheck[] {
	const checks: FieldCheck[] = []
	walkNodes(schema, (node) => {
		if (!isFieldNode(node)) return
		const config = node.validate
		if (config === undefined) return

		const rule = resolveNamedRule(config, options.rules)
		checks.push({
			name: node.name,
			run: (value, values) => runConstraints(value, values, config, rule, options.translate),
		})
	})
	return checks
}

/**
 * Compiles a `FormSchema`'s declarative `validate` blocks into a single, synchronous Standard
 * Schema v1 validator for the whole form. TanStack Form maps a Standard Schema's issues back
 * onto individual fields by path, so this stays one form-level validator rather than one per
 * field — nesting comes for free.
 *
 * Implemented by hand rather than by delegating to a schema library: a consumer who writes
 * forms in JSX and validates by hand should never have to install one for code they never call.
 */
export function buildValidator<TValues>(
	schema: AnyFormSchema<TValues>,
	// Defaulted: a schema that names no rules and needs no translator has nothing to pass,
	// and a missing argument would otherwise crash on `options.rules` rather than validate.
	options: BuildValidatorOptions = {},
): StandardSchemaV1<TValues, TValues> {
	const checks = collectChecks(schema, options)

	return {
		'~standard': {
			version: 1,
			vendor: 'ez-kit',
			validate: (value) => {
				const values = value as TValues
				const visible = visibleFieldNames(schema, values)
				const issues: { message: string; path: (string | number)[] }[] = []

				for (const check of checks) {
					if (!visible.has(check.name)) continue
					const message = check.run(getValueAtPath(values, check.name), values)
					if (message !== undefined) issues.push({ message, path: check.name.split('.') })
				}

				return issues.length > 0 ? { issues } : { value: values }
			},
		},
	}
}
