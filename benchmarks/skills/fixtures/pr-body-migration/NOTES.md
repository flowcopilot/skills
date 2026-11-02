# Context for the PR

Tasks can now have more than one note. The migration copies each old note to the new `notes` table and drops `tasks.legacy_notes`. Production runs migrations by hand with `bun run migrate` after deploy. Issue: https://example.test/issues/58
