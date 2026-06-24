---
'@ez-kit/valtio-kit': minor
---

Add cross-tab synchronization to the persist storage adapters.

- The storage `SourcePort` now exposes `subscribe`: it listens for the browser `storage` event on its own key (and full-`clear()` events) and triggers a `pull`, so a change written in one tab propagates into every other tab's proxy. Events for other keys or a different storage area are ignored; `subscribe` is inert on the server.
- The echo loop is broken by the engine's existing baseline rebase on `pull` (last-committed becomes the pulled value), so a tab that receives a cross-tab change does not write it back — no A→B→A bounce.

Documented limitation: two proxies bound to the **same** storage key **within one tab** are unsupported (the same-tab writer receives no `storage` event). Use one bound proxy per key per tab.
