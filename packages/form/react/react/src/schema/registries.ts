import { FORM_FIELD_TYPES, RESERVED_NODE_TYPES } from '@ez-kit/form-core'

import type { FieldRenderProps } from '../contract'
import type { ReactNode } from 'react'

/**
 * What a custom field receives (spec §4.7, §8): the exact same binding a built-in field gets
 * — `id`, `data-field`, normalised `errors`, `invalid`, `onBlur`, `disabled`, … via
 * `FieldRenderProps` — plus its current value, a setter, and the schema-authored `props`.
 * Getting the binding for free, instead of wiring `form.AppField` by hand, is the entire
 * reason a custom field goes through a registry rather than being written inline.
 *
 * `props` is **nested**, on both entry points, and that is deliberate. On the schema path
 * they arrive as `node.props` and are passed straight through. On the JSX path the call site
 * writes them flat — `<form.RatingField name='score' max={5} />` — and the generic binder
 * collects every key outside `BaseFieldProps` back into this bag, so one component serves
 * both paths and receives the same values from either. The one exception is `disabled`: the
 * schema path always computes a boolean (`false` for a node with no `disabledWhen`) while a
 * JSX call site that omits the prop passes `undefined`. Both are falsy and every kit renders
 * identically from either, so nothing observable differs — only a component testing
 * `'disabled' in props` rather than its value could tell. Passing them flat everywhere was
 * rejected: it lets a delivered document's `props` collide with `label` / `disabled` /
 * `name` / `validate`, i.e. a BDUI payload silently overwriting the binding.
 *
 * `TProps` is what `defineFieldType<{ max: number }>()` pins. It defaults to an untyped bag
 * for a field registered without one.
 */
export type CustomFieldRenderProps<TValue = unknown, TProps = Record<string, unknown>> = FieldRenderProps & {
	value: TValue
	onChange: (value: TValue) => void
	props: TProps
}

/**
 * Custom field kinds, keyed by the schema's `type` (spec §4.7, §8). A custom field has a
 * `name` and is bound to a value — unlike a block, it must never be conflated with markup
 * that carries no binding.
 *
 * **Not a prop.** This is the shape `createForm` derives from its `fields` registry — keyed
 * by component name there, by document id here (`deriveFieldTypeIds`) — and hands to the
 * schema renderer. A per-form `fields` prop on `FormRenderer` existed and was removed: the
 * factory is the single registration site, so a field registered once is reachable from JSX
 * *and* from a document, and the two can no longer disagree about what `rating` means.
 */
export type CustomFieldRegistry = Record<string, (props: CustomFieldRenderProps) => ReactNode>

/**
 * Block components, keyed by the schema's `component` (spec §4.7, §8). A block has no
 * `name`, holds no value, and receives only the schema-authored `props` — never the field
 * binding a custom field gets.
 */
export type BlockRegistry = Record<string, (props: { props: Record<string, unknown> }) => ReactNode>

/**
 * Every key a `blocks` registry must never use: the four container types plus every built-in
 * `FormFieldType`. Registering a key that collides with one of these would be structurally
 * unreachable — `isFieldNode` (and `RenderNode`'s `switch`) always resolve a reserved name to
 * its built-in case, never to a registry (mirrors `assertNoReservedCollision` in
 * `@ez-kit/form-core`'s `parseFormSchema`, which guards the same collision for a schema
 * arriving as BDUI JSON).
 */
const RESERVED_REGISTRY_KEYS: readonly string[] = [...RESERVED_NODE_TYPES, ...FORM_FIELD_TYPES]

/**
 * Checked once when `FormRenderer` mounts, not per node — the registry is static, authored
 * config, so the answer cannot change between renders, and paying a per-node cost for a
 * condition that never changes would be wasted work.
 *
 * `blocks` is the only registry still passed as a prop, and so the only one checked here. The
 * field registry moved to `createForm`, where `deriveFieldTypeIds` makes the equivalent
 * rejection once at factory time — two checks in two places, for two registries, rather than
 * two spellings of one.
 */
export function assertNoReservedFieldKeyCollision(blocks: BlockRegistry | undefined): void {
	const registered = Object.keys(blocks ?? {})
	const collision = registered.find((key) => RESERVED_REGISTRY_KEYS.includes(key))
	if (collision !== undefined) {
		throw new Error(`"${collision}" is a reserved node type and cannot be registered.`)
	}
}
