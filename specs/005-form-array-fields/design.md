# Design: Array fields for `@ez-kit/form`

**Date:** 2026-09-15
**Status:** Implemented in `core` and `react`; kits, docs and e2e in progress. Five prototypes run.
**Scope:** `packages/form/core` (schema, rules, validate, visibility, walk),
`packages/form/react/react` (contract, JSX API, renderer),
`packages/form/react/{shadcn,heroui}` (two new slots)

## Goal

Ship repeatable field groups — a list of sub-forms the user can add to, remove from and
reorder — through both authoring paths (JSX and `FormSchema`), **before the 1.0 cut**.

## Why this is a 1.0 blocker, not a feature request

Arrays are the largest functional gap in the form packages: `FormFieldType`
(`core/src/field-types.ts:8`) has 12 kinds and none of them is a repeatable group, and
`rules.ts:1` already _reserves_ `./`-prefixed refs "for arrays" while `assertAbsolute`
throws on them today.

But the reason it must land before the majors is that arrays touch the **public surface in
six places**, each of which is a breaking change afterwards:

1. `FormComponents` (`react/react/src/contract.ts:292`) — a flat, fully-required map. Every
   field kind _is_ a slot, there is no optional tier and no kit-owned registry, so adding
   `ArrayField` / `ArrayItem` later breaks every external kit that wrote
   `satisfies FormComponents`. (Contrast data-grid, which has `FEATURE_OPTIONAL_COMPONENTS`
   and moves new cell types into the kit's own registry — see AGENTS.md.)
2. `FormFieldComponents` (`react/react/src/field-props.ts:220`) — same property, 15 required
   keys, and it is what `RendererForm` intersects with.
3. `walkNodes` (`core/src/walk.ts`) — its visitor signature has to carry a path prefix.
4. `NamedRule` (`core/src/validate.ts`) — `(value, values) => true | string` cannot point at
   an offending item.
5. `FieldValidate.rule` — a single string, so one rule per node.
6. `stripHiddenValues` — its top-level-only behaviour stops being acceptable (see D6).

## Non-goals

- No new field _kinds_ beyond the array container (file, time, otp, rating stay out).
- No drag-and-drop reordering UI. The contract exposes move handlers; the gesture is the
  kit's business.
- No virtualization of long lists.
- No server-driven pagination of array items.

## Prototype findings

Two throwaway prototypes were run in `packages/form/react/react` and deleted; this section is
the record, since the conclusions drove two decisions.

### P1 — runtime: can an item scope ride on `useFieldGroup`?

**No.** `useFieldGroup` builds its API once and never rebuilds it:

```js
const [formLensApi] = useState(() => new FieldGroupApi(opts))
```

There is no `prevOptions` comparison, and `FieldGroupApi` exposes no `update` — `fieldsMap`
is assigned in the constructor. Its two neighbours _do_ handle a changing path:
`useFormGroup` recreates `FormGroupApi` when `opts.name` changes, and `useField` recreates
`FieldApi` when `opts.name` changes. `useFieldGroup` is the only one of the three that does
not — and the only one with `getFormFieldName`.

Measured, with three items and the middle one removed:

| Variant                                               | Result                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. `useFieldGroup`, dynamic `fields`, `key`=stable id | paths become `['people[0].firstName', 'people[2].firstName']` — the survivor still points at a slot that no longer exists. Editing it wrote a **phantom element**: `{"people":[{"id":"a",…},{"id":"c","firstName":"Виктор"},{"firstName":"!"}]}`. React also logged `changing a controlled input to be uncontrolled`. |
| B. own prefix + `form.Field`, `key`=stable id         | paths `['people[0].firstName','people[1].firstName']`, local component state follows its own item, the edit lands on the right person. **Correct.**                                                                                                                                                                   |
| C. own prefix + `form.Field`, `key`=index             | paths and form values correct, but the deleted item's local state leaked onto the survivor's row: `['', 'локальное-БОРИСА']` where `'локальное-ВИКТОРА'` was expected.                                                                                                                                                |

C is the important negative: **form values look right**, so the defect is invisible to a
submit-level test and shows only in control-local state (an open calendar, a searchable
select's query, caret position). This is why RHF's docs forbid `key={index}` outright.

### P2 — types: does a scoped API type-check?

**Yes, cleanly.** `tsc --noEmit` passed on the whole proposed API including a nested array,
with seven negative cases guarded by `@ts-expect-error`. A control experiment (a deliberate
typo plus a deliberately unnecessary directive) produced exactly `TS2820` and `TS2578`,
proving the check was real rather than the file being skipped.

Two helper types are the whole mechanism:

```ts
type ArrayKeys<T> = DeepKeysOfType<T, readonly unknown[]>
type ItemOf<T, N> = DeepValue<T, N> extends readonly (infer U)[] ? U : never
```

The resolved key union is small and readable — from the control run's error text:
`` "firstName" | `tags[${number}].label` ``. `age: number` is correctly excluded, and the
nested array expanded itself. **We write no template-literal types**; that work stays inside
TanStack's `DeepKeysOfType`, where it is already exercised.

Compile cost, on a type with 130 fields across four arrays of 24 fields each: package
baseline `tsc` **2.89 s**, with the prototype **3.10 s** — ~7%. The union-explosion worry
does not reproduce. (It was a real worry about the _rejected_ `item.field('…')` design, which
would have composed template literals on our side at every call site.)

### P3 — schema: does a distributive `ArrayNode` hold up against the real `FormNode`?

**Yes.** `schema.ts` was temporarily patched (`'array'` added to `RESERVED_NODE_TYPES`,
`ArrayNode` added to `FormNode`) and exercised from a throwaway file; both were reverted and
`dist` rebuilt from the original.

Passing clean: two top-level arrays each containing a nested array; an array inside a section
inside a step; and a four-level chain of nested arrays. Six negative cases all fired — a
non-array `name`, a typo'd array `name`, a number-typed path in a text field, a typo inside an
item, a root-level field referenced from inside an item, and an array `name` belonging to a
_different_ array's item type. A control run (deliberate typo + deliberately unnecessary
directive) produced exactly `TS2820` and `TS2578`.

Cost, measured: `form-core` typecheck **2.15 s** baseline vs 2.06–2.39 s patched — inside the
run-to-run variance, no measurable cost. `form-react` typechecked against the patched core
**3.12 s** vs **2.89 s** baseline. So low single digits, and the same caveat applies: the spread
between repeat runs was of the same order, so treat it as "no blow-up" rather than as a precise
number. The recursion worry from the design discussion did not reproduce.

`form-core`'s 135 tests stayed green with `'array'` in `RESERVED_NODE_TYPES`.

One thing the run revealed by _not_ failing: widening `FormNode` produced **no compile error
anywhere in the renderer**. The guard is at runtime — `render-node.tsx:396`'s `default` throws
`Unknown node type`, and its comment anticipates exactly this. So a half-finished array node
fails loudly rather than silently, but nothing at the type level forces the renderer to be
updated.

### P4 — how deep and how wide can a TS-authored schema go?

P3 tested four levels because four seemed like plenty, which is not the same as knowing where
the limit is. So the limit was looked for, with the typo moved to the **deepest** node each
time — a passing run otherwise cannot distinguish "still checking" from "quietly gave up".

| Shape                                                                 | Result                                                               |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Nesting depth 4, 6, 8, 10, 12, 16, **20**                             | Typo at the bottom caught at every depth; `tsc` flat at ~2.0–2.4 s   |
| 5, 10, 20, **40** sibling arrays, each 3 levels deep (**120 arrays**) | Clean, typo at the bottom of the last one caught; flat at ~2.0–2.4 s |

TanStack imposes no depth counter of its own — `util-types.d.ts` has no `Prev`/depth guard — so
the only bound is TypeScript's own instantiation limit, and neither axis reached it. The times
stay flat because instantiation is **lazy**: `FormNode<ItemOf<…>>` is only expanded where a
literal actually forces the check, so the recursive alias never materialises as a whole.

The practical reading: three levels of nested repeatable groups is already an exotic form, and
the type system stops being the binding constraint long before authoring does. **No helper is
needed to keep typing working at depth**, and building one now would be speculative.

Two things this did _not_ measure, stated so nobody reads more into it than is there:

- **The IDE.** `tsc` batch-checks; the language server also computes completions, which has a
  different cost profile. A 120-array form may autocomplete slowly while `tsc` stays fast.
- **Runtime.** Depth is free at the type level; it is not free for `walkNodes` recursion or for
  render depth, and a BDUI document is not bounded by an author's patience. That is what open
  question 1 is actually about — untrusted input, not types.

If a wall is ever hit, the escape hatch is option B from the design discussion
(`defineFormItem<TItem>()`): giving TS an explicit anchor type breaks the recursion at that
point. It is deliberately **not** being built now for this reason — but it may get built anyway
for an unrelated one, namely reusable sub-schemas (one `address` block shared by three forms),
and if it is, it covers this case for free.

### P5 — `defineFormItem`

Prototyped rather than assumed, because the sketch in the design discussion had two things
wrong with it.

```ts
export function defineFormItem<TItem, TCustom extends string = never>() {
	return <const C extends FormNode<TItem, TCustom>[]>(children: C): C => children
}
```

Both a `const` and a plain spelling were tried and **both compile**. The `readonly` clash that
was expected — `const` inferring a readonly tuple against a mutable `children: FormNode[]` —
does not happen, because the constraint is itself a mutable array type. `const` is kept, to
mirror `defineFormSchema` exactly.

Verified, all clean:

- the result drops into an array node's `children` (both spellings);
- one `personFields` block is reused across **two different form types**, and twice within one
  form (`staff` and `guests`);
- inserting a `Person` block into a `Company[]` array is a compile error;
- a typo inside the block is a compile error;
- inserting the block into a **`section`** is a compile error.

That last one is the correction. The design discussion justified this helper partly as
"reusable sub-schemas — one `address` block shared by three forms", which claims more than it
delivers: the block's names are **item-relative**, so it composes only where item-relative names
are expected, i.e. into an array item. Mounting a shared fieldset at a nested non-array path
(`address.city`) is a different feature — a group-at-path node — and is **not** in scope. The
good news is that the limit is enforced by the type rather than discovered at runtime.

So the accurate scope is: **reuse of an array item's field set**, across forms and across
arrays, plus the depth escape hatch it was originally proposed for.

## Prior art

Checked against current docs rather than memory:

- **React Hook Form** composes strings (``register(`people.${i}.firstName`)``) and **bans
  bracket syntax** — `test[0].firstName` is documented as wrong, "for TypeScript
  consistency". Keys must be `field.id` (`field.key` in v8); `key={index}` has its own
  red-flag block.
- **`@hookform/lenses`**, RHF's official companion, exists _because_ string composition loses
  types and blocks reusable sub-forms. Its answer is scoping: a child takes `Lens<Actor>` and
  does not know its own path.
- **Ant Design** `Form.List` addresses items by tuple relative to the list
  (`name={[field.name, 'first']}`), nests by composing tuples, keys by `field.key`, and puts
  **array-level** validator output in a separate `<Form.ErrorList>`.
- **TanStack Form** itself offers both: string composition, and `useFieldGroup` with
  ``fields={`linked_accounts[${i}]`}`` — the latter being what P1 disqualified.

The convergence across three of the four is _relative addressing inside an item scope_. We
follow that, and follow RHF/AntD rather than TanStack on keys.

## Decisions (locked)

**D1. Two new contract slots: `ArrayField` and `ArrayItem`.**
Mirrors the existing `Section` / `GridItem` container-plus-item pair. `FormComponents` goes
17 → 19, `FormFieldComponents` 15 → 17; both kits implement before the cut. Composing the UI
out of `Section` + `GridItem` + `Button` was considered and rejected: `Section` carries
title/description/columns semantics that do not fit, and an item needs a remove affordance
positioned within itself, which a generic container cannot place.

**D2. `ArrayField` receives its own `errors` / `invalid`, separate from item field errors.**
Follows AntD's `Form.ErrorList` precedent. This is where `minLength` / `maxLength` and
cross-item rules surface.

**D3. `ArrayItem` carries reorder from the start**, behind `reorderable` on the array node:
`onRemove`, plus `onMoveUp` / `onMoveDown`. Adding props to a slot after 1.0 is breaking for
a kit with a strict signature, so the shape is settled now even though no kit must draw the
handles.

**D4. The JSX API scopes components; it does not compose names.**

```tsx
<form.ArrayField name='people'>
	{({ items, add }) =>
		items.map((item) => (
			<item.Item key={item.key}>
				<item.TextField
					name='firstName'
					label='Имя'
				/>
			</item.Item>
		))
	}
</form.ArrayField>
```

`name` inside an item is a plain `DeepKeysOfType<TItem, …>` union — no path composition at
the call site. Nested arrays (`item.ArrayField`) fall out for free, which is why nesting is
**allowed** rather than rejected by the parser.

**D5. The scope is implemented with our own prefixing over `form.Field`, not with
`useFieldGroup`.** P1 is the reason. `useField` handles a changing `name`, which P1 also
proved, so the item's components recompute `` `people[${index}].firstName` `` per render and
hand it to `form.Field`. Side benefit: no new `as unknown as` (one already exists for
`useFormGroup` at `schema/form-wizard.tsx:76`).

**D6. Item children declare item-relative names, typed as a distinct node subtree.**
This knowingly breaks the invariant recorded at `use-step-fields.ts:20` ("names are always
full paths from the root — nesting never rewrites them"). The break is confined to an
`ArrayItemNode` subtree whose `name` is typed over `TItem`, so a relative name cannot be
written outside an item or vice versa.

The real work is not renaming: **four collectors assume one schema node = one form field, and
an array makes it 1:N with N known only at runtime** —
`visibility.ts:13`, `visibility.ts:24`, `collectChecks` in `validate.ts`, and
`use-step-fields.ts:20`. In particular `buildValidator` computes `checks` once, _outside_ its
`validate` callback; for arrays that expansion must move inside, where `values` is known.

`stripHiddenValues` becomes recursive as part of this. It is top-level-only today and that is
deliberate and tested (`visibility.test.ts:54-56`: a hidden `company.inn` survives because
`company` is not "owned"). With arrays everything inside an item is nested by construction,
so a condition-hidden item field would always leak into the submit. Fixing it also fixes the
`company.inn` case; the existing test is rewritten.

**D7. Conditions inside an item use the reserved `./` prefix.**
`compileCondition` gains an optional base path; `./type` resolves against `people[3]`, while
an absolute ref still reaches the form root. No `../` — one form of relativity, one meaning.
`rules.ts:74` already throws a named error for these, so the error message is the spec.

**D8. Cross-item validation ships in 1.0.** Earlier deferred; that was wrong. A rule on the
array node already receives the whole array as its `value`, so uniqueness works today with no
new API. Three small widenings are what make it complete, and each is a major after 1.0:

- `NamedRule` returns `true | string | { path: string; message: string }[]`, so a rule can
  point at the offending item instead of only the container.
- `FieldValidate.rule` becomes `string | string[]` — two rules on one array are currently
  inexpressible. Matches the repo's scalar-or-object house style.
- `runConstraints`' early `isEmpty` return must not skip a rule on an empty array
  (`isEmpty([])` is `true` by design, for `required` on a multi-select).

**D9. Array-level length uses the existing vocabulary.** `FieldValidate.minLength` /
`maxLength` already measure "entries of a list" and `validate.ts` already renders the unit as
`items`. No new option names.

**D10. A new item's value is derived from the item subtree's `defaultValue`s.** No `newItem`
option unless custom fields from the registry prove underivable.

**D11. Stable per-item keys, never the index, and never inside form values.**
`item.key` matches RHF v8's `field.key` and AntD's `field.key`. The ids live in a ref keyed to
the array's identity and are maintained across push/remove/move — they must not reach the
submitted payload.

**D12. Paths are not part of the authored surface.** With D4 the author writes `'firstName'`
and we build the full path, so the dot-vs-bracket question never reaches a consumer. Internally
one spelling; `getValueAtPath` already normalises `[n]` → `.n` (`rules.ts`).

**D13. The schema node is the distributive `ArrayNode` (option A), validated by P3.**
The spelling matters: the union must be distributed through a helper whose checked type is a
**naked type parameter**, because `ArrayKeys<TValues> extends infer N ? …` does not distribute.

```ts
type ArrayKeys<TValues> = DeepKeysOfType<TValues, readonly unknown[]>
type ItemOf<TValues, N> = NonNullable<DeepValue<TValues, N>> extends readonly (infer U)[] ? U : never

type ArrayNodeFor<TValues, N extends ArrayKeys<TValues>, TCustom extends string> = N extends unknown
	? CommonProps<TValues> & {
			type: 'array'
			name: N
			reorderable?: boolean
			validate?: FieldValidate
			children: FormNode<ItemOf<TValues, N>, TCustom>[]
		}
	: never

export type ArrayNode<TValues, TCustom extends string = never> = ArrayNodeFor<TValues, ArrayKeys<TValues>, TCustom>
```

Options B (`defineFormItem<Person>()`), C (untyped inside the item) and D (an `arrayNode()`
builder) are rejected now that A measures clean: B and D cost authoring ergonomics, and B and C
give up the `name`-to-item-type correlation that is the whole point.

**D14. `isFieldNode` splits into three predicates.** It is built on "a node is either a
container or a field"; an array node is **both** — it has `children` _and_ a `name` _and_ a
`validate`. Left as is, `'array'` in `RESERVED_NODE_TYPES` makes `isFieldNode` return false,
and `collectChecks` skips the node — so D8 and D9 would silently never run. Replace with
`hasChildren` (section | step | array), `hasValue` (anything with a `name`, arrays included) and
`isLeafField` (`hasValue && !hasChildren`, what `isFieldNode` pretends to be today). The four
collectors of D6 each move to the right one — the same set of call sites the prefix work
touches.

**D15. The node carries `children` flat; only the captions are grouped.**
`{ type: 'array', name, children, reorderable?, validate?, item?: { label }, add?: { label }, remove?: { label } }`.
Flat `children` makes the node structurally identical to `section`/`step`, so `hasChildren`
needs no special case and `walkNodes` needs only the prefix. The three captions are grouped
because they are three spellings of one concern, per the house style in AGENTS.md.

**D16. An array inside a step keeps an absolute `name`.** Field names inside a step are already
absolute regardless of `StepNode.path` (`use-step-fields.ts:20`), so arrays follow the same
rule and there is no interaction to resolve. Worth recording that `path` remains close to
decorative in v1 — `schema.ts:260` describes it as the seam for future group-level validators —
so this work neither uses nor changes it.

**D17. `defineFormItem` ships alongside the array node, not later.**
Shape and limits per P5; `const` spelling, mirroring `defineFormSchema`. Two jobs: reuse of an
item's field set, and an explicit type anchor if anyone ever hits a recursion wall (P4 found
none up to 20 levels / 120 arrays, so the second job is insurance, not a current need).
It is **array-item-only** by construction — a shared fieldset at a nested non-array path stays
out of scope. Exported from `@ez-kit/form-core` and re-exported by the kits beside
`defineFormSchema`, since it is part of the same authoring surface.

**D18. `parseFormSchema` does not cap nesting depth.**

Measured first. `JSON.parse` is not a gate at all — V8 parses iteratively and swallows 100 000
levels. The recursive `assertNodeShape` (`parse.ts:148`) overflows the stack somewhere between
3 000 and 6 000 levels, and **non-deterministically**: in the same run depth 6 000 failed while
10 000 passed, because stack usage varies with frame size and JIT state.

A cap was still rejected, because the threat does not exist. `parse.ts:654` states the document
is "delivered by a backend as BDUI payload" — it is your own backend's response, not another
tenant's user-generated content. Anyone able to make it 4 000 levels deep already controls the
backend and has better options than crashing a tab. The one semi-plausible source is a
schema-generating script with a broken base case, which fails on its first run in development.
Real forms do not exceed three levels (P4).

The `pattern`/ReDoS precedent (`validate.ts:28-37`) was considered and **does not transfer**,
though it is the obvious thing to cite. A ReDoS regex is twenty innocuous-looking characters
that a developer can write **by accident** and cannot spot by eye; 4 000 levels is 160 KB of
visibly broken JSON. Removing `pattern` from the format was cheap insurance against a subtle
accident. A depth cap is an arbitrary number guarding against nothing.

So: the document's **content** is untrusted — rule names, source keys, regexes, everything the
parser already checks — while its **shape** comes from the same backend that serves the rest of
the page.

Recorded as a decision rather than left as a gap, so the unguarded recursion in
`assertNodeShape` is not re-reported as a finding later. If the failure mode ever does matter,
the fix is an iterative traversal with an explicit stack — no limit, no overflow — not a magic
constant.

What this does **not** address is fan-out, which is data-driven and genuinely real: three
levels at a hundred items each is a million rendered fields. See
`specs/006-form-render-scale/notes.md`.

## Defect found along the way

`buildValidator` emits `path: check.name.split('.')` (`core/src/validate.ts`). For
`people[1].firstName` that yields `['people[1]', 'firstName']`, while Standard Schema expects
`['people', 1, 'firstName']` — TanStack would not map the issue onto the field and the error
would silently not render. Harmless today because array paths cannot exist; it must be fixed
as part of this work, reusing the normalisation already written in `rules.ts` and coercing
numeric segments to `number`.

Separately, two lists of node types are maintained independently and both must gain `'array'`:
`RESERVED_NODE_TYPES` (`core/src/schema.ts:11`) and `BUILT_IN_OR_CONTAINER_TYPES`
(`react/src/schema/render-node.tsx:65`). They already disagree — `'step'` is in the first and
not the second — and nothing ties them together.

## Known edge to handle

`ItemOf` as written collapses to `never` for an **optional** array: `people?: Person[]` makes
`DeepValue` return `Person[] | undefined`, which fails the `readonly (infer U)[]` branch, and
`item.TextField` would then accept nothing. Needs `NonNullable` and a test. Same for
`readonly Person[]`. Not covered by P2.

## Open

1. Whether `parseFormSchema` should cap nesting depth for BDUI documents. P4 removed the type
   angle — 20 levels and 120 arrays cost nothing — so this is purely about untrusted input:
   `walkNodes` recursion and render depth on a document no author had to type out.
2. The exact new `walkNodes` visitor signature — settled in shape by D6/D14, not yet written.

## What implementation changed about the plan

Recorded because three of these were wrong in a way that would mislead a reader of the decisions
above.

**D14 over-stated the problem.** No rename was needed and nothing broke. Once `'array'` joined
`RESERVED_NODE_TYPES`, `isFieldNode` became _correct_ for its real meaning — "a node that holds a
value and has no children" — because a container is excluded automatically. What was actually
needed was two **additions**, `isArrayNode` and `hasValue`, and moving each call site onto the
right one. The public predicate keeps its name and its behaviour.

**D6's `walkNodes` signature change was not needed either, and would not have helped.** The
ancestor chain is already passed, so a caller can see the arrays it sits under. But the real
problem is not naming: one `array` node stands for N field instances, and N is a property of the
_values_. A static walk cannot expand that whatever its signature. So `walkNodes` is untouched —
no breaking change — and a second primitive, `walkInstances(schema, values, visit)`, does the
value-aware traversal that validation, visibility and stripping all needed. Its visitor may
return `false` to prune, which is how visibility evaluates a container's `when` **while
descending** rather than re-deriving each ancestor's item scope afterwards.

**There were six collectors, not four.** The four named in D6 were the ones visible from
`form-core`. Two more turned up only by running the thing:

- `schemaDefaultValues` (`react/src/schema/form-renderer.tsx`) seeds `defaultValues` from every
  field node's `defaultValue`. With an array it wrote the entry's **item-relative** names at the
  form root, so a schema with `people[].firstName` submitted a phantom root-level `firstName`
  beside the real one. Caught by a test asserting the submitted payload, not by any type.
- `renderChildren` (`react/src/schema/render-children.tsx`) has its own `if`/`else if` chain over
  node types, separate from `RenderNode`'s `switch`. An unlisted type reaches its final `else`
  and throws. That is a **third** independently-maintained list of node types, alongside the two
  already noted below.

**`ArrayNode<unknown>` collapses to `never`.** `ArrayKeys<unknown>` is empty, so the distribution
has nothing to distribute over — which silently removed the array member from
`FormNode<unknown, string>`, the type every traversal and the renderer actually work with. Fixed
with an explicit `unknown extends TValues ? AnyArrayNode : …` arm, the same guard TanStack opens
`DeepKeys` with, plus an exported erased `AnyArrayNode` for runtime code.

**`RenderNodeContext` gained `itemPath`.** A `./` condition needs to know which entry it is
standing in, and a node cannot derive that from itself. Internal type, not exported.

## Slices

1. ✅ `core`: `ArrayNode`, `defineFormItem`, parser rules and scoped name uniqueness, `./`
   conditions, `walkInstances`, recursive `stripHiddenValues`, the validator path fix, the
   predicate additions of D14, and D8's three widenings. 154 tests.
2. ✅ `react`: the two contract slots, the scoped JSX components, stable per-key identities.
3. ✅ `react`: schema renderer support, including `itemPath` for `./` conditions and an entry
   built from the subtree's `defaultValue`s. 169 tests, green on React 19 and React 18.
4. ✅ `shadcn` + `heroui`: both slots in both kits, with adapter-bound tests that assert the
   submitted payload after a middle removal — the P1 case, caught where it actually shows.
5. Docs page + examples for both kits; e2e specs (form had **zero** — `apps/docs/e2e/packages/`
   held only `data-grid/`).

Three gaps were found while implementing — two by the kits, one by the docs — and all three are
settled rather than deferred, because each is a major after 1.0:

- `ArrayItemRenderProps` had no `disabled`, so a disabled list still drew a live remove control
  on every row. It now carries the list's state down to the entry.
- Every caption in the contract is a `ReactNode`, including the three an entry's controls use.
  That is deliberate and unchanged — it matches `label` and `description` on every other field —
  but it has a consequence worth writing down: an `aria-label` takes a **string**, so a kit
  cannot forward a caption to one without narrowing. The better answer, and the one HeroUI took,
  is to render the caption as visually-hidden **content** of the icon button: the control is then
  named by its own contents, a caption that resolved to markup survives instead of being coerced,
  and nothing needs narrowing. shadcn narrows through a shared helper instead. Both are correct —
  the kit owns its markup — and the divergence is the contract working as intended.
- **`max` and `validate.maxLength` were two options for nearly one thing.** `max` stopped the add
  control; `maxLength` produced a message. The schema renderer already derived the first from the
  second, so only a JSX author had to write both — a correlated pair, which is the defect the
  settled-decisions section of AGENTS.md exists to prevent. `max` is gone: `canAdd` is derived
  from `validate.maxLength` on both paths, so the two spellings finally agree and there is one
  option with one meaning. Reaching the bound and exceeding it are the same fact, and a bound the
  user can walk past is not a bound.
- The two reorder controls had handlers but nothing to name them, which left the only
  untranslatable strings in either kit. Rather than adding `moveUpLabel` / `moveDownLabel` beside
  `reorderable` — a flag with two loose props to correlate — `reorderable` became scalar-or-object
  per the house style: `true` keeps its meaning, and `{ up: { label }, down: { label } }` adds the
  captions. The kit still sees only the two resolved labels.
