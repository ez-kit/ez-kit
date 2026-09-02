---
'@ez-kit/data-grid-react': minor
---

`DataGridDefaultOptions` accepts `boolean` for `creating` / `editing` / `deleting`.

The boolean arm reached the instance config in the previous release but not the defaults layer,
where the three write features are re-declared to make their handler optional — and the
re-declaration dropped it. So `defaults: { sorting: false }` compiled and
`defaults: { deleting: false }` did not, leaving an app-wide defaults layer no way to switch a
write feature off for a subtree without restating its settings.
