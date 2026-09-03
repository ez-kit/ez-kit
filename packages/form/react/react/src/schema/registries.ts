import { FORM_FIELD_TYPES, RESERVED_NODE_TYPES } from '@ez-kit/form-core'

import type { FieldRenderProps } from '../contract'
import type { ReactNode } from 'react'

/**
 * What a custom field receives (spec §4.7, §8): the exact same binding a built-in field gets
 * — `id`, `data-field`, normalised `errors`, `invalid`, `onBlur`, `disabled`, … via
 * `FieldRenderProps` — plus its current value, a setter, and the schema-authored `props`.
 * Getting the binding for free, instead of wiring `form.AppField` by hand, is the entire
 * reason a custom field goes through a registry rather than being written inline.
 */
export type CustomFieldRenderProps<TValue = unknown> = FieldRenderProps & {
	value: TValue
	onChange: (value: TValue) => void
	props: Record<string, unknown>
}

/**
 * Custom field kinds, keyed by the schema's `type` (spec §4.7, §8). A custom field has a
 * `name` and is bound to a value — unlike a block, it must never be conflated with markup
 * that carries no binding.
 */
export type CustomFieldRegistry = Record<string, (props: CustomFieldRenderProps) => ReactNode>

/**
 * Block components, keyed by the schema's `component` (spec §4.7, §8). A block has no
 * `name`, holds no value, and receives only the schema-authored `props` — never the field
 * binding a custom field gets.
 */
export type BlockRegistry = Record<string, (props: { props: Record<string, unknown> }) => ReactNode>

/**
 * Every key a `fields` or `blocks` registry must never use: the four container types plus
 * every built-in `FormFieldType`. Registering a key that collides with one of these would be
 * structurally unreachable — `isFieldNode` (and `RenderNode`'s `switch`) always resolve a
 * reserved name to its built-in case, never to a registry (mirrors `assertNoReservedCollision`
 * in `@ez-kit/form-core`'s `parseFormSchema`, which guards the same collision for a schema
 * arriving as BDUI JSON).
 */
const RESERVED_REGISTRY_KEYS: readonly string[] = [...RESERVED_NODE_TYPES, ...FORM_FIELD_TYPES]

/**
 * Checked once when `FormRenderer` mounts, not per node — the registries are static,
 * authored config, so the answer cannot change between renders, and paying a per-node cost
 * for a condition that never changes would be wasted work.
 */
export function assertNoReservedFieldKeyCollision(
	fields: CustomFieldRegistry | undefined,
	blocks: BlockRegistry | undefined,
): void {
	const registered = [...Object.keys(fields ?? {}), ...Object.keys(blocks ?? {})]
	const collision = registered.find((key) => RESERVED_REGISTRY_KEYS.includes(key))
	if (collision !== undefined) {
		throw new Error(`"${collision}" is a reserved node type and cannot be registered.`)
	}
}
