/**
 * What kind of value an operator takes — the one fact the grid reads off an operator to decide
 * how its filter behaves. The editor a filter shows, what switching operators keeps, which date
 * presets it offers and whether an empty value is a filter at all all follow from it, and never
 * from the operator's id: an author's `notBetween` with `input: 'range'` gets a range exactly as
 * the built-in `between` does.
 *
 * The ready-made definitions on `@ez-kit/data-grid-core/operators` write `input` as a literal
 * checked against this type rather than as `OperatorInput.Single`: a property read at the top level
 * of a module is something esbuild keeps, and with it every definition that made one.
 */
export const OperatorInput = {
	/** No value at all (`isEmpty`). The filter shows the operator's label in place of a control. */
	None: 'none',
	/** One value (`equals`, `contains`, `greaterThan`). */
	Single: 'single',
	/** A `{ from?, to? }` range (`between`). */
	Range: 'range',
	/** An array of values (`in`, `notIn`). */
	List: 'list',
} as const

export type OperatorInput = (typeof OperatorInput)[keyof typeof OperatorInput]
