# Reviewing

> Tasks awaiting human manual review and approval

---

## 📦 Sample Data Fallback for Fresh Clones
**Review requested:** 2026-02-09

### What to Review
Build-step fallback that uses sample data when `web/public/data/vocabs/` is empty (e.g. fresh clone).

### Changes
- **`web/public/sample-data/`** — committed folder with `example-colors.ttl`, `profiles.ttl`, and empty `background/`
- **`package.json`** — new `build:ensure-data` script that copies sample-data into data/ if no vocabs found
- **`.gitignore`** — `web/public/data/` remains ignored (generated at build time)

### How to Test
1. Delete `web/public/data/` entirely
2. Run `pnpm build:ensure-data`
3. Verify `web/public/data/vocabs/example-colors.ttl`, `data/profiles.ttl`, and `data/background/` exist
4. Run `pnpm build:all-export` and confirm it completes successfully
