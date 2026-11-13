# Tasks

## 1. Collection entry and executable type contract

- [x] 1.1 Add the query-react collection subpath, build/declaration configuration and independent size entry; verify isolated imports without grid packages and unchanged gate entry exports/budget.
- [x] 1.2 Define source and hook consumer type fixtures for arbitrary params, different per-mode params, item/select inference, independent mutation inputs/results/errors/context and configured-only capabilities; verify positive fixtures and expected failures, including infinite-only, missing reads and invalid modes.
- [x] 1.3 Add the qc-react workspace dependency and bundler external; verify package builds and installed dependency resolution without adding a grid dependency to query-react.

## 2. Sources and shared API conventions

- [x] 2.1 Implement createCollectionSource normalization for fetcher/native reads and mutations; verify native keys/variables survive and incompatible prepareArgs results fail type checking. Document descriptor branches and the callback-variable contract.
- [x] 2.2 Implement createCollectionSourceFactory defaults and operation overrides; verify shared conventions across multiple entities, explicit entity specialization, bare fetchers and whole-options replacement. Add a compiled shared-factory recipe.
- [x] 2.3 Extract generated list/infinite keys and source option access; verify prefetch cache sharing, tenant separation, pageParam/signal exclusion and distinct read families. Document required request-affecting key inputs.
- [x] 2.4 Preserve read transport cancellation and selected-response projections; verify signal forwarding, untouched native cache data and arbitrary DTO argument placement with generated fetcher fixtures.

## 3. Collection reads

- [x] 3.1 Implement useCollectionQuery ordinary reads and native result exposure; verify external params remain untouched, disabled/placeholder/background states remain available and projection references do not cause unnecessary updates. Document controlled params and atomic application-owned resets.
- [x] 3.2 Implement infinite-only and dual-mode execution with stable hook order; verify mode switching, inactive/absent reads, page flattening, retained items on next-page failure and native load-more controls under React 18 and current React. Add an infinite-only recipe.
- [x] 3.3 Verify native selected page types, result.mode narrowing, optional totals and source capability changes through runtime/type tests; document the first-scope undefined infinite total and absence of automatic scroll policy.

## 4. Collection mutations and invalidation

- [x] 4.1 Implement the four fixed mutation slots with prepareArgs inside mutationFn and native results; verify mutate/mutateAsync input types, returned fetcher data, missing-operation typing and explicit deleteMany without single-delete fallback. Document each operation with independent input types.
- [x] 4.2 Verify lifecycle ordering, preparation failure, retry preparation, awaited callbacks and optimistic rollback context; add tests for original input in callbacks and document pure preparation plus DefaultError/registered-error typing.
- [x] 4.3 Extract shared non-blocking success invalidation with source/operation policy precedence; verify false/additional/replace, throwing user callbacks, rejected refreshes, observer unmount and original operation scope during distinct-base-key tenant changes, while preserving explicitly supplied mutation keys. Document per-call callback lifetime versus hook-level invalidation.

## 5. Grid integration and compatibility

- [x] 5.1 Implement adaptCollectionToGrid parameter/action mappings with typed operation capability checks; verify custom params, original entity versus table ID, missing-row handling, shared key identity and both component/hook entry points. Add a compiled same-source list/grid recipe.
- [x] 5.2 Replace grid-local Query observers and mutation execution with shared collection execution plus compatibility descriptors; verify existing source factories/native callbacks still receive prepared variables and preparation is not duplicated. Document existing versus new lifecycle semantics.
- [x] 5.3 Preserve table-owned applied state, atomic resets, fresh-total bounds correction and stable publication; run pagination, draft, mode-switch and retained-table tests, including sources with only the selected read mode. Update relevant connector API documentation.
- [x] 5.4 Preserve explicit action enablement/overrides, form-only transformError, pending save/dismiss behavior and load-more deduplication; run mutation/modal tests and both kit browser flows with original-error and late-session assertions.

## 6. Ordinary-list demonstration and release integration

- [x] 6.1 Deliver a runnable ItemGroup-style CRUD list with external search/paging state, create/update/delete/deleteMany, error/pending states and fresh-total page correction; verify browser interactions and an atomic search reset without an old-page request. Register its docs/API coverage and include complete consumer code.
- [x] 6.2 Extend the checked Orval recipe to demonstrate shared collection conventions and grid adaptation; verify regeneration remains reproducible, generated fetchers require no generated hooks and docs snippets type-check.
- [x] 6.3 Record durable design decisions in ADRs and update AGENTS links, explicitly superseding only affected ownership claims; add query-react/qc-react changesets and verify published dependency ranges, client entry behavior and existing gate isolation tests.
- [x] 6.4 Run affected checks, then the repository-required sequential build/lint/typecheck/test/size gates plus affected React 18 and docs/kit browser suites; record exact outcomes and any environment limitations in validation.md without claiming skipped checks passed.

## Workflow follow-up

- Review and archive only after implementation and validation. Reconcile the completed qc-react-data-grid change before or alongside archive so its connector capability is retained and not overwritten by the new collection capability.
- Verify final main specs describe both the generic collection contract and preserved grid/form behavior.
