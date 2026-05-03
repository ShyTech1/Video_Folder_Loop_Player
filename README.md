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
