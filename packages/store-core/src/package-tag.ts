/**
 * Prefix every user-facing message this package emits carries. One constant so the tag cannot
 * drift between modules; the convention across `@ez-kit` stores is `[<package>] <message>`.
 */
export const PACKAGE_TAG = '[store-core]'
