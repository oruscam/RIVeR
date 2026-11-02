# Contributing to RIVeR

Thanks for helping improve RIVeR! This guide describes our **release branching strategy**: `main` is the only permanent branch and always holds released code. Every release is prepared on its own `release/X.Y.Z` branch, which acts as the integration branch: feature and fix branches start from it and merge back into it, and once the release is ready it is merged into `main` and tagged.

## Branch overview

| Branch | Purpose | Lifetime | Branches from | Merges into |
|--------|---------|----------|---------------|-------------|
| `main` | Released, production-ready code. Every commit on `main` is a published version tagged `vX.Y.Z`. | Permanent | – | – |
| `release/X.Y.Z` | Integration branch for one release: all its features and fixes land here, then it is stabilized and published. | Temporary | `main` | `main` |
| `feature/*` | New features and enhancements for a release. | Temporary | `release/X.Y.Z` | `release/X.Y.Z` |
| `fix/*` | Bug fixes for a release. | Temporary | `release/X.Y.Z` | `release/X.Y.Z` |
| `chore/*`, `ci/*`, `docs/*` | Maintenance, CI, documentation. | Temporary | `main` and `release/X.Y.Z` | `main` and `release/X.Y.Z` |
| `hotfix/*` | Urgent fix for the released version on `main`. | Temporary | `main` | `main` (and the open `release/*`) |

```
main            ●───────────────────────●───────────────────●────────▶
                 \                     / (merge + tag v3.9.0)         \
release/3.9.0     ●────●─────●────●───●                                \
                   \   / \   /     (stabilize: version, changelog)
feature/fix         ●●    ●●
```

## Naming conventions

- Releases: `release/X.Y.Z` (e.g. `release/3.9.0`), following [Semantic Versioning](https://semver.org/)
- Features: `feature/<issue-number>-short-description` (e.g. `feature/109-camera-calibration`)
- Fixes: `fix/<issue-number>-short-description`
- Chores / CI / docs: `chore/<issue-number>-...`, `ci/...`, `docs/...`
- Hotfixes: `hotfix/short-description`
- Tags: `vX.Y.Z` (e.g. `v3.9.0`)

Use lowercase and hyphens. Reference the related issue whenever one exists.

## Day-to-day workflow

### 1. Starting a release cycle

Maintainers open a release branch from `main` as soon as work on the next version begins:

```bash
git checkout main && git pull
git checkout -b release/X.Y.Z
git push -u origin release/X.Y.Z
```

Contributors should target the release branch of the version their change is meant for (usually the latest open one). If you are unsure which, ask in the issue.

### 2. Developing a feature or fix

1. Fork the repository (external contributors) or clone it (maintainers).
2. Branch from the up-to-date release branch:
   ```bash
   git checkout release/X.Y.Z && git pull
   git checkout -b feature/123-my-feature
   ```
3. Commit in small, focused steps with clear messages.
4. Push and open a Pull Request **targeting `release/X.Y.Z`** (never `main`).
5. CI must pass and at least one maintainer must approve.
6. Maintainers squash-merge the PR into the release branch and the branch is deleted.

Keep your branch current by merging or rebasing `release/X.Y.Z` into it before requesting review.

### 3. Stabilizing the release

Once the planned features are merged, the release branch is frozen for new features:

- Allowed: bug fixes, version bump (`pyproject.toml`, `gui/package.json`, `CITATION.cff`, etc.), [CHANGELOG.md](CHANGELOG.md) update, documentation.
- Not allowed: new features. They wait for the next `release/*` branch.
- Optionally run the experimental build workflow on the release branch to smoke-test installers.

### 4. Publishing the release

1. Open a PR from `release/X.Y.Z` into `main`; merge once approved and CI is green (merge commit, do not squash).
2. The merge triggers the tag workflow, which creates the `vX.Y.Z` tag from `gui/package.json` and starts the build and README link update workflows. It only runs when that version has no tag yet, so merges that don't bump the version are skipped. It fails if `pyproject.toml`, `river/__init__.py` or `gui/index.html` disagree with `gui/package.json`, or if `CHANGELOG.md` has no dated `[X.Y.Z]` entry.
3. Once the Linux, Windows and macOS builds pass, a **draft** GitHub Release is created with the installers and the `CHANGELOG.md` notes. Review it and publish it.
4. Delete the release branch (the tag preserves the history).
5. Start the next cycle by creating the next `release/*` branch from the new `main`.

### 5. Hotfixes

For critical bugs in the released version that cannot wait for the current release:

1. Branch from `main`:
   ```bash
   git checkout main && git pull
   git checkout -b hotfix/short-description
   ```
2. Fix the issue with a regression test, bump the patch version and update the changelog.
3. Open a PR into `main` and merge it; the tag `vX.Y.(Z+1)` and the draft release are created automatically.
4. Merge `main` into the open `release/*` branch so it includes the fix.
5. Delete the hotfix branch.

## Merge rules

- **Feature, fix and chore PRs → `release/*`**: squash merge.
- **`release/*` → `main`** and **`main` → `release/*` (after a hotfix)**: merge commit (no squash) to preserve history.
- Direct pushes to `main` and `release/*` are not allowed; all changes go through Pull Requests.

## Pull Request checklist

- [ ] Targets the correct base branch (`release/X.Y.Z`; `main` only for release publication and hotfixes)
- [ ] Branch name follows the conventions above
- [ ] Linked issue (e.g. `Closes #123`)
- [ ] Tests added or updated, and CI is green
- [ ] Documentation / [CHANGELOG.md](CHANGELOG.md) updated when user-facing behavior changes

## Questions

Open an issue or a discussion in the repository if anything in this guide is unclear.
