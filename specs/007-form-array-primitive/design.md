# Design: a headless array primitive for the form TSX API

**Status:** agreed, not implemented.
**Depends on:** `specs/005-form-array-fields/design.md`, which this revises. Read it first — the
findings there (keyed identity, the `useFieldGroup` limit, nesting depth) still hold and are not
restated here.
**Cost of delay:** `@ez-kit/form-react` is at `0.3.1` and `ArrayField` is **unpublished** — it ships
in the next release and has zero external consumers. Everything below is free to break today and a
major in every external kit tomorrow.

## The problem

`form.ArrayField` works, but it is a widget with no escape hatch, not a primitive with a default
look. Concretely, its scope hands the author exactly one mutation:

```ts
ArrayFieldScope<TItem> = { items, add, canAdd }
ArrayItemScope<TItem> = FormFieldComponents<TItem> & { key, index, Item }
```

Removal and reordering exist **only** inside the buttons the kit draws within `item.Item`. An
author who wants the remove control in a card heading rather than beside the row cannot have it —
there is no `remove`, no `move`, no `insert` to build against. Three smaller symptoms of the same
cause:

- `addLabel` / `removeLabel` / `itemLabel` are presentational props on a data component.
- `reorderable` means "two up/down buttons" and nothing else. Drag-and-drop, a drag handle, a
  position `<select>` — none are expressible.
- `add` / `canAdd` sit in the scope, yet `ArrayField` still draws the add control itself from
  `addLabel`. Two roads to one action, with no stated winner.

The package already claims the opposite philosophy for everything else: `FormFieldComponents` is
documented as sitting "alongside — never in place of" the native TanStack Form API. For arrays that
claim is false today, since `pushValue` / `removeValue` / `moveValue` exist on the library's field
and nothing in our scope reaches them.

## Decisions

### 1. Two components, one engine

`form.Array` is the primitive: it renders **nothing** but `children(scope)`. Props are behavioural
only — `name`, `newItem`, `disabled?`, `required?`, `validate?`, `children`.

`form.ArrayField` is the default composition: the same props plus the presentational ones
(`label`, `description`, `addLabel`, `removeLabel`, `itemLabel`, `reorderable`). It renders the
kit's `ArrayField` slot around `children` and draws the add control itself.

Both stand on one internal engine owning keyed identity, path prefixing and mutations. The engine
is **not** exported: binding a new consumer to it is not a supported extension point, and exporting
it would commit us to its shape.

This is also what settles the "two roads to one action" defect above, and the split has to be
stated rather than assumed: **inside `form.ArrayField` the add control belongs to the component.**
The scope still carries `add`, because one scope type serves both components, but calling it there
adds a _second_ trigger — it never replaces or moves the first. An author who wants the only add
control somewhere else is asking for the primitive, and that is the answer they get.

_Rejected — one component whose chrome is entirely scope-delivered._ Tidier on paper: the outer
frame is `label` / `description` / `errors`, which every field in the package has, so it is not
array-specific and could always render. Rejected because the boundary between "this component has
an opinion" and "this one does not" is worth more than the saved export, and a reader should not
have to know which props silently switch a component between two modes.

_Rejected — a `useArrayField` hook as the primitive._ `specs/005` prototype P1 measured why: a hook
that hands back an item scope freezes its API on first render, and a stale scope writes a phantom
array element. The render-prop shape is what makes the per-entry component set rebuildable.

### 2. The mutation vocabulary is indexed, and the raw field is the escape hatch

```ts
type ArrayScope<TItem> = {
	items: readonly ArrayItemScope<TItem>[]
	add: () => void // appends newItem; see the note below on why it takes nothing
	insert: (index: number, value?: TItem) => void
	remove: (index: number) => void
	move: (from: number, to: number) => void
	canAdd: boolean
	errors: string[]
	invalid: boolean
	Button: FormComponents['Button']
	field: AnyFieldApi
}

type ArrayItemScope<TItem> = FormFieldComponents<TItem> & {
	key: string // never the index — see specs/005
	index: number
	isFirst: boolean
	isLast: boolean
	remove: () => void
	moveUp: () => void
	moveDown: () => void
	Item: (props: ArrayItemProps) => ReactNode
}
```

`move(from, to)` is what makes drag-and-drop expressible; `isFirst` / `isLast` exist so a kit
disables a control by asking one question rather than correlating an index with a length. The item
members are sugar over the indexed ones, documented as such.

_Rejected — `swap`, `replace`, `clear`._ `swap` is `move`; `replace` is a write to the field at a
path, which the author already has; `clear` had no caller. YAGNI.

_Revised during implementation — `add` takes nothing._ It was first specified as
`add: (value?: TItem) => void`, and that shape is unsafe in a way nothing in the types announces.
`add` would then be the only scope member with zero mandatory parameters, so it is the only one an
author can write as `onClick={add}` — and whether that compiles depends on whether `TItem` happens
to be structurally satisfied by a React `MouseEvent`. For `{ firstName: string }` it is a type
error, which is why the hole is easy to miss; for `{ type: string }` — an entry with a "kind"
field, which is an ordinary thing to model — it compiles clean and appends the synthetic event as
an array entry. The same defect bit the package internally: wiring the kit's `onAdd: add` passed
the click event in as the new entry and broke a pre-existing test, and was patched at that one call
site with a wrapper the public surface has no equivalent of.

A runtime guard was rejected: recognising a synthetic event means sniffing `nativeEvent` or
`_reactName`, a heuristic that can false-positive on a legitimate item, and AGENTS.md already
records this repo's position against probing a value instead of fixing the contract.

