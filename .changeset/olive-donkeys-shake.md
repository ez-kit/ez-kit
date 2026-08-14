---
'@ez-kit/data-grid-react': patch
---

Fix `globalFiltering.onChange` never firing, which silently disabled server-side global search.

The React layer splits `globalFiltering` into a UI half (`placeholder`, `debounce`, `toolbar`) and a headless half handed to the core. That split rebuilt the core config from an allowlist of `fn` / `fns`, so `onChange` was dropped — and with neither `fn` nor `fns` present it collapsed to `true`, leaving the core with no config object at all. A grid wired for `manual` filtering therefore never learned that the search box had changed, and the server was never re-queried.

The split now strips the three UI fields and passes everything else through, so any current or future headless option survives it.
