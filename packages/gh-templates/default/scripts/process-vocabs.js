#!/usr/bin/env node
/**
 * Process Vocabularies Script
 *
 * Downloads and runs the prez-lite data-processing scripts from GitHub.
 * Uses GITHUB_TOKEN for authentication to private repos.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx node scripts/process-vocabs.js
 *
 * Or set GITHUB_TOKEN in .env file
 */

import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const CACHE_DIR = join(ROOT_DIR, '.prez-lite-cache')

// Detect monorepo: if packages/data-processing exists alongside this template
const LOCAL_DATA_PROCESSING = resolve(ROOT_DIR, '../../data-processing')
const IS_MONOREPO = existsSync(resolve(LOCAL_DATA_PROCESSING, 'scripts', 'process-vocab.js'))
const DATA_PROCESSING_DIR = IS_MONOREPO ? LOCAL_DATA_PROCESSING : join(CACHE_DIR, 'data-processing')

// Load .env file if it exists
const envPath = join(ROOT_DIR, '.env')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=')
      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

// Configuration
const PREZ_LITE_REPO = process.env.PREZ_LITE_REPO || 'hjohns/prez-lite'
const PREZ_LITE_BRANCH = process.env.PREZ_LITE_BRANCH || 'main'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// Paths in the template project
const SOURCE_DIR = join(ROOT_DIR, 'data', 'vocabs')
const PROFILES_FILE = join(ROOT_DIR, 'data', 'config', 'profiles.ttl')
const EXPORT_DIR = join(ROOT_DIR, 'public', 'export')
const OUTPUT_DIR = join(EXPORT_DIR, 'vocabs')
const BACKGROUND_DIR = join(ROOT_DIR, 'data', 'background')

async function main() {
  console.log('🔧 prez-lite Vocabulary Processor')
  console.log('==================================\n')

  if (IS_MONOREPO) {
    console.log('📦 Monorepo detected — using local data-processing package')
    console.log(`   ${DATA_PROCESSING_DIR}\n`)
  } else {
    // Check for GITHUB_TOKEN (only needed in standalone mode)
    if (!GITHUB_TOKEN) {
      console.error('❌ GITHUB_TOKEN environment variable is required')
      console.error('   Set it in .env or export GITHUB_TOKEN=ghp_xxx')
      process.exit(1)
    }

    // Step 1: Download/update data-processing from prez-lite
    await fetchDataProcessing()

    // Step 2: Install dependencies for data-processing
    await installDependencies()
  }

  // Step 3: Run the processing
  await processVocabularies()

  // Step 4: Generate system metadata files
  await generateSystemFiles()

  console.log('\n✅ Processing complete!')
}

async function fetchDataProcessing() {
  console.log('📥 Fetching data-processing from prez-lite...')

  // Clean and recreate cache dir
  if (existsSync(DATA_PROCESSING_DIR)) {
    rmSync(DATA_PROCESSING_DIR, { recursive: true })
  }
  mkdirSync(CACHE_DIR, { recursive: true })

  // Use git sparse checkout to get data-processing and web utils
  const repoUrl = `https://${GITHUB_TOKEN}@github.com/${PREZ_LITE_REPO}.git`

  try {
    // Clone with sparse checkout
    execSync(`git clone --depth 1 --filter=blob:none --sparse "${repoUrl}" "${CACHE_DIR}/repo"`, {
      stdio: 'pipe',
      cwd: CACHE_DIR
    })

    // Fetch both data-processing and the web utils it depends on
    execSync(`git sparse-checkout set packages/data-processing web/app/utils`, {
      cwd: join(CACHE_DIR, 'repo'),
      stdio: 'pipe'
    })

    // Move data-processing to expected location
    execSync(`mv "${CACHE_DIR}/repo/packages/data-processing" "${DATA_PROCESSING_DIR}"`, {
      stdio: 'pipe'
    })

    // Copy shacl-profile-parser directly into data-processing/scripts
    copyFileSync(
      join(CACHE_DIR, 'repo', 'web', 'app', 'utils', 'shacl-profile-parser.ts'),
      join(DATA_PROCESSING_DIR, 'scripts', 'shacl-profile-parser.ts')
    )

    // Patch data-processing package.json to remove workspace dependency
    const dpPkgPath = join(DATA_PROCESSING_DIR, 'package.json')
    const dpPkg = JSON.parse(readFileSync(dpPkgPath, 'utf-8'))
    delete dpPkg.dependencies['@prez-lite/web']
    writeFileSync(dpPkgPath, JSON.stringify(dpPkg, null, 2))

    // Patch process-vocab.js to use local shacl-profile-parser
    const processVocabPath = join(DATA_PROCESSING_DIR, 'scripts', 'process-vocab.js')
    let processVocabContent = readFileSync(processVocabPath, 'utf-8')
    processVocabContent = processVocabContent.replace(
      /@prez-lite\/web\/utils\/shacl-profile-parser/g,
      './shacl-profile-parser.ts'
    )
    writeFileSync(processVocabPath, processVocabContent)

    // Cleanup repo clone
    rmSync(join(CACHE_DIR, 'repo'), { recursive: true })

    console.log('   ✓ Downloaded data-processing scripts')
  } catch (error) {
    console.error('❌ Failed to fetch data-processing:', error.message)
    process.exit(1)
  }
}

