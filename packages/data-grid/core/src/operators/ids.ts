/**
 * The ids of the ready-made operator set, {@link defaultOperators}. Within that set the vocabulary
 * is spelled **once** — the same id means the same comparison whatever the column's cell type is,
 * and only the `label` changes ("Greater than" on a number column, "After" on a date one).
 *
 * That is a property of this set, not of the grid: the grid reads no behaviour off an id — it uses
 * one only to find the definition a filter value names — and a project
 * that assembles its own set may name its operators anything. It used to hold three vocabularies at
 * once — text spelled equality `equals` while number and date spelled it `eq` — and one concept
 * with two spellings, depending on which column you were looking at, is what this replaced.
 *
 * Named members for reference; the option is typed as `FilterOperatorId`, so
 * `defaultOperator: 'between'` is equally valid and needs no import.
 */
export const FilterOperator = {
	/** Substring match, case-insensitive. Text columns. */
	Contains: 'contains',
	/** Prefix match, case-insensitive. Text columns. */
	StartsWith: 'startsWith',
	/** Suffix match, case-insensitive. Text columns. */
	EndsWith: 'endsWith',
	/** Equality, in the column's own terms. */
	Equals: 'equals',
	/** Inequality, in the column's own terms. */
	NotEquals: 'notEquals',
	/** Strictly after / above. Labelled "Greater than" on numbers, "After" on dates. */
	GreaterThan: 'greaterThan',
	/** At or after / above. Labelled "Greater than or equal" on numbers, "On or after" on dates. */
	GreaterOrEqual: 'greaterOrEqual',
	/** Strictly before / below. Labelled "Less than" on numbers, "Before" on dates. */
	LessThan: 'lessThan',
	/** At or before / below. Labelled "Less than or equal" on numbers, "On or before" on dates. */
	LessOrEqual: 'lessOrEqual',
	/** Inclusive range — takes a `BetweenValue`. */
	Between: 'between',
	/** Row value is one of a set. */
	In: 'in',
	/** Row value is none of a set. */
	NotIn: 'notIn',
	/** Null / undefined / empty string. Takes no value. */
	IsEmpty: 'isEmpty',
	/** Anything but null / undefined / empty string. Takes no value. */
	IsNotEmpty: 'isNotEmpty',
} as const

export type FilterOperator = (typeof FilterOperator)[keyof typeof FilterOperator]

/**
 * A ready-made sign for each operator of the ready-made set — a map, not a setting.
 *
 * The grid shows an operator's label until its definition names an icon, because a bare sign in a
 * closed control is unreadable without a legend: operators rendered glyphs once and were moved to
 * labels for exactly that reason (#63). This map is for a project that wants the compact control
 * anyway — it copies a sign into the `icon` of each definition in the set it passes, and nothing
 * here changes anything by itself.
 *
 * One sign per {@link FilterOperator} member, whatever the column's cell type is: `greaterThan` is
 * `>` on a number column and on a date one alike, even though the date column labels it "After".
 * Plain strings, so core stays free of any framework. Keyed by literals rather than by
 * `[FilterOperator.Contains]`: a computed key reads a property, and esbuild keeps an object literal
 * that reads one, so importing `FilterOperator` alone would have carried this map too.
 */
export const DEFAULT_OPERATOR_ICONS: Readonly<Record<FilterOperator, string>> = {
	contains: '*a*',
	startsWith: 'a*',
	endsWith: '*a',
	equals: '=',
	notEquals: '≠',
	greaterThan: '>',
	greaterOrEqual: '≥',
	lessThan: '<',
	lessOrEqual: '≤',
	between: '↔',
	in: '∈',
	notIn: '∉',
	isEmpty: '∅',
	isNotEmpty: '≠∅',
}
