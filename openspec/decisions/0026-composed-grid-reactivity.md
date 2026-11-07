# 0026. Composed grid children own their reactive dependencies

- Status: Accepted
- Recorded: 2026-11-06
- Related: [0001-no-react-memo](./0001-no-react-memo.md)

## Decision

A grid component must observe the mutable model values it renders without relying on a parent
creating fresh JSX. State dependencies use selector subscriptions; replacing data, column
definitions or configuration is published separately by `TableProvider`, while the table's own identity stays
stable. `setData` refreshes the React owner so that publication also covers imperative updates.
Regression tests retain JSX elements across updates and check the DOM after each transition;
unrelated host renders must still leave cells, headers and rows alone.

## Context, rationale and rejected alternatives

The default table recreated its Header and Body elements whenever it rendered. That hid missing
Body subscriptions to visibility and pinning: passing the documented static children let React
retain Body, leaving its cells behind the header. The same failure occurred one level further
down when a custom body retained Row elements. Rows now select their memoized visible-cell list;
Body still observes the column slices for its render function, fallbacks and virtualized branch.

Auditing the other boundaries reproduced stale Footer totals after filtering, stale Footer
columns and page counts after grouping, and a draft sorting marker that survived apply without
row selection. Global search also left the select-all checkbox stale because Header observed
column filters but not the global filter. The old draft tests queued editing and applying before checking the DOM, while
apply's selection reset incidentally refreshed Header when selection was present. Tests now
flush separate transitions and include a feature set without selection or pagination.

Data and column definitions are options rather than store slices. With stable table context and
static JSX, replacing data could leave rows stale until an unrelated state write, such as the
pagination feature resetting a page. `TableInputsContext` publishes their identities and a configuration token; components reading
the table observe that notification in addition to their narrow state subscriptions. An imperative data write requests an owner render after updating the data
refs and options. It neither invents a persisted table-state slice nor changes the table's public
identity.

Changing the table context identity on every owner render would fix stale views by sacrificing
render isolation. Remounting with a new key would discard focus and local component state. Neither
is needed. `composition-subscriptions.test.tsx` and `static-composition-reactivity.test.tsx` hold
the updates; `host-rerender-isolation.test.tsx` holds the unchanged-host guarantee.

The follow-up audit reproduced the same gap at retained HeaderCell, FooterCell and Cell
boundaries, in CreatingRow and ExpandedRow, and in HeroUI's designated row header. Their
subscriptions select the displayed values or memoized model results. The store subscription
infrastructure was migrated to v9; a getter called outside a selector does not automatically
participate in that subscription. Complete cause lists can work, but the component that renders
a mutable value must own its notification rather than rely on fresh ancestor JSX.

Configuration replacement has a distinct channel because TanStack's React binding does not put
options in its state store. The notification token compares original merged inputs, before the
normalizers allocate new bags and functions. Plain option wrappers are compared structurally
to a bounded depth; data, columns, registries and arbitrary payloads retain identity semantics,
as do arrays, functions and React elements. Deeper new objects conservatively notify. This does
not walk datasets or compare arbitrary application graphs. State, context and construction-only
initial state are excluded; they already have their own channels. State-change handlers are
excluded because stable delegates already call their latest closure. Other function replacements
notify: a renderer or capability predicate can change visible output.

This keeps equivalent option wrappers from waking the table while publishing server row/page
counts, supplied aggregates, locale and layout changes. It does not make arbitrary imperative
`table.setOptions` writes reactive: configuration belongs in `useDataGrid` props, and `setData`
is the supported imperative data operation. `useGridMessages` participates in publication while
preserving its grid-less English fallback. A retained immutable row/header prop must still be
replaced by its owner when data/columns produce a new model.