async function installDependencies() {
  console.log('📦 Installing data-processing dependencies...')

  try {
    execSync('npm install', {
      cwd: DATA_PROCESSING_DIR,
      stdio: 'inherit'
    })
    console.log('   ✓ Dependencies installed')
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message)
    process.exit(1)
  }
}

async function processVocabularies() {
  console.log('⚙️  Processing vocabularies...')

  // Check source directory exists
  if (!existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`)
    console.error('   Create data/vocabs/ and add your .ttl files')
    process.exit(1)
  }

  // Create output directory
  mkdirSync(OUTPUT_DIR, { recursive: true })

  // Build command arguments
  const processScript = join(DATA_PROCESSING_DIR, 'scripts', 'process-vocab.js')

  const args = [
    processScript,
    '--sourceDir', SOURCE_DIR,
    '--outputBase', OUTPUT_DIR,
    '--systemDir', join(EXPORT_DIR, 'system'),
    '--pattern', '*.ttl'
  ]

  // Add profiles if exists
  if (existsSync(PROFILES_FILE)) {
    args.push('--profiles', PROFILES_FILE)
  }

  // Add background dir if exists
  if (existsSync(BACKGROUND_DIR)) {
    args.push('--backgroundDir', BACKGROUND_DIR)
  }

  console.log(`   Running: node ${args.join(' ')}`)

  try {
    const result = spawn('node', args, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env }
    })

    await new Promise((resolve, reject) => {
      result.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Process exited with code ${code}`))
        }
      })
      result.on('error', reject)
    })

    console.log('   ✓ Vocabularies processed')
  } catch (error) {
    console.error('❌ Processing failed:', error.message)
    process.exit(1)
  }
}

async function generateSystemFiles() {
  console.log('📊 Generating system metadata files...')

  const SYSTEM_DIR = join(EXPORT_DIR, 'system')
  const VOCABULARIES_DIR = join(SYSTEM_DIR, 'vocabularies')

  // Create system directories
  mkdirSync(VOCABULARIES_DIR, { recursive: true })

  // Generate vocabularies metadata index
  console.log('   Generating vocabularies/index.json...')
  const metadataScript = join(DATA_PROCESSING_DIR, 'scripts', 'generate-vocab-metadata.js')
  try {
    execSync(`node "${metadataScript}" --sourceDir "${SOURCE_DIR}" --output "${join(VOCABULARIES_DIR, 'index.json')}"${existsSync(BACKGROUND_DIR) ? ` --backgroundDir "${BACKGROUND_DIR}"` : ''}`, {
      stdio: 'pipe',
      cwd: ROOT_DIR
    })
    console.log('      ✓ vocabularies/index.json')
  } catch (error) {
    console.warn('      ⚠ Failed to generate vocabularies index:', error.message)
  }

  // Generate labels index (if background directory exists)
  if (existsSync(BACKGROUND_DIR)) {
    console.log('   Generating labels.json...')
    const labelsScript = join(DATA_PROCESSING_DIR, 'scripts', 'generate-labels.js')
    try {
      execSync(`node "${labelsScript}" --backgroundDir "${BACKGROUND_DIR}" --output "${join(SYSTEM_DIR, 'labels.json')}"`, {
        stdio: 'pipe',
        cwd: ROOT_DIR
      })
      console.log('      ✓ labels.json')
    } catch (error) {
      console.warn('      ⚠ Failed to generate labels index:', error.message)
    }
  }

  // Generate search index
  console.log('   Generating search index...')
  const searchScript = join(DATA_PROCESSING_DIR, 'scripts', 'generate-search-index.js')
  const searchDir = join(SYSTEM_DIR, 'search')

  try {
    execSync(`node "${searchScript}" --exportDir "${EXPORT_DIR}" --output "${searchDir}" --vocabMetadata "${join(VOCABULARIES_DIR, 'index.json')}"`, {
      stdio: 'pipe',
      cwd: ROOT_DIR
    })
    console.log('      ✓ search/index.json')
    console.log('      ✓ search/orama-index.json')
    console.log('      ✓ search/facets.json')
  } catch (error) {
    console.warn('      ⚠ Failed to generate search index:', error.message)
  }

  console.log('   ✓ System files generated')
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
