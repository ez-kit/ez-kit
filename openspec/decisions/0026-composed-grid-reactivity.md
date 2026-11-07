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

The remaining selector audit covers confirmation targets, row move capabilities, drag registration
indices, sorting/visibility panel models, pagination answers and fallback spans. A pending bulk
confirmation follows selected IDs resolved against the current row model, matching core's
confirm-time targets even when filtering or pagination changes while the prompt is open. A retained
sortable item observes its own current index, even when its parent moves cached JSX into a new
order. Row indices share an index map keyed by the current bands or published virtual window;
row move predicates cache core's answers while their row-model and ordering inputs are unchanged.
These caches keep unrelated editing notifications from adding quadratic list scans.

Header and footer structure select their memoized groups. Ordinary leaves own their displayed
answers, so selecting a row leaves ordinary header cells alone. Opaque header/footer templates, configured row actions
and compound render functions retain live state updates through an explicit compatibility
subscription: a callback can read mutable model answers inline, and its dependencies cannot be
inferred from stable model identity. Table and Body render functions likewise retain compatibility;
their default paths select rows, bands, column composition and geometry without constructing JSX
for all virtual rows. The ARIA row-index provider independently observes rows and header count.

A single Filter builds only its target's model and subscribes only that target's lists and value;
faceted filters additionally observe their faceted answers. A single form field compares its own
value/errors, validation phase and edited row identity. Full forms keep their full state because
all fields and their validation remain live. Modal and creation-row renderers consume the selected
state directly; creation-row geometry and column order are selected together. The grid's options
publication remains separate and unchanged. `selector-model-reactivity.test.tsx` covers these
retained boundaries, callback compatibility and target isolation.

That callback compatibility also applies to `HeaderCell`, `FooterCell`, `Cell` and `Row`
render-function children, and to `rowProps`: a partial child selection can change the row
props without changing the parent's own selectedness. Header filter controls without a supplied
model subscribe to their own value and faceted answers; the panel remains the owner of the
models it supplies. This keeps a retained header live when another column changes its counts.

A stable selector function can reuse its previous result when options change without a store
write. Cached row-capability calculations therefore run through a fresh selector on render;
their own input cache still skips unrelated work. Column movement answers share a cache over
the leaf model, visibility, pinning and published options, with a separate result per move scope.
The cache delegates move rules to Core and builds one visual index map for header drag readers.
This removes repeated column scans on editing notifications without changing move semantics.
