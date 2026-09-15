---
'@ez-kit/store-core': major
'@ez-kit/store-persist': major
'@ez-kit/va-store': major
'@ez-kit/zu-store': major
---

1.0 — the store packages' public API comes under semver.

This release is the promise, not a rewrite: nothing in it changes behaviour on its own. What ships is
the surface `@ez-kit/zu-store` 0.8, `@ez-kit/va-store` 0.4, `@ez-kit/store-core` 0.5 and
`@ez-kit/store-persist` 0.2 already shipped. What ends is the 0.x convention of landing a breaking
change as a minor. From here a break in any of the four is a major there, and a break in the shared
foundation that surfaces through a binding is a major in that binding too.

The four version **independently** from here. They reach 1.0 together because they are one surface cut
into a foundation, an engine and two bindings — but a feature in `@ez-kit/zu-store` does not move
`@ez-kit/va-store`, and an engine fix does not move a binding it did not change. Never read two matching
version numbers as a compatibility statement: the binding's own dependency range on `@ez-kit/store-core`
and `@ez-kit/store-persist` is what says which versions pair.

Covered: the binding root and its `history`, `persist`, `persist/storage`, `persist/url`,
`persist/url/next`, `persist/url/react-router`, `persist/validators/zod` and `persist/testing`
subpaths, plus `@ez-kit/store-core` and `@ez-kit/store-persist` themselves. Writing a **custom source
adapter** is covered — it is a `SourcePort`, and every type it needs is on the `persist` entry.

Not covered: `@ez-kit/store-persist/internals`, the engine's assembly primitives — binding a new state
manager to this engine is not a supported extension point yet; anything reached through a deep file
path; and the exact wording of error and warning messages, whose `[zu-store]` / `[va-store]` /
`[store-core]` / `[store-persist]` prefix is stable so they can be filtered on the tag.

The full statement, including the supported React / Zustand / Valtio / Node ranges, is on the Stability
page: https://ez-kit-docs.vercel.app/docs
