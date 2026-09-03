# @ez-kit/form-shadcn

## 0.3.0

### Minor Changes

- fd7c480: Ship `'use client'` in the published bundles, make TanStack Form a peer dependency, and
  complete the kits' re-export surface.

  **Breaking** — `@tanstack/react-form` and `@tanstack/form-core` moved from `dependencies` to
  `peerDependencies` (`^1.33.2`) on `@ez-kit/form-react`, `@ez-kit/form-shadcn` and
  `@ez-kit/form-heroui`. The kits' `useForm` _is_ a TanStack Form hook and the types they
  re-export are TanStack's own, so two copies in one tree would mean two `FormApi`s and two
  sets of contexts. pnpm and npm install peers automatically; other package managers need the
  dependency added by hand.

  **Fixed** — the published `dist/index.js` of all three React packages now starts with
  `'use client'`. The directive was present on the source modules but tsup bundles them into
  one file and esbuild drops a directive that is no longer the first statement, so the shipped
  bundle carried none and importing `Form` or `FormRenderer` from a React Server Component
  failed with an unrelated-looking hook error. `@ez-kit/form-core` deliberately keeps no
  directive — import the pure helpers (`parseFormSchema`, `stripHiddenValues`, …) from there in
  a server component or a server action.

  **Fixed** — both kits now re-export the whole consumer surface they claim to. Most visibly
  `FormOptionSources`, which the option-sources docs already told readers to import from the
  kit while only `@ez-kit/form-react` exported it. Also added: the `OptionSource*` types, the
  field prop types for the kinds that were missing them (`MultiSelectFieldProps`,
  `CheckboxGroupFieldProps`, `Date`/`DateRange`/`RadioGroup`/`Slider`/`SwitchFieldProps`),
  `FormUncontrolledProps`, `BoundForm`, `KitFormApi`, `DateRangeValue`, `OptionsSource`,
  `JsonValue`, the grid range helpers, and the remaining schema node types and traversal
  helpers from `@ez-kit/form-core`. The kit-author contract (`createForm`, `FormComponents`,
  the per-kind `*RenderProps`) stays out on purpose — writing a kit means depending on
  `@ez-kit/form-react` directly.

- fd7c480: config-driven forms: render a form from a plain-data `FormSchema`

  A form can now be described as data — `{ version: 1, children: [...] }` — and rendered with
  `<FormRenderer>` through the very same bound field components the JSX API uses, so a
  config-driven form and a hand-written one produce identical DOM. The document is JSON with no
  functions anywhere, so the same schema can be authored in TypeScript, stored in a database, or
  delivered by a backend.

  `@ez-kit/form-core` gains the format and everything that reasons about it: `defineFormSchema`
  (curried, so `name` is checked per field kind against your value type), the closed rule
  language behind `when` / `disabledWhen` (`compileCondition`), `buildValidator` (schema
  constraints → one standard-schema validator, no zod), `visibleFieldNames` /
  `stripHiddenValues`, `walkNodes`, `resolveText`, and `parseFormSchema` — the trust boundary a
  backend-delivered document passes through, which throws `FormSchemaError` with the offending
  node's path.

  `@ez-kit/form-react` (and both kits) gain `FormRenderer`, in the same controlled and
  uncontrolled modes as `<Form>`, with registries for custom field kinds, value-less blocks and
  named validation rules; wizards, when the document's top-level children are `step` nodes; and
  the composition helpers `withForm`, `withFieldGroup`, `useFormGroup` and `useFieldGroup`.

  The UI-kit contract grows `Section`, `GridItem` and `Wizard` — a breaking change for a
  hand-written kit, which must supply the new primitives.

  Both kits now also re-export the schema-authoring API of `@ez-kit/form-core`
  (`defineFormSchema`, `parseFormSchema`, `FormSchemaError`, `buildValidator`,
  `stripHiddenValues` and the `FormSchema` / `FormNode` / `NamedRule` types), so a kit stays the
  only package a consumer installs.

