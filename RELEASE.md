# Release process

This project uses Semantic Versioning (SemVer) and maintains human-written release notes in `CHANGELOG.md`.

## Versioning

- Patch releases: bug fixes and small adjustments.
- Minor releases: new features that are backwards compatible.
- Major releases: breaking changes.

Pre-1.0 guidance:

- While the major version is `0`, breaking changes may still occur. Prefer minor bumps for breaking changes until `1.0.0`.

## Cut a release

1. Ensure you are on a clean working tree.
2. Confirm the app passes local checks:

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
```

3. Update `CHANGELOG.md`:

- Move items from `[Unreleased]` into a new version heading with today’s date.
- Keep entries user-facing and grouped under Added/Changed/Fixed/Removed/Security.

4. Bump `package.json` version.

5. Commit:

- `CHANGELOG.md`
- `package.json`

6. Tag the release:

- Tag format: `vX.Y.Z`

7. Push and create a GitHub Release using the matching `CHANGELOG.md` section.

## Database changes

If a release includes schema changes:

- Apply schema changes using the documented Drizzle workflow.
- Run migrations against production (Turso) from a trusted environment.
- Verify the deployed app against the migrated schema.
