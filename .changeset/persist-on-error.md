---
'@ez-kit/store-persist': minor
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

Report an async source's I/O failure to the application: `PersistProvider`'s `onError`, forwarded from
`StoreProvider` as `onPersistError`.

`SourcePort` is a public, documented extension point — a cookie, a REST endpoint, a WebSocket — and
until now a custom **async** adapter had nowhere to put a failure. The engine already carried an
`onError` option, but `PersistProvider` copied only `mergeMeta` and `defaultMeta` into it, so nothing
public could reach it: a rejected `get()` or `set()` was dropped on the floor. It now arrives as
`onError(error, { source })`, naming the source that produced it, so an app can raise a toast, retry, or
report telemetry. The handler is read at call time, so passing a fresh closure each render does not
re-create the engines.

Synchronous sources are unaffected — the URL port cannot reject, and the built-in storage adapter keeps
absorbing quota and private-mode errors behind its one-time `console.warn`. With no handler the
behaviour is exactly as before: the rejection is swallowed and the store stays the source of truth.

Fixed alongside it: the plugin's synchronous seed called `engine.snapshot()` and discarded the promise
an async port returns without settling it, so a failing async adapter raised an **unhandled rejection**
during mount — fatal under Node's default `--unhandled-rejections=throw`. The discarded copy is now
settled; `connect` still reads the source and reports the failure through `onError`.
