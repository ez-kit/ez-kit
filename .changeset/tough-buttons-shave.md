---
'@ez-kit/data-grid-react': patch
'@ez-kit/form-react': patch
'@ez-kit/data-grid-heroui': minor
'@ez-kit/form-heroui': minor
---

Make the React 18 support these packages already declared actually hold, and correct the one place
where it could not.

The packages have advertised `react: ">=18.0.0"` while the source used two spellings React 19
introduced: the `<Context value>` JSX shorthand, and `ref` as a plain prop on a function component.
Both fail silently on React 18 — the shorthand renders a context object as an element, and a
stripped `ref` leaves the shared layer measuring nothing, so the sticky header published no height
and pinned rows stacked on one another. Providers are now written as `<Context.Provider>`, and
every component the layer hands a ref to (`DataGrid.Row`, the kits' `Thead` / `Tr`, shadcn's
`Button` and `ComboboxChips`) forwards it with `forwardRef`.

`DataGrid.Row` is consequently a `forwardRef` component rather than a plain function. It is used
and typed exactly as before — `ref` stays part of `DataGridRowProps`, and the generic
(`<DataGrid.Row<Order>>`) still applies — but code that inspected it as a value, rather than
rendering it, now sees an exotic component object instead of a function.

`@ez-kit/data-grid-heroui` and `@ez-kit/form-heroui` narrow their `react` / `react-dom` peer range
to `>=19.0.0`. Their own peer `@heroui/react@3` requires `react: ">=19.0.0"`, so the `>=18` these
kits advertised was never installable; the range now says what upstream already enforced.
