---
'@ez-kit/va-store': minor
---

**Breaking:** `withPersist` now returns `T & { $url: UrlHandle; $persist: PersistHandle }`, so the
persist control handles are typed on a par with `withHistory`'s `history`.

`store.$url.runWithMeta({ history: UrlHistory.Push }, () => { … })` type-checks straight off
`useStore()`. `urlHandle()` / `persistHandle()` are unchanged and remain the way to reach a handle on
a proxy whose type has been widened away.

To make that type true rather than aspirational, both slots are now attached whatever the store
declares. A store with no field for a slot gets an inert handle there — it runs the mutation without
engine meta, exactly as a not-yet-connected handle does — and that handle's `source` is `null`, so
`PersistHandle['source']` is now `string | null`. As a result `urlHandle()` / `persistHandle()` no
longer throw for a `withPersist`ed proxy; the "no handle on this proxy" error now means only that the
proxy never went through `withPersist`.

- **Bindings are now built in the factory phase**, not on mount: `withPersist` constructs them and
  attaches the handles, while connecting them to the engines stays in the capability's `setup`. A
  binding's pristine default is therefore the value the **factory** produced, captured before a
  Provider pushes its initial controlled `value` during the first render.
- Consequence for a field that is **both controlled and persisted**: a field absent from the
  substrate is reset to its default on mount (`ApplyMode.Pull`, which every URL source runs once),
  and that default is now the factory value rather than the controlled one — so the controlled value
  no longer survives the first mount, and `onValueChange` reports the reset. A field that is only
  persisted, or only controlled, is unaffected.
