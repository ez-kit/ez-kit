import { isDateRangeValue, isIsoDate } from './date-value'
import { FORM_FIELD_TYPES, FormFieldType } from './field-types'
import { collectRuleFields } from './rules'
import { GRID_MAX, GRID_MIN, RESERVED_NODE_TYPES } from './schema'
import { hasChildren, isFieldNode, walkNodes } from './walk'

import type { Condition } from './rules'
import type { AnyFormSchema, FieldValidate, FormNode } from './schema'

/**
 * Options that widen what `parseFormSchema` accepts: custom field kinds, block components
 * and validation rule keys the caller registered, plus whether a translation function will
 * be available downstream (so translation-key labels are legal to keep).
 */
export type ParseOptions = {
	fieldTypes?: readonly string[]
	blocks?: readonly string[]
	rules?: readonly string[]
	hasTranslate?: boolean
}

/**
 * Thrown by `parseFormSchema` on the first structural or semantic violation. `path` is a
 * human-readable node location (e.g. `children[1].children[0]`) so a document delivered from
 * a server — with no source map back to any editor — can still be debugged from the message
 * alone.
 */
export class FormSchemaError extends Error {
	readonly path: string

	constructor(message: string, path: string) {
		super(`${message} (at ${path})`)
		this.name = 'FormSchemaError'
		this.path = path
	}
}

/** The field kinds whose nodes carry an `options` list. */
const OPTION_FIELD_TYPES: readonly string[] = [FormFieldType.Select, FormFieldType.RadioGroup]

/** The field kinds whose `min` / `max` / `defaultValue` are calendar dates. */
const DATE_FIELD_TYPES: readonly string[] = [FormFieldType.Date, FormFieldType.DateRange]

/** Widened for the same reason as `DATE_FIELD_TYPES`: a node's `type` is a bare `string`. */
const DATE_RANGE_TYPE: string = FormFieldType.DateRange

const SUPPORTED_VERSION = 1
const RELATIVE_FIELD_PREFIX = './'
const ROOT_PATH = 'root'

type UnknownRecord = Record<string, unknown>

