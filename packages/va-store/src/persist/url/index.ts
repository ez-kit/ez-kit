/**
 * URL source for the persist core. Framework-agnostic: builds a {@link SyncSourcePort} over a
 * {@link UrlDriver} (read/commit `URLSearchParams`) and provides the `persistUrl`/`urlField` fronts.
 *
 * The render-scoped router adapters that produce a driver from router hooks ship as peer-gated
 * subpaths: `@ez-kit/va-store/persist/url/react-router` and `.../persist/url/next`.
 */
export { createUrlPort, URL_SOURCE, UrlHistory, type UrlDriver, type UrlMeta, urlMetaMerge } from './adapter'
export { persistUrl, type PersistUrlOptions, urlField, type UrlFieldOptions } from './decorator'
