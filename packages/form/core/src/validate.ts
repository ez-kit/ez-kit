import { resolveText } from './localized-text'
import { getValueAtPath, toIssuePath } from './rules'
import { visibleFieldNames } from './visibility'
import { hasValue, walkInstances, walkNodes } from './walk'

import type { LocalizedText, Translate } from './localized-text'
import type { AnyFormSchema, FieldValidate } from './schema'
import type { StandardSchemaV1 } from '@tanstack/form-core'

export type { FieldValidate } from './schema'

/** Where one issue from a rule belongs, and what it says. */
export type RuleIssue = {
	/**
	 * Where to show the message, **relative to the node the rule is attached to**. On an array
	 * rule that is the offending entry — `'[1].email'` — which is how a cross-item check names
	 * the item at fault instead of blaming the whole list. Both index spellings work: paths are
	 * normalised, so `'1.email'` addresses the same place.
	 */
	path: string
	message: string
}

/**
 * A validation rule an app registers under a name (e.g. `'ru-inn'`) so a schema can reference
 * it via `validate.rule` without the schema itself carrying executable code — required for a
 * schema that may arrive as BDUI JSON (spec I2/I3).
 *
 * Answers `true` when the value passes; a message to show on the node itself; or a list of
 * issues that name their own places. The list form is what a rule attached to an **array** needs:
 * "these two people share an email" belongs on the two offending entries, not on the list.
 */
export type NamedRule = (value: unknown, values: unknown) => true | string | readonly RuleIssue[]

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

/** Looks up `config.rule` in the registered rules, throwing at build time if any is unknown. */
function resolveNamedRules(config: FieldValidate, rules: Record<string, NamedRule> | undefined): NamedRule[] {
	if (config.rule === undefined) return []
	const names = Array.isArray(config.rule) ? config.rule : [config.rule]
	return names.map((name) => {
		const rule = rules?.[name]
		if (rule === undefined) {
			throw new Error(
				`FormSchema references validation rule "${name}" but it was not registered in \`buildValidator\`'s \`rules\` option.`,
			)
		}
		return rule
	})
}

/** One failing check: a message, and where to attach it relative to the node. */
type Violation = { message: string; path: string | undefined }

/**
 * Runs the named rules, in the order the schema lists them, stopping at the first that fails.
 *
 * A rule may answer with one message — attached to the node itself — or with a list of issues
 * that name their own places, which is what a cross-item check needs in order to point at the
 * entry at fault. `messages.rule` overrides the one-message form only: a single override cannot
 * stand in for a list of individually-placed messages.
 */
function runRules(
	value: unknown,
	values: unknown,
	config: FieldValidate,
	rules: readonly NamedRule[],
	translate: Translate | undefined,
): Violation[] {
	for (const rule of rules) {
		const result = rule(value, values)
		if (result === true) continue
		if (typeof result === 'string') {
			return [{ message: resolveMessage('rule', config, translate, result), path: undefined }]
		}
		if (result.length > 0) return result.map((issue) => ({ message: issue.message, path: issue.path }))
	}
	return []
}

/**
 * Runs a single node's constraints, in a fixed order, stopping at the first failure — a field
 * with several violated constraints reports only the most relevant one rather than piling up
 * redundant messages for the user.
 */
