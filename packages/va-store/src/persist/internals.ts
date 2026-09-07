/**
 * Engine internals — the low-level primitives that power the persist core, re-exported from
 * `@ez-kit/store-persist/internals`. Import these ONLY when authoring a custom source adapter or
 * extending the engine; everyday usage (declaring fields, mounting a provider, reading handles)
 * needs nothing from here.
 *
 * A binding built by hand from these takes this package's `valtioPort` (exported from
 * `@ez-kit/va-store/persist`) as its port.
 */
export * from '@ez-kit/store-persist/internals'
