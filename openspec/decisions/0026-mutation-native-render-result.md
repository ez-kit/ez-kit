# 0026. Mutation renders the native result in every state

- Status: Accepted
- Recorded: 2026-11-05
- Related: [0022-query-gate-native-tanstack](./0022-query-gate-native-tanstack.md)

## Decision

`Mutation` accepts native `UseMutationOptions` through `mutation` and passes the unchanged
`useMutation` result to `children(m)` in every state. Types come from `mutation`. There are no
mutation fallbacks or provider; native `throwOnError` and client defaults retain their behavior.

## Context, rationale and rejected alternatives

The component isolates the subscription from its parent and siblings, like `Query`. An action's
button or form usually needs to remain mounted during pending and error states, so copying the
query gate's replacement fallbacks would discard useful UI and potentially user input. The
render function controls presentation using the native result. A hook that merely forwards to
`useMutation` adds no subscription boundary and does not need a package API of its own.

Guards: `packages/query/react/src/mutation.test.tsx`, `mutation.types.test.tsx` and the separate
registered-error type project cover UI continuity, subscription isolation, native error behavior
and inference.
