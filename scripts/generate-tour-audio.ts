#!/usr/bin/env npx tsx
/**
 * Generate tour narration audio files using the ElevenLabs TTS API.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... npx tsx scripts/generate-tour-audio.ts
 *
 * Prerequisites:
 *   - Free ElevenLabs account: https://elevenlabs.io
 *   - API key from: https://elevenlabs.io/app/settings/api-keys
 *
 * Outputs MP3 files to web/public/audio/tour/{step-id}.mp3
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Auto-load API key from web/.env if not already in environment
const rootDir = join(import.meta.dirname, '..')
const envPath = join(rootDir, 'web/.env')
if (!process.env.ELEVENLABS_API_KEY && existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  const match = envContent.match(/^ELEVENLABS_API_KEY=(.+)$/m)
  if (match) process.env.ELEVENLABS_API_KEY = match[1]!.trim()
}

const API_KEY = process.env.ELEVENLABS_API_KEY
if (!API_KEY) {
  console.error('Error: Set ELEVENLABS_API_KEY in web/.env or environment')
  console.error('  Get a free key at https://elevenlabs.io/app/settings/api-keys')
  process.exit(1)
}

// Charlie — casual Australian accent, conversational tone (free tier)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'IKne3meq5aSn9XLyUdCD'
const MODEL_ID = 'eleven_multilingual_v2'

interface TourStep {
  id: string
  title: string
  description: string
}

const tourDir = join(rootDir, 'web/app/tours')
const outDir = join(rootDir, 'web/public/audio/tour')

mkdirSync(outDir, { recursive: true })

async function generateAudio(step: TourStep): Promise<void> {
  const text = `${step.title}. ${step.description}`
  const outPath = join(outDir, `${step.id}.mp3`)

  console.log(`  Generating: ${step.id} (${text.length} chars)`)

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY!,
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.75,
        style: 0.3,
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`ElevenLabs API error ${response.status}: ${body}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(outPath, buffer)
  console.log(`  ✓ ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`)
}

async function main() {
  const tourFiles = readdirSync(tourDir).filter(f => f.endsWith('.json'))

  if (!tourFiles.length) {
    console.error('No tour JSON files found in', tourDir)
    process.exit(1)
  }

  let totalSteps = 0
  let totalChars = 0

  for (const file of tourFiles) {
    const tourName = file.replace('.json', '')
    const tourPath = join(tourDir, file)
    const steps: TourStep[] = JSON.parse(readFileSync(tourPath, 'utf-8'))

    console.log(`\n--- ${tourName} (${steps.length} steps) ---\n`)

    for (const step of steps) {
      totalChars += step.title.length + 2 + step.description.length
    }

    for (const step of steps) {
      await generateAudio(step)
      // Small delay to respect rate limits on free tier
      await new Promise(r => setTimeout(r, 500))
    }

    totalSteps += steps.length
  }

  console.log(`\nDone! ${totalSteps} audio files generated across ${tourFiles.length} tours in ${outDir}`)
  console.log(`Total text: ${totalChars} characters`)
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