function isPlainObject(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Registering a custom field type or block component under a name reserved for a container
 * (`section` / `step` / `submit` / `block`) would make it structurally unreachable — `isFieldNode`
 * always classifies those names as containers, never as fields. Caught once, up front, rather
 * than as a confusing "unknown node type" on every node that tries to use it.
 */
function assertNoReservedCollision(options: ParseOptions): void {
	const registered = [...(options.fieldTypes ?? []), ...(options.blocks ?? [])]
	const collision = registered.find((name) => (RESERVED_NODE_TYPES as readonly string[]).includes(name))
	if (collision !== undefined) {
		throw new FormSchemaError(`"${collision}" is a reserved node type and cannot be registered`, ROOT_PATH)
	}
}

function assertVersion(version: unknown): void {
	if (version !== SUPPORTED_VERSION) {
		throw new FormSchemaError(
			`Unsupported FormSchema version ${JSON.stringify(version)}; expected ${String(SUPPORTED_VERSION)}`,
			ROOT_PATH,
		)
	}
}

/** A `step` node cannot share a children array with a non-`step` sibling (spec §9.3). */
function assertStepHomogeneity(children: readonly FormNode<unknown, string>[], path: string): void {
	const stepCount = children.filter((child) => child.type === 'step').length
	if (stepCount > 0 && stepCount !== children.length) {
		throw new FormSchemaError('Step nodes cannot be mixed with non-step siblings', path)
	}
}

/**
 * Structural pass: confirms every node down the tree is an object with a string `type`, and
 * that every container carries a `children` array — the minimum a node needs before it is
 * safe to hand to `walkNodes` and the semantic checks that follow.
 */
function assertNodeShape(raw: unknown, path: string): FormNode<unknown, string> {
	if (!isPlainObject(raw)) {
		throw new FormSchemaError('Expected a form node object', path)
	}
	if (typeof raw.type !== 'string') {
		throw new FormSchemaError('Form node is missing a "type" string', path)
	}

	const node = raw as unknown as FormNode<unknown, string>
	if (hasChildren(node)) {
		if (!Array.isArray(node.children)) {
			throw new FormSchemaError(`Container node "${node.type}" is missing a "children" array`, path)
		}
		assertStepHomogeneity(node.children, `${path}.children`)
		node.children.forEach((child, index) => assertNodeShape(child, `${path}.children[${String(index)}]`))
	}
	return node
}

function assertKnownFieldType(type: string, path: string, options: ParseOptions): void {
	const isBuiltIn = (FORM_FIELD_TYPES as readonly string[]).includes(type)
	const isRegistered = options.fieldTypes?.includes(type) ?? false
	if (!isBuiltIn && !isRegistered) {
		throw new FormSchemaError(`Unknown node type "${type}"`, path)
	}
}

function assertUniqueName(rawName: unknown, path: string, seenNames: Set<string>): void {
	if (typeof rawName !== 'string' || rawName.length === 0) {
		throw new FormSchemaError('Field node is missing a "name"', path)
	}
	if (seenNames.has(rawName)) {
		throw new FormSchemaError(`Duplicate field name "${rawName}"`, path)
	}
	seenNames.add(rawName)
}

function assertKnownRule(validate: FieldValidate | undefined, path: string, options: ParseOptions): void {
	if (validate?.rule === undefined) return
	if (!options.rules?.includes(validate.rule)) {
		throw new FormSchemaError(`Unknown validation rule "${validate.rule}"`, path)
	}
}

function assertKnownBlock(component: unknown, path: string, options: ParseOptions): void {
	if (typeof component !== 'string' || component.length === 0) {
		throw new FormSchemaError('Block node is missing a "component" string', path)
	}
	if (!options.blocks?.includes(component)) {
		throw new FormSchemaError(`Unknown block component "${component}"`, path)
	}
}

/**
 * Structurally validates a raw `when` / `disabledWhen` value against the `Rule` union before
 * `collectRuleFields` ever sees it — `collectRuleFields` (and `compileCondition`) assume a
 * well-formed rule and throw a raw `TypeError` on anything else (`null`, a primitive, `{}`, an
 * object with no recognised operator key, a composite arm that isn't an array). A caller
 * catching only `FormSchemaError` must never see that `TypeError` escape.
 */
function assertRuleShape(value: unknown, path: string): void {
	if (!isPlainObject(value)) {
		throw new FormSchemaError('Condition must be a rule object', path)
	}
	if ('and' in value || 'or' in value) {
		const key = 'and' in value ? 'and' : 'or'
		const rules = value[key]
		if (!Array.isArray(rules)) {
			throw new FormSchemaError(`Rule "${key}" must be an array of rules`, path)
		}
		rules.forEach((rule) => {
			assertRuleShape(rule, path)
		})
		return
	}
	if ('not' in value) {
		assertRuleShape(value.not, path)
		return
	}
	if (typeof value.field !== 'string') {
		throw new FormSchemaError('Rule is missing a "field" string', path)
	}
	if ('eq' in value) return
	if ('in' in value) {
		if (!Array.isArray(value.in)) {
			throw new FormSchemaError('Rule "in" must be an array', path)
		}
		return
	}
	if ('gt' in value) {
		if (typeof value.gt !== 'number') {
			throw new FormSchemaError('Rule "gt" must be a number', path)
		}
		return
	}
	if ('lt' in value) {
		if (typeof value.lt !== 'number') {
			throw new FormSchemaError('Rule "lt" must be a number', path)
		}
		return
	}
	if ('truthy' in value) {
		if (value.truthy !== true) {
			throw new FormSchemaError('Rule "truthy" must be true', path)
		}
		return
	}
	throw new FormSchemaError('Rule must have one of "eq", "in", "gt", "lt" or "truthy"', path)
}

/**
 * Rejects a `when` / `disabledWhen` that cannot survive a trip through `JSON.parse`: a
 * function condition (never serialisable — this is what makes `parseFormSchema` the trust
 * boundary for BDUI payloads, spec I2/I3), a value that isn't a well-formed `Rule`, and a
 * relative field reference, reserved for array items and not yet supported in v1.
 */
function assertKnownCondition(condition: Condition<unknown> | undefined, path: string): void {
	if (condition === undefined) return
	if (typeof condition === 'function') {
		throw new FormSchemaError('Condition must be a serialisable rule object, not a function', path)
	}
	assertRuleShape(condition, path)
	for (const field of collectRuleFields(condition)) {
		if (field.startsWith(RELATIVE_FIELD_PREFIX)) {
			throw new FormSchemaError(
				`Relative field reference "${field}" is reserved for array items and is not supported in FormSchema v1`,
				path,
			)
		}
	}
}

/**
 * A `LocalizedText` must be a string, or an object carrying a string `key` — anything else
 * (a number, `{}`, an object whose `key` isn't a string) is garbage that would otherwise pass
 * silently whenever `options.hasTranslate` happens to be true.
 */
function assertLocalizedText(text: unknown, path: string, options: ParseOptions): void {
	if (text === undefined || typeof text === 'string') return
	if (!isPlainObject(text) || typeof text.key !== 'string') {
		throw new FormSchemaError('LocalizedText must be a string or an object with a string "key"', path)
	}
	if (!options.hasTranslate) {
		throw new FormSchemaError(
			`FormSchema uses the translation key "${text.key}" but no translate function is registered`,
			path,
		)
	}
}

/**
 * A `select` / `radiogroup` node's `options`. The renderer would otherwise turn a missing or
 * malformed list into an empty dropdown — a form that silently offers no choices is exactly
 * the failure a trust boundary exists to catch — and each `label` is `LocalizedText`, so it
 * needs the same check every other label gets.
 */
function assertOptions(node: FormNode<unknown, string>, path: string, options: ParseOptions): void {
	// `node.type` is a bare `string` here (a custom field kind can be anything), so it is
	// compared against the widened list rather than the enum members directly.
	if (!OPTION_FIELD_TYPES.includes(node.type)) return

	const list = (node as unknown as UnknownRecord).options
	if (!Array.isArray(list)) {
		throw new FormSchemaError(`"${node.type}" is missing an "options" array`, path)
	}
	for (const option of list as unknown[]) {
		if (!isPlainObject(option) || !('value' in option)) {
			throw new FormSchemaError('Each option must be an object with a "value"', path)
		}
		if (option.label === undefined) {
			throw new FormSchemaError('Each option must carry a "label"', path)
		}
		assertLocalizedText(option.label, path, options)
	}
}

/**
 * A date field's own values. Every date the format carries is a `YYYY-MM-DD` calendar date
 * string, so a document naming `01/02/2026` — or a `Date` that only looked like one before
 * `JSON.stringify` flattened it — is rejected here rather than reaching a picker, which would
 * either throw inside the kit or silently drift to a different day.
 *
 * `defaultValue` is checked against the kind: a `date` carries one date, a `daterange` carries
 * `{ start, end }` with both ends present — a half-open range is picker state, never form state.
 */
function assertDateValues(node: FormNode<unknown, string>, path: string): void {
	if (!DATE_FIELD_TYPES.includes(node.type)) return

	const raw = node as unknown as UnknownRecord
	for (const bound of ['min', 'max'] as const) {
		if (raw[bound] !== undefined && !isIsoDate(raw[bound])) {
			throw new FormSchemaError(`"${bound}" must be a YYYY-MM-DD date, got ${JSON.stringify(raw[bound])}`, path)
		}
	}

	if (raw.defaultValue === undefined) return
	const isRange = node.type === DATE_RANGE_TYPE
	const isValid = isRange ? isDateRangeValue(raw.defaultValue) : isIsoDate(raw.defaultValue)
	if (!isValid) {
		const shape = isRange ? '{ start, end } of YYYY-MM-DD dates' : 'a YYYY-MM-DD date'
		throw new FormSchemaError(`"defaultValue" must be ${shape}, got ${JSON.stringify(raw.defaultValue)}`, path)
	}
}

/**
 * `columns` (section) and `colSpan` (any node) are part of the v1 format's supported range,
 * not an undocumented kit detail — a document authored outside this codebase (BDUI, spec
 * I2/I3) has no other way to learn that 6 columns silently becomes 1.
 */
function assertGridValue(value: unknown, propertyName: string, path: string): void {
	if (value === undefined) return
	if (typeof value !== 'number' || !Number.isInteger(value) || value < GRID_MIN || value > GRID_MAX) {
		throw new FormSchemaError(
			`"${propertyName}" must be an integer between ${String(GRID_MIN)} and ${String(GRID_MAX)}, got ${JSON.stringify(value)}`,
			path,
		)
	}
}

function assertValidateMessages(validate: FieldValidate | undefined, path: string, options: ParseOptions): void {
	if (!validate?.messages) return
	for (const message of Object.values(validate.messages)) {
		assertLocalizedText(message, path, options)
	}
}

/** Rebuilds a node's `children[i].children[j]…` path from its ancestor chain via `walkNodes`. */
function computeNodePath(
	schema: AnyFormSchema<unknown>,
	node: FormNode<unknown, string>,
	ancestors: FormNode<unknown, string>[],
): string {
	let siblings: FormNode<unknown, string>[] = schema.children
	const segments: string[] = []
	for (const ancestor of ancestors) {
		segments.push(`children[${String(siblings.indexOf(ancestor))}]`)
		siblings = hasChildren(ancestor) ? ancestor.children : []
	}
	segments.push(`children[${String(siblings.indexOf(node))}]`)
	return segments.join('.')
}

function validateNode(
	node: FormNode<unknown, string>,
	path: string,
	options: ParseOptions,
	seenNames: Set<string>,
): void {
	if (isFieldNode(node)) {
		assertKnownFieldType(node.type, path, options)
		assertUniqueName((node as unknown as UnknownRecord).name, path, seenNames)
		assertOptions(node, path, options)
		assertDateValues(node, path)
		assertKnownRule(node.validate, path, options)
		assertValidateMessages(node.validate, path, options)
	} else if (node.type === 'block') {
		assertKnownBlock(node.component, path, options)
	} else if (node.type === 'section' || node.type === 'step') {
		assertLocalizedText(node.title, path, options)
	}

	if (node.type === 'section') {
		assertGridValue((node as unknown as UnknownRecord).columns, 'columns', path)
	}
	assertGridValue((node as unknown as UnknownRecord).colSpan, 'colSpan', path)

	assertKnownCondition(node.when, path)
	assertKnownCondition(node.disabledWhen, path)
	assertLocalizedText(node.label, path, options)
	assertLocalizedText(node.description, path, options)
}

/**
 * The trust boundary for a `FormSchema` that did not come from this bundle — typically one
 * delivered by a backend as BDUI payload (spec I2/I3). Validates shape, node types, name
 * uniqueness, validation-rule registration, condition serialisability and absoluteness, and
 * translation-key availability, throwing `FormSchemaError` with the offending node's path on
 * the first violation. A function passed as a `when`/`disabledWhen` cannot survive
 * `JSON.parse` anyway, but a caller passing a hand-built object must still be told it is not a
 * serialisable document.
 */
export function parseFormSchema<TValues>(input: unknown, options: ParseOptions = {}): AnyFormSchema<TValues> {
	assertNoReservedCollision(options)

	if (!isPlainObject(input)) {
		throw new FormSchemaError('Expected a form schema object', ROOT_PATH)
	}
	assertVersion(input.version)
	if (!Array.isArray(input.children)) {
		throw new FormSchemaError('FormSchema is missing a "children" array', ROOT_PATH)
	}

	assertStepHomogeneity(input.children as FormNode<unknown, string>[], 'children')
	;(input.children as unknown[]).forEach((child, index) => assertNodeShape(child, `children[${String(index)}]`))

	const schema = input as unknown as AnyFormSchema<TValues>
	const untypedSchema = schema as unknown as AnyFormSchema<unknown>
	const seenNames = new Set<string>()
	walkNodes(schema, (node, ancestors) => {
		const untypedNode = node as unknown as FormNode<unknown, string>
		const untypedAncestors = ancestors as unknown as FormNode<unknown, string>[]
		const path = computeNodePath(untypedSchema, untypedNode, untypedAncestors)
		validateNode(untypedNode, path, options, seenNames)
	})

	return schema
}
