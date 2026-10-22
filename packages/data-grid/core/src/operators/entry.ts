/**
 * `@ez-kit/data-grid-core/operators` — the ready-made operator set and the constants named after
 * its ids, on an import path of its own.
 *
 * Off the main entry so that what a grid pays for its operators is paid where the set is imported:
 * a grid with no operator filters, or with a set of its own, never reaches this entry, and a
 * project that imports only {@link FilterOperator} or {@link DEFAULT_OPERATOR_ICONS} carries none
 * of the comparisons. `apps/docs/test/tree-shaking.test.ts` holds both guarantees.
 *
 * The types the set is made of (`FilterOperatorDef`, `OperatorInput`, `OperatorsConfig`) stay on
 * the main entry, beside the options they type.
 */

export { defaultOperators } from './default-operators'
export { DEFAULT_OPERATOR_ICONS, FilterOperator } from './ids'