- fd7c480: feat(form): date and date-range fields

  Two new field kinds — `date` and `daterange` — available from both the JSX API
  (`form.DateField`, `form.DateRangeField`) and a schema (`FormFieldType.Date`,
  `FormFieldType.DateRange`).

  Every date is a **`YYYY-MM-DD` string**, and a range is `{ start, end }` of two of them under
  a single `name`. No `Date` object ever enters form state: a calendar date has no time zone to
  lose, and only a string survives `JSON.stringify` — which is what keeps a date field
  describable by a backend-delivered document. Each kit converts at its own edge (React Aria's
  `CalendarDate` for HeroUI, `Date` for shadcn's react-day-picker), so no date library reaches
  the adapter or your values.

  A range is a separate kind rather than a flag, because its value shape differs — which is
  what keeps `name` narrowed to paths of the right type in both cases. Its value appears only
  once **both** ends are picked; a half-picked range stays inside the picker.

  `min` / `max` on a node bound what the calendar offers. Enforcement stays in
  `validate: { min, max }`, which now accepts a `YYYY-MM-DD` string as well as a number — ISO
  dates compare correctly as text, so no date-only constraint was needed. `parseFormSchema`
  rejects a malformed day, an impossible one (`2026-02-31`), or a range default missing an end.

  **Breaking for custom kits:** `FormComponents` gains `DateField` and `DateRangeField`; a kit
  built against the old contract will not satisfy it until both are implemented.

  Also: `buildValidator`'s `options` argument is now optional — a schema that names no rules
  had nothing to pass, and omitting it used to throw.

- 5a6bf03: **`form.Section` and `form.GridItem` — the JSX half of the layout the document side already had.**

  Both kits have implemented `Section` and `GridItem` since v1: the schema renderer draws a `section`
  node as a headed column grid and wraps each child of that grid in a `GridItem` carrying the node's
  `colSpan`. Neither was reachable from JSX — `createForm` built the fields and nothing else — so a
  hand-written form had to reproduce the grouping in its own markup, which is what the docs' showcase
  example did, in six lines of local component nobody could import.

  They are now on the form instance beside the fields:

  ```tsx
  <form.Section
  	title='Company'
  	columns={3}
  >
  	<form.GridItem colSpan={2}>
  		<form.TextField
  			name='company'
  			label='Company'
  		/>
  	</form.GridItem>
  	<form.TextField
  		name='vatId'
  		label='VAT id'
  	/>
  </form.Section>
  ```

  The one difference from the document spelling is where the span is written: a node carries
  `colSpan` itself, because a node cannot wrap itself, while JSX wraps the child — and only where a
  span above one column is wanted, since an unwrapped child is already a cell of its own. Both reach
  the same kit components, so the two spellings still produce identical DOM.

  New exported types: `SectionProps`, `GridItemProps`. New docs page: [Layout](https://ez-kit.dev/docs/form/layout).

- fd7c480: feat(form): a `loading` flag for option-bearing fields

  `form.SelectField`, `form.MultiSelectField`, `form.RadioGroupField` and
  `form.CheckboxGroupField` accept an optional `loading` boolean, so an app that fetches its
  options can say which kind of empty list it is passing:

  ```tsx
  <form.SelectField
  	name='role'
  	options={data ?? []}
  	loading={isPending}
  />
  ```

  Without it `options={data ?? []}` is ambiguous — "still fetching" and "the backend genuinely
  offers nothing" both render as an empty dropdown, which is exactly the failure `assertOptions`
  in `parseFormSchema` exists to prevent on the authoring side. It also covers the edit-form
  case: a value restored from the server (`city: 'msk'`) arrives before the option that carries
  its label, so the trigger would otherwise render blank.

  Both kits disable the control while `loading` is true and show a skeleton where its value
  would go — one bar in a select or multi-select trigger, a short list of placeholder rows in a
  radio or checkbox group, which have no trigger to put a single skeleton in. The shadcn kit
  adds the skeleton as a `blocks/` adapter (its vendored `components/ui/**` stays untouched);
  the HeroUI kit uses HeroUI's own `Skeleton`.

  Nothing in `@ez-kit/form-core` changes: `loading` is a rendering concern, not part of the
  serialisable document format, and a statically authored `options` array renders as
  `loading: false`.

  Failure is deliberately **not** in the contract — no `error`, no `onRetry`. A retry button
  inside a select popover is dubious UI and multiplies awkwardly across the four widgets, and
  the code supplying the options can already surface a failed fetch itself.

  **Breaking (kit contract).** `SelectFieldRenderProps`, `MultiSelectFieldRenderProps`,
  `RadioGroupFieldRenderProps` and `CheckboxGroupFieldRenderProps` gain a **required**
  `loading: boolean` key. A third-party kit implementing `FormComponents` still compiles if it
  ignores the prop, but it will not render a loading state until it handles it; anything that
  _constructs_ one of those props objects (a test harness, a wrapper component) must now supply
  `loading`. Consumers of the shipped kits are unaffected — the new consumer prop is optional
  and defaults to `false`.

- fd7c480: feat(form): multi-select and checkbox-group fields

  Two new field kinds — `multiselect` and `checkboxgroup` — from the JSX API
  (`form.MultiSelectField`, `form.CheckboxGroupField`) and from a schema
  (`FormFieldType.MultiSelect`, `FormFieldType.CheckboxGroup`). Both bind to a **`string[]`**
  under a single `name`, take the same `options` list as their single-value counterparts, and
  complete the selection grid: collapsed vs expanded, one value vs many.

  They are separate kinds rather than a `multiple` flag, because the value type differs — which
  is what keeps `name` narrowed to `string[]` paths here and `string` paths on `select` /
  `radiogroup`. The value is always a list (`[]` when nothing is chosen, never `undefined`).

  Validation follows: **an empty list now counts as empty**, so `required` is no longer
  satisfied by a multi-select with nothing selected, and `minLength` / `maxLength` measure
  entries for a list (characters for a string, as before). `parseFormSchema` rejects a
  `defaultValue` that is not an array of option values, and requires `options` on both kinds.

  No new dependencies in either kit: HeroUI uses its own `Select` in `selectionMode='multiple'`
  and its real `CheckboxGroup`; shadcn — whose Radix select is single-selection only — composes
  a popover of vendored checkboxes, the same shape this repo's data-grid kit already uses for
  its faceted filter.

  **Breaking for custom kits:** `FormComponents` gains `MultiSelectField` and
  `CheckboxGroupField`.

- fd7c480: `searchable` on a `multiselect`: the same combo box, with chips that carry resolved labels.

  `searchable` shipped on `select` only, and `parseFormSchema` rejected it on `multiselect` with
  "not supported in this version". It is supported now: the parser accepts the flag there, the
  JSX prop exists on `MultiSelectFieldProps`, and both kits render a multi-value combo box.

  **The source contract did not change**, and does not need to. `useSelectedOptions` already took
  its `values` as an array; a `multiselect` simply sends its whole selection where a `select`
  sends a one-element one. A source written for a searchable select serves a searchable
  multiselect unchanged — the same registry entry can serve both fields in one form.

  Resolving those values is the entire point. With a server-side search the current selection is
  normally absent from the current page of results, so without the second hook every chip would
  read as a raw id. The renderer merges both hooks' options into the one list the kit sees, and
  each kit labels its chips by looking a value up in it — neither kit learns two queries exist.

  After a selection **the query resets to empty**, in both kits: the term that produced the chip
  has been consumed by it, and leaving it behind would silently narrow the next search. Removing a
  chip updates form state and leaves the query alone. Changing the source's resolved parameters
  still clears the whole selection to `[]`, as it always did.

  **Breaking for third-party kit authors, not for source or form authors.**
  `MultiSelectFieldRenderProps` gains a required `search: { query, onQueryChange } | undefined`
  key, the identical one `SelectFieldRenderProps` grew — a kit that does not declare it no longer
  satisfies `FormComponents`. Handling it is optional in practice: `search === undefined` is every
  non-searchable field, and a kit may pass the prop through and keep rendering its plain control.

  `searchable` stays illegal on `radiogroup` and `checkboxgroup`, which render every option
  inline; the parse error now names both legal kinds. A `searchable` field wired to a static
  `options` list, or to a plain-function source, still throws at render naming the field.

  No new package dependency in either kit: `@ez-kit/form-shadcn` uses the `multiple` mode and the
  chip parts of the Base UI combobox it already vendored, and `@ez-kit/form-heroui` uses
  `ComboBox` in `selectionMode='multiple'` with `Chip` for the selection.

- fd7c480: `searchable` on a `select`: a combo box that queries a source as the user types.

  Everything `optionsFrom` shipped so far assumes a source returns **the whole list**, which is
  what guarantees the option carrying the value in form state is on it and can be found for its
  label. Server-side search breaks that permanently: the source returns only the page matching
  the last query, so form state holding `city: 4821` next to results for "lis" draws a blank
  control forever.

  So a source may now take a second, optional shape — two hooks instead of one:

  ```ts
  type OptionSource = ((input: OptionSourceInput) => OptionSourceResult) | SearchableOptionSource
  ```

  `useOptions` answers "what matches what was just typed" (its input gains an additive `query`),
  and `useSelectedOptions` answers "what is the option behind the values already selected". The
  renderer calls both and merges their results — deduped by value, `loading` true while either is
  — so a kit still sees one `options` list and one `loading` flag. react-admin pays the same
  price, with `getMany(ids)` alongside `getList`.

  `searchable` is a flag on `select`, not a new node type: the value and its shape are unchanged.
  It is rejected on `radiogroup` / `checkboxgroup` (they render every option inline) and, for now,
  on `multiselect` (coherent, not yet built — the parse error says so in those words). A
  `searchable` field wired to a static `options` list, or to a plain-function source, throws at
  render naming the field.

  The query reaches the source **raw**, every keystroke. Debouncing and a `minChars` gate are the
  source's job for now — there is deliberately no delay option, constant or timer in the package;
  it intends to take debouncing over later.

  Both kits gained the widget. `@ez-kit/form-heroui` renders `ComboBox` from `@heroui/react`, so
  it costs nothing new. `@ez-kit/form-shadcn` takes a **new dependency, `@base-ui/react`**: the
  `radix-nova` style's own combobox is built on it, Radix ships no combobox primitive, and this is
  the registry's first-class answer. The kit therefore now ships two primitive systems side by
  side; no existing Radix-based block was migrated. Its size budget moves 95 KB → 135 KB (real
  size 124.86 KB, up from 88.88 KB). Tree-shaking is intact — only the combobox lands, not the
  library.

  Who this breaks:
  - **Source authors: no one.** The widening is a union, `query` is additive, and every source
    written against the function shape stays valid.
  - **Third-party kit authors: yes.** `SelectFieldRenderProps` gains a required
    `search: { query, onQueryChange } | undefined` key — the same class of break `loading` made.
    A kit that spreads unknown props onto the DOM must destructure it; one that wants the feature
    branches on `search !== undefined` and must not filter `options` itself.

- 2264a8d: form: a standalone `<Form>` component in two modes, replacing `form.Form`

  `<Form>` is now the single place the `<form>` element is rendered, and it comes in two
  mutually exclusive modes:
  - **uncontrolled** — pass the options `useForm` takes and it runs the hook itself, handing
    the instance to a render prop. The form is created by mounting the element, so unmounting
    it (closing a dialog, switching a record) takes its values, errors and submit state with
    it. `children` is a function because React context cannot carry the form-data generic —
    through context every `name` would degrade to a bare `string`.
  - **controlled** — `<Form form={form}>` around an instance from `useForm`, with plain JSX
    children, for when something outside the markup reads the form.

  **Breaking:** `form.Form` is gone — render `<Form>` instead. `FormWrapperProps` is replaced
  by `FormProps`. Kits now export `Form` alongside `useForm`, and `createForm` returns both.
  `@ez-kit/form-core` re-exports `AnyFormOptions`, which the component uses to tell form
  options from DOM props.

- fd7c480: form: a select/radiogroup option label is `LocalizedText`

  **Breaking (schema authoring).** A `select` / `radiogroup` node's `options` now carry
  `label: LocalizedText` — the new `LocalizedSelectOption` type — so a document delivered by a
  backend can name a translation key instead of shipping finished copy in one language, which
  every other label in the format could already do. A plain string is still a `LocalizedText`,
  so existing schemas keep compiling; only code that typed its option list as `SelectOption`
  needs to switch to `LocalizedSelectOption`.

  `SelectOption` itself is unchanged (`label: string`): the kit contract and the JSX API stay a
  resolved-strings surface, and `FormRenderer` bridges the two through the new
  `resolveSelectOptions(options, translate)`.

  `parseFormSchema` now also validates `options` — a `select` / `radiogroup` with no options
  array, an option missing `value` or `label`, or a label that is neither a string nor a
  `{ key }` object is a `FormSchemaError` instead of a silently empty dropdown.

### Patch Changes

- fd7c480: Named option sources: a select-like field can name a list instead of carrying it.

  A 200-country list, or a country → city cascade, cannot be written into a form document. The four select-like nodes now take `optionsFrom` — a **name**, never a URL — beside the existing `options`, and the app decides what that name fetches:

  ```json
  {
  	"type": "select",
  	"name": "address.city",
  	"optionsFrom": {
  		"source": "dictionary",
  		"params": { "domain": "cities" },
  		"dependsOn": { "country": "address.country" }
  	}
  }
  ```

  The same prop works in TSX, where the live value is passed directly instead: `<form.SelectField name='address.city' optionsFrom='dictionary' optionsParams={{ domain: 'cities', country }} />`.

  Sources are registered on the new `<FormOptionSources value={…}>` provider — a provider rather than a `FormRenderer` prop, because unlike `fields` / `blocks` / `rules` a source serves the JSX path too. **A source is a React hook**, so it is whatever query the app already has (TanStack Query, SWR, RTK Query, or a plain synchronous list); this package ships no fetching, no cache and no abort logic, and no built-in `dictionary` source. `parseFormSchema` gains `optionSources` and rejects an unregistered name with the node's path, exactly as it does for an unknown rule or block.

  When a source's resolved parameters change, the dependent field's value is cleared immediately — otherwise `{ country: 'de', city: 'msk' }` gets submitted. Parameters are compared by value, and the first computation is skipped so a loaded draft survives mount.

  **Breaking (`@ez-kit/form-core`).** `options` on the four select-like schema members is no longer unconditionally required: they now take exactly one of `options` and `optionsFrom`. A node carrying both, or neither, is a compile error — and a parse error for a delivered document, whose message changed from `"select" is missing an "options" array` to `"select" needs either an "options" array or an "optionsFrom" source`. Every existing schema that writes its `options` out still compiles unchanged.

  **Breaking (`@ez-kit/form-react`).** `options` on the four option-bearing field components is now optional in the types, with the "exactly one of `options` / `optionsFrom`" rule enforced at runtime with the field's name in the message. Expressing it in the types would collide with the string/number correlation those props are already a union over. `BindableForm` gains `setFieldValue`, which every real TanStack instance already has.

  **Fix (`@ez-kit/form-shadcn`).** `SelectField` omitted Radix's `value` prop when the field was empty, which dropped the select into uncontrolled mode: after the user had picked an option, clearing the field left Radix holding its own last value, and the trigger rendered blank — no label, and no placeholder either. The prop is now always passed; Radix reads `''` as "no selection" and draws the placeholder, which is what the empty state was meant to look like all along. Nothing exercised this before, because nothing reset a select from a chosen value back to empty.

- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [5a6bf03]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [2264a8d]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
  - @ez-kit/form-core@0.3.0
  - @ez-kit/form-react@0.3.0

## 0.2.0

### Minor Changes

- 77390a1: Invert the form UI-kit contract: a kit now owns each field's entire element tree.

  `@ez-kit/form-react` no longer renders any DOM. Instead of asking a kit for chrome
  primitives (`FieldRoot`, `Label`, `Description`, `ErrorText`) and assembling them itself in
  one fixed order as siblings of the input, it hands the kit one flat props object per field
  (`TextField`, `NumberField`, `TextareaField`, `SelectField`, `CheckboxField`) carrying
  identity, `label`, `description`, `errors`, `invalid`, `value`/`onChange` and `onBlur`.

  This fixes HeroUI, where a field is a React Aria **context**: `Label`, `Description` and
  `FieldError` must be children of `<TextField>` to receive ids, `aria-describedby` and
  validation state. The HeroUI kit now renders HeroUI's documented anatomy — including its
  real `FieldError` instead of a hand-rolled stand-in — and drops the CSS `order` hacks that
  were reordering the checkbox layout. The shadcn kit keeps its sibling layout behind its own
  internal `FieldShell`.

  The consumer API is unchanged: `form.TextField` and friends work exactly as before. Only
  custom kits need updating.

- 8b845e0: Add the `@ez-kit/form-*` packages: TanStack Form with dependency-injected UI kits.

  `createForm({ components })` returns a `useForm` that is a superset of TanStack Form's —
  the instance carries flat, fully-wired field components (`form.TextField`,
  `form.NumberField`, `form.TextareaField`, `form.SelectField`, `form.CheckboxField`) plus
  `form.SubmitButton` and `form.Form`, while the entire native API (`form.Field`,
  `form.Subscribe`, `form.handleSubmit`, `form.state`, `form.AppField`) stays available on
  the same object. Each field renders its own label, description, input and error text, and
  `name` is narrowed to the paths whose value type fits the field.
  - `@ez-kit/form-core` — field kinds, `SelectOption`, validator-error normalisation.
  - `@ez-kit/form-react` — the DI contract and field layer, with zero visual styling.
  - `@ez-kit/form-shadcn` / `@ez-kit/form-heroui` — the two UI-kit implementations.

  Validation is pure pass-through of TanStack Form's native standard-schema validators
  (zod / valibot / arktype); there is no custom resolver.

- 03073ed: Lay a checkbox field out as `[control] Label` on one row.

  The shared field frame renders chrome in one fixed order — label, description, input, error — which is right for every field except a checkbox, where it left the control stranded under its own label. Both kits now reorder that case themselves, with description and error keeping a full row beneath.

  `FieldRootProps` declares the `data-field`, `data-field-type` and `data-invalid` attributes it receives, so a kit can branch on the field kind instead of only matching it from CSS.

### Patch Changes

- Updated dependencies [77390a1]
- Updated dependencies [8b845e0]
- Updated dependencies [03073ed]
  - @ez-kit/form-react@0.2.0
