# data-grid-filter-input Specification

## Purpose
Define consistent commit timing and cancellation for built-in data-grid filter inputs, so visible input, table drafts, and explicit filter commands remain coordinated across UI kits and filter surfaces.

## Requirements

### Requirement: Built-in scalar inputs share one timing policy

Built-in inputs resolved as `text` or single-value `number`, and global search, MUST follow the same commit policy in both shadcn and HeroUI. This MUST cover header filters, filter panels, standalone filters, and `filtering.fields`, whether a scalar editor comes from the standard registry or the fallback input.

#### Scenario: Registered text editor respects timing

- **WHEN** a standard text filter is rendered by either kit with `filtering.debounce: 300` and the user types `Ann`
- **THEN** the input displays `Ann` immediately and the non-draft filter is committed only after the configured pause

#### Scenario: Filter field follows its column counterpart

- **WHEN** a server-only text filter field is rendered in a standalone filter or panel
- **THEN** its commit timing follows the same policy as a text column filter with the same configuration

### Requirement: Non-draft typing uses the configured trailing delay

Without `draft`, each edit in an eligible input MUST replace its pending commit with the latest value and restart the configured delay. Target-level `filtering.debounce` MUST override the table setting; global search MUST use its own override or inherit the table setting. The default MUST remain 250 ms, and `0` MUST commit without a timer.

#### Scenario: Rapid typing produces one commit

- **WHEN** the user types `A`, `An`, and `Ann` less than 250 ms apart with default timing
- **THEN** no intermediate value is committed and exactly one commit of `Ann` occurs 250 ms after the final edit

#### Scenario: Target and search overrides remain independent

- **WHEN** table debounce is 300 ms, a target overrides it to 800 ms, and global search overrides it to 0
- **THEN** that target waits 800 ms, another eligible target waits 300 ms, and global search commits each edit immediately

### Requirement: Keyboard deletion follows typing timing

Erasing an eligible input with the keyboard MUST use the same commit delay as typing, including an empty value. Replacing an erased value before the delay expires MUST prevent an intermediate empty-filter commit.

#### Scenario: Replacing a number does not commit an intermediate clear

- **WHEN** the user erases `100`, types `200` before the configured delay expires, and pauses
- **THEN** only the final numeric value `200` is committed after the pause

#### Scenario: Leaving a text input empty removes the filter after the delay

- **WHEN** the user erases a text filter and leaves the input empty
- **THEN** the filter is removed after the configured delay rather than on the deletion keystroke

### Requirement: Draft input has no additional commit delay

With `draft: true`, eligible input changes MUST update the table draft immediately, irrespective of the configured debounce. Editing MUST NOT emit the deferred query through `onStateChange` or per-axis callbacks. Apply MUST retain the existing combined-query notification behavior.

#### Scenario: Text and number are immediately pending

- **WHEN** the user changes a text filter, a single-number filter, or global search in a draft grid with debounce 800 ms
- **THEN** the latest parsed value is immediately readable from the table draft and the draft is dirty without an outward query notification

#### Scenario: Apply uses all latest values

- **WHEN** the user changes text, number, and search inputs and immediately invokes the Apply button or `table.draft.apply()`
- **THEN** one applied-state notification contains the latest values across those axes and no delayed input commit makes the draft dirty again

### Requirement: Enter preserves the pending draft

Filter inputs and global search MUST NOT apply the draft or intercept Enter for query application. Apply and `table.draft.apply()` remain explicit application paths.

#### Scenario: Enter leaves typed values pending

- **WHEN** the user types into a text, single-number, or search input and presses Enter in draft mode
- **THEN** the typed value remains in the draft and the applied query is unchanged

### Requirement: Explicit clear and reset cancel pending input

Explicit filter clears and resets MUST immediately cancel pending edits in the affected scope and synchronize mounted inputs to the resulting value. This MUST hold when the stored value was already empty. A target clear MUST NOT cancel unrelated targets; a whole-table reset MUST cancel all pending filter input.

#### Scenario: Same-value search clear wins

