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
type ConstraintKey = 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'format' | 'rule'

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

/** `undefined`, `null`, `''` and `false` (a checkbox-style boolean field) all count as empty. */
function isEmpty(value: unknown): boolean {
	return value === undefined || value === null || value === '' || value === false
}

function resolveMessage(
	key: ConstraintKey,
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

	if (config.min !== undefined && typeof value === 'number' && value < config.min) {
		return resolveMessage('min', config, translate, `Must be at least ${String(config.min)}`)
	}
	if (config.max !== undefined && typeof value === 'number' && value > config.max) {
		return resolveMessage('max', config, translate, `Must be at most ${String(config.max)}`)
	}
	if (config.minLength !== undefined && typeof value === 'string' && value.length < config.minLength) {
		return resolveMessage('minLength', config, translate, `Must be at least ${String(config.minLength)} characters`)
	}
	if (config.maxLength !== undefined && typeof value === 'string' && value.length > config.maxLength) {
		return resolveMessage('maxLength', config, translate, `Must be at most ${String(config.maxLength)} characters`)
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
	options: BuildValidatorOptions,
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
