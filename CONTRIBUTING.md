# Contributing

## Development setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Run checks:

```bash
pnpm lint
pnpm check
pnpm test
```

## Pull requests

- Keep changes small and focused.
- If you change behavior, add or update tests.
- Add a short entry to the `[Unreleased]` section of `CHANGELOG.md`.
