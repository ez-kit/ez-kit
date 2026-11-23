## MODIFIED Requirements

### Requirement: onCancel закрывает форму

`onCancel()` SHALL close the form, invalidate pending form validation/save work and reset values and errors. A late result SHALL NOT write into the dismissed session or a newer session. Cancelling form work SHALL NOT imply server rollback: a dispatched connector mutation continues independently. Existing explicit custom-handler cancellation signals SHALL remain available.

#### Scenario: Отмена во время сохранения

- **WHEN** `onCancel()` is called while `onSave` is still running
- **THEN** the form is closed and completion does not reopen it or write errors

#### Scenario: A newer session is isolated

- **WHEN** another form session opens before the dismissed session's save finishes
- **THEN** the old save result does not modify or close the newer session

## ADDED Requirements

### Requirement: Pending modal actions and dismissal

Built-in form modals SHALL disable Save and Cancel while validation or submission is pending and prevent duplicate submission. The close control SHALL remain available. Escape and backdrop dismissal SHALL have the same form-session behavior when enabled by modal configuration.

#### Scenario: Save and Cancel pending
- **WHEN** the built-in creation or editing modal is submitting
- **THEN** Save and Cancel are disabled and repeated submit does not dispatch another save

#### Scenario: Close while pending
- **WHEN** the user activates the close control during a connected save
- **THEN** the modal closes while the dispatched mutation continues and retains cache-maintenance callbacks

#### Scenario: Configured dismissal
- **WHEN** Escape or backdrop dismissal is allowed and used while saving
- **THEN** it behaves like the close control without implicitly aborting the connected HTTP mutation

### Requirement: Successful connected save does not await automatic list reload

A successful connected save SHALL finish the form without waiting for connector-owned list invalidation/refetch. User-supplied asynchronous mutation lifecycle SHALL retain its native awaited behavior. Subsequent list-load errors SHALL NOT be reported as a failed server save.

#### Scenario: Background reload
- **WHEN** a save and its user lifecycle finish successfully but automatic list reload is still pending
- **THEN** the modal closes and the grid indicates background fetching while keeping existing rows

#### Scenario: Reload fails after save
- **WHEN** automatic list reload fails after successful persistence
- **THEN** the error belongs to list loading and the modal is not reopened as a failed save
