---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Put a form of your own in the create and edit modals. The kit's `FormModal` component is the one
way to replace the modal, and it now receives the whole form contract beside the dialog's props:
`mode`, `fields` (the generated fields one by one, keyed by column id), `initialValues`, `row`,
`errors`, `submit(values?)` and `validate(values)`. Register your own per grid with
`components={{ editing: { FormModal } }}`, or app-wide through `createDataGrid`, and either lay out
the generated `fields` and save with `onSave`, or render any form library seeded from
`initialValues` and save through `submit(values)`.

- `creating.commit` and `editing.commit` take `{ values }`, which replace the form's values before
  the save, and resolve to a `CommitResult`: `{ ok: true }`, or `ok: false` with a `reason` from
  `CommitFailure` — `'rejected'` (with the `errors` / `formError` the validator or a
  `ValidationError` from `onSave` produced), `'cancelled'`, `'busy'` (the grid's own `validate()`
  was running) or `'closed'` (no form open). Only an error the grid cannot interpret still
  rejects. A second call while a save is in flight resolves to the first one's outcome and ignores
  its `values`, and `cancel()` settles a save as cancelled even when `onSave` ignores its signal.
  `editing.commitCell` resolves the same way.
- `validate()` no longer cancels a commit in flight: it resolves `null` without running, since
  the commit validates anyway. It used to abandon a save that may already have reached the server.
- `validateValues(values)` on both features runs the validator and writes nothing. It resolves
  `null` when valid and also when no form is open, without running.
- The `creating` and `editing` slices carry `initialValues`, the seed `start()` wrote, which keeps
  its identity while the form is open.
- `editing.onSave` receives `row`, the edited row as it is in `data`, beside `rowId` and `values`.
- Validation takes any [Standard Schema](https://standardschema.dev): `validate: { schema }` accepts
  zod, valibot, arktype and the rest, and a schema may validate asynchronously. An issue without a
  path — a `refine` comparing two fields — now reaches `formError` instead of being dropped, several
  of them one per line; both kits render the banner with `white-space: pre-line`. A nested path is
  keyed by its first segment, as before.

**Breaking:**

- `zodResolver(schema)` is renamed `schemaResolver(schema)` and resolves asynchronously.
  `validate: { schema }` needs a schema that implements Standard Schema — zod 3.24 or later; an
  older zod fails with an error that says so. zod is no longer a peer dependency of
  `@ez-kit/data-grid-core`.
- The slot `editing.FormShell` is renamed `editing.FormModal`, and `FormShellProps` `FormModalProps`.
  An external kit declared `satisfies FullGridComponents` fails to compile until it renames the
  key; its component renders `children` as before and may ignore the new props. The fallback to `core.Modal` when no slot was registered is removed — `ComponentGuard`
  already required the slot in `mode: 'modal'`.
- `DataGrid.CreatingModal` and `DataGrid.EditingModal` are removed, with the named exports
  `DataGridCreatingModal` / `DataGridEditingModal` and their prop types. The grid mounts the modal
  itself, so one written in a layout rendered a second dialog beside the kit's, and its render
  function never replaced anything. Register a `FormModal` instead: the render function's
  arguments are its props, with `form` as `children`. `DataGridFormModalProps` and
  `DataGridFormModalRenderArgs` are removed too.
- The edit form, and the `values` that reach `editing.validate` and `editing.onSave`, hold only the
  fields of the edit form: no column with `editing: false`. Read such a value from `row`.
- `creating.commit`, `editing.commit` and `editing.commitCell` resolve to a `CommitResult` instead of
  `undefined`.