- **WHEN** stored search is empty, the user types `Ann` with a pending delay, and code calls `table.setGlobalFilter(undefined)`
- **THEN** search remains empty, the input is cleared immediately, and no later commit restores `Ann`

#### Scenario: Clearing a target preserves another pending input

- **WHEN** two targets have pending edits and one is explicitly cleared through its control, chip, model setter, or column setter
- **THEN** only that target's pending edit is discarded and the other target commits on its own schedule

#### Scenario: Table reset cancels all pending values

- **WHEN** code calls `table.reset()` while text, number, or search edits are pending
- **THEN** mounted inputs show their reset values and waiting beyond every delay produces no stale commit

#### Scenario: Draft reset restores applied values

- **WHEN** code calls `table.draft.reset()` after editing text, number, and search in draft mode
- **THEN** affected inputs and the draft immediately return to the applied values without an outward query notification or later reappearance

### Requirement: External replacement and operator changes supersede pending edits

An external filter replacement or operator change MUST supersede pending edits for the affected target, including a same-value explicit replacement. A pending value for one operator MUST NOT commit under another operator. Routine rerenders and controlled echoes of the input's own commit MUST NOT erase newer typing.

#### Scenario: Operator switch cancels old text

- **WHEN** text is pending for `contains` and the user switches to an operator with `input: 'none'`
- **THEN** the new operator remains selected and the old timer cannot restore or attach its text

#### Scenario: Same-input operator switch also cancels old work

- **WHEN** text is pending and the user switches between two operators with `input: 'single'`
- **THEN** existing operator-transition value rules apply to the stored value and no pending value from the previous operator is later committed

#### Scenario: Controlled replacement wins

- **WHEN** an external controlled value replaces a target while an edit is pending
- **THEN** the input displays the replacement and the pending edit never overwrites it

#### Scenario: Rerender does not restart the pause

- **WHEN** an unrelated grid option or callback identity changes while input is pending
- **THEN** the original edit deadline remains in effect and no duplicate or mount-time commit occurs

### Requirement: Numeric parsing remains with the editor

Single-number filters MUST commit numbers or their existing empty representation, never numeric strings or `NaN`. Intermediate numeric text MUST retain the active kit's editing behavior; applying commit timing MUST NOT add string conversion or a new numeric parser. Filtering changes MUST NOT change number editing or creating behavior.

#### Scenario: Final numeric value preserves its type

- **WHEN** a user enters `12` into a single-number filter and its commit becomes due
- **THEN** the stored scalar value is the number `12`, including inside an operator-bearing value

#### Scenario: Intermediate numeric input stays editable

- **WHEN** the active editor supports an unfinished sign or decimal input while the user builds a valid number
- **THEN** the debounce integration preserves that editor behavior without storing invalid text as a numeric filter

### Requirement: Discrete and custom editors remain immediate

Select, boolean, date, range, multi-select, and custom filtering editors MUST retain immediate value writes, irrespective of `filtering.debounce`. A number range MUST remain a range editor rather than inherit the single-number delay. Custom model consumers MUST retain control of their own timing.

#### Scenario: Range remains immediate

- **WHEN** the user edits a numeric range with a nonzero table debounce
- **THEN** its emitted range value is written immediately

#### Scenario: Custom component is not wrapped in automatic debounce

- **WHEN** a target uses `filtering.component` or a project cell type resolving to a custom editor
- **THEN** its value callback remains immediate and no second delay is added

### Requirement: Unmounted inputs cannot commit later

Unmounting an eligible input MUST cancel its pending commit. Mounting an input MUST NOT write its initial value back into the filter state. A replaced target or editor MUST NOT receive a commit from a previous input instance.

#### Scenario: Closing an unmounted filter discards pending work

- **WHEN** an input unmounts before its delay expires
- **THEN** no later filter update is emitted from that input instance

#### Scenario: Strict Mode mount does not emit a filter change

- **WHEN** a grid with an initial filter mounts under React Strict Mode
- **THEN** mounting and effect replay do not emit a filter commit
