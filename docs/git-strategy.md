# Git Strategy

This repository uses a staged release flow:

- `main` is production source. It should only change through pull requests after CI passes.
- `staging` is the integration branch for QA and manual checks before production.
- `release/x.y.z` branches publish app updates. The branch version must match `package.json`.
- Feature or fix branches should target `staging` first.

## Branch Flow

1. Create a feature branch from `staging`.
2. Open a pull request into `staging`.
3. Merge into `staging` only after CI passes and the app is checked.
4. When staging is ready to release, update `package.json` to the release version.
5. Create a release branch from `staging`, for example `release/1.0.1`.
6. Push the release branch.
7. The release workflow validates the branch, runs checks, builds Windows artifacts, creates tag `v1.0.1`, and publishes a GitHub Release.
8. Open a pull request from `release/1.0.1` into `main` so production source matches the released app.

## Release Branch Rules

Release branches must use this exact format:

```text
release/x.y.z
```

Examples:

```text
release/1.0.0
release/1.0.1
release/2.3.4
```

The release workflow checks that:

- The branch name is valid.
- `package.json` has the same version as the branch.
- The tag does not already exist.
- TypeScript checks pass.
- Production dependency audit passes.
- Windows installer, portable executable, blockmap, and `latest.yml` are created.

If everything passes, the workflow creates tag `vx.y.z` and publishes the GitHub Release. Installed users receive the update through Electron auto-update.

## GitHub Branch Protection

GitHub branch protection is required to enforce this strategy. Configure these rules in repository settings.

For `main`:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Require `CI / app-checks`.
- Require `CI / docker-ci`.
- Block direct pushes.
- Optionally require approvals.

For `staging`:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Require `CI / app-checks`.
- Require `CI / docker-ci`.

For `release/*`:

- Require status checks to pass.
- Restrict who can push release branches if this repository has multiple contributors.

## Creating A Release

From a clean `staging` branch:

```bash
npm version 1.0.1 --no-git-tag-version
git add package.json package-lock.json
git commit -m "Prepare release 1.0.1"
git switch -c release/1.0.1
git push -u origin release/1.0.1
```

After the release workflow succeeds, open a pull request from `release/1.0.1` into `main`.
