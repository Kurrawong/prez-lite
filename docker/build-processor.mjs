#!/usr/bin/env node
/**
 * Assemble a standalone copy of the data-processing pipeline for the Docker image.
 *
 * The pipeline normally runs inside the pnpm workspace, where process-vocab.js
 * imports the SHACL profile parser from the @prez-lite/web package. Installing
 * @prez-lite/web would pull in all of Nuxt, so instead (as the
 * fetch-prez-lite-tools action does for client repos) we:
 *
 *   1. copy packages/data-processing/scripts
 *   2. copy web/app/utils/shacl-profile-parser.ts next to them and rewrite the import
 *   3. write a package.json with only the pipeline's runtime dependencies, pinned
 *      to the exact versions the workspace resolved from pnpm-lock.yaml
 *
 * Usage: node docker/build-processor.mjs <repo-root> <out-dir>
 */
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [repoRoot = '.', outDir = '/opt/prez-lite/processor'] = process.argv.slice(2).map(p => resolve(p))

const dpDir = join(repoRoot, 'packages/data-processing')
const scriptsOut = join(outDir, 'scripts')
const PARSER_IMPORT = '@prez-lite/web/utils/shacl-profile-parser'

mkdirSync(scriptsOut, { recursive: true })
cpSync(join(dpDir, 'scripts'), scriptsOut, { recursive: true })
cpSync(join(repoRoot, 'web/app/utils/shacl-profile-parser.ts'), join(scriptsOut, 'shacl-profile-parser.ts'))

let rewritten = 0
for (const file of readdirSync(scriptsOut).filter(f => f.endsWith('.js'))) {
  const path = join(scriptsOut, file)
  const src = readFileSync(path, 'utf8')
  if (src.includes(PARSER_IMPORT)) {
    writeFileSync(path, src.replaceAll(PARSER_IMPORT, './shacl-profile-parser.ts'))
    rewritten++
  }
}
if (rewritten === 0) {
  throw new Error(`No script imports ${PARSER_IMPORT} — has the pipeline layout changed?`)
}

const dpPkg = JSON.parse(readFileSync(join(dpDir, 'package.json'), 'utf8'))
const dependencies = {}
for (const name of Object.keys(dpPkg.dependencies ?? {})) {
  if (name.startsWith('@prez-lite/')) continue
  // pnpm links each direct dependency into the package's node_modules
  const installed = JSON.parse(readFileSync(join(dpDir, 'node_modules', name, 'package.json'), 'utf8'))
  dependencies[name] = installed.version
}

const pkg = {
  name: 'prez-lite-processor',
  version: dpPkg.version,
  private: true,
  type: 'module',
  description: 'Standalone prez-lite TTL → JSON processing pipeline (Docker image)',
  dependencies,
}
writeFileSync(join(outDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)

console.log(`Assembled processor in ${outDir}`)
console.log(`  rewrote parser import in ${rewritten} script(s)`)
console.log(`  dependencies: ${Object.entries(dependencies).map(([n, v]) => `${n}@${v}`).join(', ')}`)
