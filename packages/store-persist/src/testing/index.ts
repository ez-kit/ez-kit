/**
 * Test helpers for stores that persist. Shipped as a subpath (`@ez-kit/store-persist/testing`, and
 * re-exported by each binding package) rather than kept private, because the thing a consumer's
 * tests need — a substrate they can drive by hand — is exactly what this package's own tests need.
 */
export { createFakePersistAdapter, type FakePersistAdapter } from './fake-persist-adapter'