So the overload goes. `add: () => void` is arity-safe by construction — a handler may pass whatever
it likes and it is ignored. Nothing is lost: appending a specific value is
`insert(items.length, value)`, the two were one operation spelled twice, and collapsing those is
what the paragraph above already does to `swap`. At the time of the decision **no caller anywhere**
— plan, tests or docs examples — passed a value to `add`.

_Rejected — exposing only the raw TanStack field._ It cannot carry `newItem`, cannot carry
`canAdd`, and above all cannot carry **entry identity**: TanStack indexes, and `specs/005`
established that identity must key on the entry. The keys are ours to mint, so the vocabulary that
hands them out has to be ours too.

### 3. Buttons are callbacks, plus the kit's generic `Button`

The primitive's currency is callbacks. For a control that should look native, the scope passes
through `FormComponents['Button']`, which **already exists** in the contract.

_Rejected — splitting `ArrayItem` into per-control slots_ (`ArrayRemoveButton`, `ArrayMoveUpButton`,
…). `FormComponents` requires every member, so any new key is a compile error in every external kit
that wrote `satisfies FormComponents`; after 1.0 each such slot is a major. AGENTS.md records the
same finding for `FullGridComponents` and the same remedy: compose from generic primitives, never
add a slot named for the feature that prompted it.

### 4. The kit's own row stays reusable from the primitive

`item.Item` is available in the bare `form.Array` too, not only in the composition. An author can
bring their own outer layout and still use the kit's native rows, or ignore `Item` entirely and
draw everything. `ArrayField` and `ArrayItem` are **already** contract slots, so this costs zero
new keys and zero work in either kit — it is a pass-through of what is already there.

In the primitive, `Item` takes its presentational props from the author (`label`, `removeLabel`,
the reorder captions) and falls back to the kit's defaults, since there is no outer component
holding them.

_Rejected for now — a kit-level friendly facade_ (`@ez-kit/form-shadcn` exporting `ArrayRow` /
`ArrayAdd`). The kit's components currently take contract-shaped prop bags (`data-index`,
`onMoveUp`, pre-resolved captions), so a usable export needs a hand-written facade **per kit** —
real work, duplicated twice, for a gap `Item` may well close. Revisit only with a concrete case
`Item` cannot serve.

_Rejected — parameterising the composition_ (`ArrayField` taking `renderItem` / `renderAdd`). It is
a second configuration axis layered on a render prop that already exists, and the case it serves
("everything as the kit does it, but the bin in the heading") is served by the primitive plus
`Item`.

### 5. No error-rendering component

`errors` and `invalid` reach the scope as **data**. Nothing renders them for a bare `form.Array`.

_Rejected — a generic `Message` slot in the contract._ Considered and dropped: it grows a contract
that AGENTS.md's precedent says should grow only under pressure, and the pressure here was
self-inflicted — the question "who renders the list's errors" only exists because the primitive
renders nothing, which is the point of the primitive.

**The known footgun, stated rather than fixed:** an author who never renders `errors` gets a
`minLength` failure that blocks submit with nothing on screen. This is the cost of a headless
primitive. Address it in the docs, and consider a development-only warning when the list is invalid
and the author never read `errors` — that check is cheap to get wrong, so it is a follow-up, not
part of this change.

## What does not change

The schema path. An `array` node still renders through `form.ArrayField`, producing the same DOM.
`ArrayFieldRenderProps` and `ArrayItemRenderProps` are untouched, and `FormComponents` gains no
key. The existing browser specs and docs examples must therefore stay green **without edits** —
that is the regression proof that the composition did not drift.

## Testing

Red first, per the repo's TDD rule.

- `form-react` unit: each mutation, and entry identity surviving `move` / `remove` / `insert`.
  `insert` has no coverage today because it does not exist.
- Both kits: `Item` rendered from the bare primitive carries the same slots and captions it carries
  from the composition.
- Browser, both kits: one new spec driving a custom layout through the primitive — the remove
  control in a card heading, which is exactly what is impossible today. The seven existing array
  specs must pass unchanged.

## Docs

`arrays.mdx` gains a "Custom layout" section and a third example, registered in **both**
`manifest.json` and `registry.ts`. `page-type-map.ts` gains entries for `ArrayScope` and
`ArrayItemScope` with exact counts.

## Out of scope

Drag-and-drop in the package. `move(from, to)` makes it expressible; pulling a dnd library into
dependencies to demonstrate it is the application's business, not ours.

## Checked while agreeing the design: there is no form-instance context

A reusable list built on the primitive — a kit's `ArrayTable`, an application's `MembersTable` —
needs to reach `form` in order to render `form.Array`. The package has **no context carrying the
form instance**: the contexts that exist are `ArrayKeyOrderContext` (an array's current key order,
which is what re-renders a scoped field through a `memo` bail-out), `OptionSourceContext` and
`SchemaTranslateContext`.

When this was first written the array context was `ArrayItemPathContext`, carrying an entry's path
prefix. Implementation replaced it: that provider wrapped only `<item.Item>`'s children, so a field
the author drew outside the row resolved no path at all — which the headless primitive makes the
normal case, not the exception. A field now reads its path from the per-entry-key record the array
body builds, and the remaining context exists solely to make that read happen again when the order
changes. The conclusion above is unaffected; only the enumeration changed.

So such a component takes the form as a prop, the way anything outside the `<Form>` render prop
already does. That works today and stays type-safe; `name` is still checked against `TFormData`
through `DeepKeysOfType`.

Adding a form-instance context so the call reads better is a **separate decision and out of scope
here.** It would touch every field component, not just arrays, and it trades a prop for an implicit
dependency that makes a component's requirements invisible at the call site. Worth its own
discussion if prop-drilling the form turns out to hurt in practice.