function runConstraints(
	value: unknown,
	values: unknown,
	config: FieldValidate,
	rules: readonly NamedRule[],
	translate: Translate | undefined,
): Violation[] {
	if (config.required === true && isEmpty(value)) {
		return [{ message: resolveMessage('required', config, translate, 'This field is required'), path: undefined }]
	}
	// An optional field left blank has nothing left to check — but an empty **list** is still a
	// list, and both a length bound and a rule have something to say about it. Without this an
	// `array` with `minLength: 1` would pass on `[]`, which is the one case that option exists
	// for. It also makes `minLength` work on an empty multi-select, where it previously fell
	// through in silence.
	if (isEmpty(value) && !Array.isArray(value)) return []

	if (config.min !== undefined && isBelow(value, config.min)) {
		return [
			{ message: resolveMessage('min', config, translate, `Must be at least ${String(config.min)}`), path: undefined },
		]
	}
	if (config.max !== undefined && isAbove(value, config.max)) {
		return [
			{ message: resolveMessage('max', config, translate, `Must be at most ${String(config.max)}`), path: undefined },
		]
	}
	const length = lengthOf(value)
	if (config.minLength !== undefined && length !== undefined && length < config.minLength) {
		return [
			{
				message: resolveMessage('minLength', config, translate, minLengthMessage(value, config.minLength)),
				path: undefined,
			},
		]
	}
	if (config.maxLength !== undefined && length !== undefined && length > config.maxLength) {
		return [
			{
				message: resolveMessage('maxLength', config, translate, maxLengthMessage(value, config.maxLength)),
				path: undefined,
			},
		]
	}
	if (config.format !== undefined && typeof value === 'string' && !FORMAT_PATTERNS[config.format].test(value)) {
		return [
			{ message: resolveMessage('format', config, translate, `Must be a valid ${config.format}`), path: undefined },
		]
	}

	return runRules(value, values, config, rules, translate)
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
	return runConstraints(value, values, config, resolveNamedRules(config, options.rules), options.translate)[0]?.message
}

/**
 * Resolves every node's `rule` references eagerly, so an unregistered rule key throws when the
 * validator is built (on mount) rather than on the user's first keystroke.
 *
 * Keyed by node identity rather than by name: one `array` node yields as many field instances as
 * there are items, and they all share the node — and its rules — so resolving per instance would
 * repeat the lookup for every entry on every keystroke. The schema is static authored config, so
 * the node objects are stable for the validator's whole life.
 */
function resolveRulesByNode<TValues>(
	schema: AnyFormSchema<TValues>,
	options: BuildValidatorOptions,
): Map<object, NamedRule[]> {
	const byNode = new Map<object, NamedRule[]>()
	walkNodes(schema, (node) => {
		if (!hasValue(node) || node.validate === undefined) return
		byNode.set(node, resolveNamedRules(node.validate, options.rules))
	})
	return byNode
}

/** Joins a rule-supplied relative path onto the node it came from. */
function joinIssuePath(base: string, relative: string): string {
	return relative.startsWith('[') ? `${base}${relative}` : `${base}.${relative}`
}

/**
 * Compiles a `FormSchema`'s declarative `validate` blocks into a single, synchronous Standard
 * Schema v1 validator for the whole form. TanStack Form maps a Standard Schema's issues back
 * onto individual fields by path, so this stays one form-level validator rather than one per
 * field — nesting comes for free.
 *
 * Implemented by hand rather than by delegating to a schema library: a consumer who writes
 * forms in JSX and validates by hand should never have to install one for code they never call.
 *
 * The checks are collected **inside** `validate`, not once when the validator is built. An
 * `array` node stands for as many field instances as the current values hold, so which checks
 * exist at all is a property of the values — the one thing not knowable at build time. Only the
 * rule *lookup* is hoisted, since that depends on the schema alone.
 */
export function buildValidator<TValues>(
	schema: AnyFormSchema<TValues>,
	// Defaulted: a schema that names no rules and needs no translator has nothing to pass,
	// and a missing argument would otherwise crash on `options.rules` rather than validate.
	options: BuildValidatorOptions = {},
): StandardSchemaV1<TValues, TValues> {
	const rulesByNode = resolveRulesByNode(schema, options)

	return {
		'~standard': {
			version: 1,
			vendor: 'ez-kit',
			validate: (value) => {
				const values = value as TValues
				const visible = visibleFieldNames(schema, values)
				const issues: { message: string; path: (string | number)[] }[] = []

				walkInstances(schema, values, ({ node, path }) => {
					if (path === undefined || !hasValue(node)) return
					const config = node.validate
					if (config === undefined || !visible.has(path)) return

					const violations = runConstraints(
						getValueAtPath(values, path),
						values,
						config,
						rulesByNode.get(node) ?? [],
						options.translate,
					)
					for (const violation of violations) {
						const target = violation.path === undefined ? path : joinIssuePath(path, violation.path)
						issues.push({ message: violation.message, path: toIssuePath(target) })
					}
				})

				return issues.length > 0 ? { issues } : { value: values }
			},
		},
	}
}
