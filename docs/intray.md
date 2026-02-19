


Issue when checking in vocab changes.

Run pnpm --filter @prez-lite/web test:unit

> @prez-lite/web@0.1.0 test:unit /home/runner/work/prez-lite/prez-lite/web
> vitest run --config vitest.config.ts

Duplicated imports "ValidationResult", the one from "/home/runner/work/prez-lite/prez-lite/web/app/composables/useProfileValidation.ts" has been ignored and "/home/runner/work/prez-lite/prez-lite/web/app/composables/useVocabData.ts" is used

 RUN  v4.0.18 /home/runner/work/prez-lite/prez-lite/web

 ❯ tests/unit/ttl-patch.test.ts (0 test)
 ❯ tests/unit/edit-mutations.test.ts (0 test)
 ❯ tests/unit/undo-redo.test.ts (0 test)
 ❯ tests/unit/annotated-properties.test.ts (0 test)
 ❯ tests/unit/shacl-profile-parser.test.ts (0 test)
 ❯ tests/unit/serialize-with-patch.test.ts (0 test)
 ❯ tests/unit/profile-validation.test.ts (0 test)
 ❯ tests/unit/github-file.test.ts (0 test)
 ❯ tests/components/EditToolbar.test.ts (0 test)
 ❯ tests/unit/vocab-labels.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 10 ⎯⎯⎯⎯⎯⎯

 FAIL  tests/components/EditToolbar.test.ts [ tests/components/EditToolbar.test.ts ]
 FAIL  tests/unit/annotated-properties.test.ts [ tests/unit/annotated-properties.test.ts ]
 FAIL  tests/unit/edit-mutations.test.ts [ tests/unit/edit-mutations.test.ts ]
 FAIL  tests/unit/github-file.test.ts [ tests/unit/github-file.test.ts ]
 FAIL  tests/unit/profile-validation.test.ts [ tests/unit/profile-validation.test.ts ]
 FAIL  tests/unit/serialize-with-patch.test.ts [ tests/unit/serialize-with-patch.test.ts ]
 FAIL  tests/unit/shacl-profile-parser.test.ts [ tests/unit/shacl-profile-parser.test.ts ]
 FAIL  tests/unit/ttl-patch.test.ts [ tests/unit/ttl-patch.test.ts ]
 FAIL  tests/unit/undo-redo.test.ts [ tests/unit/undo-redo.test.ts ]
 FAIL  tests/unit/vocab-labels.test.ts [ tests/unit/vocab-labels.test.ts ]
TSConfckParseError: parsing /home/runner/work/prez-lite/prez-lite/web/.nuxt/tsconfig.app.json failed: Error: ENOENT: no such file or directory, open '/home/runner/work/prez-lite/prez-lite/web/.nuxt/tsconfig.app.json'
  Plugin: vite:esbuild
  File: /home/runner/work/prez-lite/prez-lite/web/tests/unit/ttl-patch.test.ts
 ❯ ../node_modules/.pnpm/vite@6.4.1_@types+node@25.2.3_jiti@2.6.1_lightningcss@1.31.1_terser@5.46.0_yaml@2.8.2/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:8591:10

Caused by: Error: ENOENT: no such file or directory, open '/home/runner/work/prez-lite/prez-lite/web/.nuxt/tsconfig.app.json'
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/10]⎯


 Test Files  10 failed (10)
      Tests  no tests
   Start at  04:20:02
   Duration  6.54s (transform 159ms, setup 956ms, import 0ms, tests 0ms, environment 4.18s)

/home/runner/work/prez-lite/prez-lite/web:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @prez-lite/web@0.1.0 test:unit: `vitest run --config vitest.config.ts`
Exit status 1
Error: Process completed with exit code 1.