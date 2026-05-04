# Video Folder Loop Player

Electron + React + TypeScript desktop app that plays all videos in a selected folder, loops continuously, and updates live when files are added/removed.

## Security checks

Run audit checks locally:

```bash
npm run audit:prod
npm run audit:full
```

- `audit:prod` fails the pipeline on high/critical production dependency vulnerabilities.
- `audit:full` checks runtime + dev dependencies at moderate and above.

## Docker for local parity + CI/CD

### Build, typecheck, and audit in Docker

```bash
docker compose run --rm app-ci
docker compose run --rm app-build
```

### With corporate proxy/filtered internet

Set env vars before running:

```bash
export HTTP_PROXY=http://proxy:8080
export HTTPS_PROXY=http://proxy:8080
export NO_PROXY=localhost,127.0.0.1
# optional internal registry
export NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
```

Then run compose commands again.

## Local development

```bash
npm install
npm run dev
```

## Windows installer, portable app, and auto-update

Build both Windows release formats:

```bash
npm run dist:win
```

The generated files are written to `release-artifacts/`:

- `Video Folder Loop Player-Setup-<version>-x64.exe` is the recommended installer. This build supports automatic updates.
- `Video Folder Loop Player-Portable-<version>-x64.exe` can be copied to another Windows computer, but should be updated manually by replacing it with a newer portable build.

Automatic updates are published through GitHub Releases. To publish a new update:

```bash
npm version patch
git push
git push --tags
```

The `Release` GitHub Actions workflow builds the Windows installer, portable executable, and update metadata. Users who installed the setup version will receive updates from the matching GitHub release.
