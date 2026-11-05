# Contributing

## Prerequisites

- Node.js version from `.nvmrc` (`nvm install && nvm use` if you use nvm)
- `pnpm` at the version specified by `packageManager` in the root `package.json`

## Setup

1. Fork [ez-kit/ez-kit](https://github.com/ez-kit/ez-kit) on GitHub.
2. Clone your fork and add the upstream repository:

```bash
git clone https://github.com/YOUR_USERNAME/ez-kit.git
cd ez-kit
git remote add upstream https://github.com/ez-kit/ez-kit.git
git fetch upstream
git switch -c fix/describe-your-change upstream/develop
pnpm install --frozen-lockfile
```

Use `develop` as the starting point and target for contributions. GitHub's default branch is
`main`, but it tracks published releases and does not accept pull requests.

## Issues

Search existing issues before opening a new one. Use the bug report template for reproducible
problems and the feature request template for proposals. Discuss larger changes in an issue
before implementing them. Write issues, pull requests and commit messages in English.

## Daily workflow

1. Create a branch from the latest `upstream/develop`, as shown above.
2. Implement changes in one or more packages.
3. Run checks:

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:react18
pnpm size
```

Build first: the other checks depend on generated package and documentation files. CI also
runs browser tests for the documentation site and UI kits.

4. If a change affects a published package's behavior or public API, add a changeset:

```bash
pnpm changeset
```

Commit the generated `.changeset/*.md` file with your change. Documentation-only and repository
maintenance changes do not need a package changeset. Do not select `@ez-kit/data-grid-shadcn`:
it ships through the shadcn registry rather than npm. For registry changes that need a release
note, select the package they are visible through, usually `@ez-kit/data-grid-react` or `@ez-kit/docs`.

5. Commit with a Conventional Commit message, such as `fix: correct row selection`, and push your branch:

```bash
git push -u origin HEAD
```

6. Open a pull request from your fork's branch to **`ez-kit/ez-kit:develop`**. Check the base
   branch explicitly because GitHub may suggest `main`. Describe the change and how you checked
   it, link related issues (for example, `Closes #123`), and complete the PR template.

## Package conventions

- Export public API only through `src/index.ts`.
- Keep each package `ESM-only`.
- Include tests for happy-path and key edge-cases.
- Add examples to package `README.md` and docs app when API changes.
