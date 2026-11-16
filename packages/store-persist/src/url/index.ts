/**
 * URL source for the persist core. Framework-agnostic: builds a synchronously readable source port over a
 * {@link UrlDriver} (read/commit `URLSearchParams`) and provides the `persistUrl`/`urlField` fronts.
 *
 * The render-scoped router adapters that produce a driver from router hooks ship as peer-gated
 * subpaths: `@ez-kit/store-persist/url/react-router` and `.../persist/url/next`.
 */
export { createUrlPort, URL_SOURCE, UrlHistory, type UrlDriver, type UrlMeta, urlMetaMerge } from './adapter'
export { persistUrl, type PersistUrlOptions, urlField, type UrlFieldOptions } from './decorator'

// Named public types keep inferred helper/decorator declarations portable for consumers.
export type { FieldValueOptions, ValidatedAccessorFieldOptions, ValidatedValueOptions } from '../accessor'
export type { PersistFieldDecorator } from '../decorators'
