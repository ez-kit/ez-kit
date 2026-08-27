import { FORM_FIELD_TYPES } from './field-types'
import { collectRuleFields } from './rules'
import { RESERVED_NODE_TYPES } from './schema'
import { hasChildren, isFieldNode, walkNodes } from './walk'

import type { LocalizedText } from './localized-text'
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
	if (options.blocks && !options.blocks.includes(component)) {
		throw new FormSchemaError(`Unknown block component "${component}"`, path)
	}
}

/**
 * Rejects a `when` / `disabledWhen` that cannot survive a trip through `JSON.parse`: a
 * function condition (never serialisable — this is what makes `parseFormSchema` the trust
 * boundary for BDUI payloads, spec I2/I3), and a relative field reference, reserved for array
 * items and not yet supported in v1.
 */
function assertKnownCondition(condition: Condition<unknown> | undefined, path: string): void {
	if (condition === undefined) return
	if (typeof condition === 'function') {
		throw new FormSchemaError('Condition must be a serialisable rule object, not a function', path)
	}
	for (const field of collectRuleFields(condition)) {
		if (field.startsWith(RELATIVE_FIELD_PREFIX)) {
			throw new FormSchemaError(
				`Relative field reference "${field}" is reserved for array items and is not supported in FormSchema v1`,
				path,
			)
		}
	}
}

function assertLocalizedText(text: LocalizedText | undefined, path: string, options: ParseOptions): void {
	if (text === undefined || typeof text === 'string') return
	if (!options.hasTranslate) {
		throw new FormSchemaError(
			`FormSchema uses the translation key "${text.key}" but no translate function is registered`,
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
		assertKnownRule(node.validate, path, options)
		assertValidateMessages(node.validate, path, options)
	} else if (node.type === 'block') {
		assertKnownBlock(node.component, path, options)
	} else if (node.type === 'section' || node.type === 'step') {
		assertLocalizedText(node.title, path, options)
	}

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
