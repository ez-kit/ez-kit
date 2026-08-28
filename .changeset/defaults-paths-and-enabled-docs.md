---
'@ez-kit/data-grid-react': minor
---

**Breaking:** `DATA_GRID_DEFAULTS` is keyed by the option path it defaults.

The infinite-scroll tuning sat under `DATA_GRID_DEFAULTS.infinite.trigger` while the option it
defaults is `pagination.trigger` — and the constant exists precisely so a consumer can read a
default rather than restate it, which it cannot do if its shape is not the config's shape. Those
values moved to `DATA_GRID_DEFAULTS.pagination.trigger` / `.pagination.threshold`.

The Defaults page also listed 10 of the 14 values; `pagination.pageSizeOptions`, `variant`,
`siblings` and `boundaries` are now in the table.

`enabled` — on every feature config via `FeatureToggle`, documented on only the three write
features — is now a row in each feature's option table.
