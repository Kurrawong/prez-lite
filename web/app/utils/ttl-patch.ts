/**
 * TTL subject-block parser and patcher for minimal diffs.
 *
 * Parses a TTL string into a prefix block + subject blocks by matching
 * line-starts to known subject IRIs from an N3 Store. Patching replaces
 * only the modified subject blocks, leaving everything else byte-identical.
 */

import { Writer, DataFactory, type Store, type Quad } from 'n3'

// ============================================================================
// Types
// ============================================================================

export interface SubjectBlock {
  subjectIri: string
  startOffset: number
  endOffset: number
  originalText: string
}

export interface ParsedTTL {
  prefixBlock: string
  subjectBlocks: SubjectBlock[]
  trailingText: string
}

// ============================================================================
// Prefix extraction (handles both @prefix and PREFIX)
// ============================================================================

export function extractPrefixes(ttl: string): Record<string, string> {
  const prefixes: Record<string, string> = {}
  // @prefix foo: <iri> .
  const turtleRe = /@prefix\s+(\w*)\s*:\s*<([^>]+)>\s*\./g
  let m: RegExpExecArray | null
  while ((m = turtleRe.exec(ttl)) !== null) {
    prefixes[m[1]!] = m[2]!
  }
  // PREFIX foo: <iri>
  const sparqlRe = /PREFIX\s+(\w*)\s*:\s*<([^>]+)>/gi
  while ((m = sparqlRe.exec(ttl)) !== null) {
    prefixes[m[1]!] = m[2]!
  }
  return prefixes
}

// ============================================================================
// Subject-block parser
// ============================================================================

/**
 * Parse a TTL string into prefix block + ordered subject blocks.
 *
 * Strategy:
 * 1. Collect all subject IRIs from the Store.
 * 2. Build a reverse prefix map so we can detect prefixed-name subjects.
 * 3. Scan lines — a line that starts (column 0) with a known subject IRI
 *    (full or prefixed) opens a new subject block.
 * 4. Everything before the first subject block is the prefix block.
 */
export function parseSubjectBlocks(
  ttl: string,
  store: Store,
  prefixes?: Record<string, string>,
): ParsedTTL {
  const pfx = prefixes ?? extractPrefixes(ttl)

  // All subject IRIs in the store
  const subjectIris = new Set<string>()
  for (const quad of store.getQuads(null, null, null, null) as Quad[]) {
    subjectIris.add(quad.subject.value)
  }

  // Build line offset table (index → char offset of line start)
  const lineOffsets: number[] = [0]
  for (let i = 0; i < ttl.length; i++) {
    if (ttl[i] === '\n') lineOffsets.push(i + 1)
  }
  const lines = ttl.split('\n')

  function lineStartsSubject(line: string): string | null {
    // Must start at column 0 (no leading whitespace)
    if (!line || /^\s/.test(line)) return null
    // Skip prefix / comment lines
    if (line.startsWith('@prefix') || line.startsWith('@PREFIX') || /^PREFIX\s/i.test(line) || line.startsWith('#')) {
      return null
    }

    // Full IRI: <http://...>
    const fullMatch = line.match(/^<([^>]+)>/)
    if (fullMatch && subjectIris.has(fullMatch[1]!)) return fullMatch[1]!

    // Blank node: _:label
    const bnMatch = line.match(/^_:(\S+)/)
    if (bnMatch) {
      const bnId = bnMatch[1]!.replace(/[;.,\s].*$/, '')
      // N3 parser may strip the _: prefix from blank node IDs
      if (subjectIris.has(`_:${bnId}`) || subjectIris.has(bnId)) {
        return subjectIris.has(`_:${bnId}`) ? `_:${bnId}` : bnId
      }
    }

    // Prefixed name: foo:bar, :bar, or cs: (empty local name)
    const pfxMatch = line.match(/^(\w*):(\S*)/)
    if (pfxMatch) {
      const ns = pfx[pfxMatch[1]!]
      if (ns) {
        // Strip trailing predicate-separator chars that might be on the same token
        const localName = (pfxMatch[2] ?? '').replace(/[;.,\s].*$/, '')
        const fullIri = ns + localName
        if (subjectIris.has(fullIri)) return fullIri
      }
    }

    return null
  }

  // Identify block start positions
  const blockStarts: { lineIdx: number; offset: number; iri: string }[] = []
  for (let i = 0; i < lines.length; i++) {
    const iri = lineStartsSubject(lines[i]!)
    if (iri) {
      blockStarts.push({ lineIdx: i, offset: lineOffsets[i]!, iri })
    }
  }

  if (blockStarts.length === 0) {
    return { prefixBlock: ttl, subjectBlocks: [], trailingText: '' }
  }

  const prefixBlock = ttl.substring(0, blockStarts[0]!.offset)

  const blocks: SubjectBlock[] = []
  for (let i = 0; i < blockStarts.length; i++) {
    const start = blockStarts[i]!.offset
    const end = i < blockStarts.length - 1 ? blockStarts[i + 1]!.offset : ttl.length
    blocks.push({
      subjectIri: blockStarts[i]!.iri,
      startOffset: start,
      endOffset: end,
      originalText: ttl.substring(start, end),
    })
  }

  // Trailing text after the last block (usually empty or final newline)
  const lastEnd = blocks[blocks.length - 1]!.endOffset
  const trailingText = lastEnd < ttl.length ? ttl.substring(lastEnd) : ''

  return { prefixBlock, subjectBlocks: blocks, trailingText }
}

// ============================================================================
// Single-subject serializer
// ============================================================================

/**
 * Re-serialize all quads for a single subject using N3 Writer.
 * Strips prefix declarations and post-processes to:
 * - Restore prefixed names the Writer can't produce (e.g. `cs:`)
 * - Format output to match standard Turtle style (subject on own line, 4-space indent, `.` on own line)
 */
export function serializeSubjectBlock(
  store: Store,
  subjectIri: string,
  prefixes: Record<string, string>,
): string {
  const writer = new Writer({ prefixes, format: 'Turtle' })
  const quads = store.getQuads(subjectIri, null, null, null) as Quad[]
  if (quads.length === 0) return ''

  // Sort all quads: rdf:type first, then by predicate, then by object value.
  // Blank node quads are interleaved at their correct predicate position.
  const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
  const sortedQuads = [...quads].sort((a, b) => {
    if (a.predicate.value === RDF_TYPE && b.predicate.value !== RDF_TYPE) return -1
    if (b.predicate.value === RDF_TYPE && a.predicate.value !== RDF_TYPE) return 1
    const predCmp = a.predicate.value.localeCompare(b.predicate.value)
    if (predCmp !== 0) return predCmp
    return a.object.value.localeCompare(b.object.value)
  })

  for (const q of sortedQuads) {
    if (q.object.termType === 'BlankNode') {
      // Write blank node objects with inline notation using writer.blank()
      const bnInnerQuads = store.getQuads(q.object, null, null, null) as Quad[]
      const bnContent = bnInnerQuads.map((iq: Quad) => ({
        predicate: iq.predicate,
        object: iq.object,
      }))
      writer.addQuad(
        DataFactory.namedNode(subjectIri),
        q.predicate,
        writer.blank(bnContent),
      )
    } else {
      writer.addQuad(q)
    }
  }

  let result = ''
  writer.end((_err: Error | null, r: string) => { result = r })

  // Strip prefix declarations — they're already in the parsed prefix block
  result = result.replace(/@prefix\s+\w*\s*:\s*<[^>]+>\s*\.\n?/g, '')
  result = result.replace(/PREFIX\s+\w*\s*:\s*<[^>]+>\s*\n?/gi, '')

  // N3 Writer can't produce prefixed names with empty local parts (e.g. cs:)
  // when the namespace doesn't end with / or #. Post-process to restore them.
  for (const [name, ns] of Object.entries(prefixes)) {
    if (!ns.endsWith('/') && !ns.endsWith('#')) {
      const escaped = ns.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      result = result.replace(new RegExp(`<${escaped}>`, 'g'), `${name}:`)
    }
  }

  // Restore triple-quoted strings: N3 Writer escapes newlines as \n in single-quoted
  // strings, but standard Turtle uses """...""" for multiline string values.
  result = restoreTripleQuotedStrings(result)

  // Trim leading blank lines
  result = result.replace(/^\n+/, '')

  // Reformat to standard Turtle style:
  // - Subject on its own line
  // - 4-space indented predicates with " ;" separators
  // - Terminating "." on its own line
  result = reformatSubjectBlock(result)

  // Ensure trailing newline
  if (result && !result.endsWith('\n')) {
    result += '\n'
  }

  return result
}

/**
 * Convert string literals containing escaped newlines (\n) to triple-quoted form.
 * N3 Writer outputs: "line1\nline2"@en
 * Standard Turtle:   """line1\nline2"""@en (with actual newlines)
 */
function restoreTripleQuotedStrings(text: string): string {
  // Match double-quoted string literals that contain \n escapes.
  // Pattern handles escaped chars (\", \\, \n, etc.) within the string.
  return text.replace(/"((?:[^"\\]|\\.)*)"/g, (match, content: string) => {
    if (!content.includes('\\n')) return match
    const unescaped = content.replace(/\\n/g, '\n')
    return '"""' + unescaped + '"""'
  })
}

/**
 * Reformat a Writer-produced subject block to match standard Turtle style.
 *
 * Transforms the compact Writer output into the canonical form:
 * - Subject on its own line
 * - 4-space indented predicates with " ;" separators
 * - Multi-value objects split across lines with 8-space indent
 * - Terminating "." on its own line followed by blank line
 */
function reformatSubjectBlock(block: string): string {
  const trimmed = block.trim()
  if (!trimmed) return ''

  const lines = trimmed.split('\n')
  const firstLine = lines[0]!

  // Extract subject from the first line
  let subjectEnd = 0
  if (firstLine.startsWith('<')) {
    subjectEnd = firstLine.indexOf('>') + 1
  } else {
    const spaceIdx = firstLine.indexOf(' ')
    subjectEnd = spaceIdx > 0 ? spaceIdx : firstLine.length
  }

  const subject = firstLine.substring(0, subjectEnd)
  const restOfFirstLine = firstLine.substring(subjectEnd).trim()

  // Collect all predicate-object text into one string
  const bodyText = (restOfFirstLine + '\n' + lines.slice(1).join('\n')).trim()
  if (!bodyText) return subject + '\n.\n\n'

  // Parse the body into predicate-objects pairs.
  // The Writer produces lines like:
  //   a skos:Concept;
  //       skos:exactMatch <iri1>, <iri2>;
  //       skos:prefLabel "val"@en.
  // We need to split by top-level ";" separators (respecting strings and brackets).
  const predicateParts = splitPredicateObjects(bodyText)

  const resultLines: string[] = [subject]

  for (const part of predicateParts) {
    const trimPart = part.trim()
    if (!trimPart) continue

    // Remove trailing ";" or "." since we add our own separators
    let clean = trimPart
    if (clean.endsWith(';') || clean.endsWith('.')) {
      clean = clean.slice(0, -1).trimEnd()
    }

    // Check if this predicate has multiple comma-separated objects
    const multiValues = splitObjectValues(clean)
    if (multiValues.length > 1) {
      // Predicate on its own line, values indented below
      const predEnd = findPredicateEnd(clean)
      const pred = clean.substring(0, predEnd).trim()
      resultLines.push(`    ${pred}`)
      for (let i = 0; i < multiValues.length; i++) {
        const val = multiValues[i]!.trim()
        const sep = i < multiValues.length - 1 ? ' ,' : ' ;'
        resultLines.push(`        ${val}${sep}`)
      }
    } else {
      resultLines.push(`    ${clean} ;`)
    }
  }

  resultLines.push('.')
  resultLines.push('')  // blank line separator between subject blocks
  return resultLines.join('\n') + '\n'
}

/** Split body text by top-level ";" separators (respecting strings and brackets) */
function splitPredicateObjects(text: string): string[] {
  const parts: string[] = []
  let current = ''
  let inString = false
  let stringChar = ''
  let inTripleQuote = false
  let bracketDepth = 0
  let i = 0

  while (i < text.length) {
    const ch = text[i]!
    const next2 = text.substring(i, i + 3)

    // Handle triple-quoted strings
    if (!inString && (next2 === '"""' || next2 === "'''")) {
      inString = true
      inTripleQuote = true
      stringChar = ch
      current += next2
      i += 3
      continue
    }
    if (inTripleQuote && next2 === stringChar.repeat(3)) {
      inString = false
      inTripleQuote = false
      current += next2
      i += 3
      continue
    }

    // Handle single-quoted strings
    if (!inString && (ch === '"' || ch === "'")) {
      inString = true
      stringChar = ch
      current += ch
      i++
      continue
    }
    if (inString && !inTripleQuote && ch === stringChar && text[i - 1] !== '\\') {
      inString = false
      current += ch
      i++
      continue
    }

    if (inString) {
      current += ch
      i++
      continue
    }

    // Track bracket depth
    if (ch === '[' || ch === '(') { bracketDepth++; current += ch; i++; continue }
    if (ch === ']' || ch === ')') { bracketDepth--; current += ch; i++; continue }

    // Top-level ";" splits predicate-objects
    if (ch === ';' && bracketDepth === 0) {
      parts.push(current.trim())
      current = ''
      i++
      continue
    }

    // Top-level "." ends the block
    if (ch === '.' && bracketDepth === 0 && i === text.length - 1) {
      parts.push(current.trim())
      current = ''
      i++
      continue
    }

    current += ch
    i++
  }

  if (current.trim()) parts.push(current.trim())
  return parts.filter(p => p.length > 0)
}

/** Split a predicate-objects string by top-level "," separators */
function splitObjectValues(predicateObjects: string): string[] {
  // Find where the predicate ends and objects begin
  const predEnd = findPredicateEnd(predicateObjects)
  if (predEnd >= predicateObjects.length) return [predicateObjects]

  const objectsPart = predicateObjects.substring(predEnd).trim()

  // Split objects by "," respecting strings
  const values: string[] = []
  let current = ''
  let inString = false
  let stringChar = ''
  let inTripleQuote = false

  for (let i = 0; i < objectsPart.length; i++) {
    const ch = objectsPart[i]!
    const next2 = objectsPart.substring(i, i + 3)

    if (!inString && (next2 === '"""' || next2 === "'''")) {
      inString = true; inTripleQuote = true; stringChar = ch
      current += next2; i += 2; continue
    }
    if (inTripleQuote && next2 === stringChar.repeat(3)) {
      inString = false; inTripleQuote = false
      current += next2; i += 2; continue
    }
    if (!inString && (ch === '"' || ch === "'")) {
      inString = true; stringChar = ch; current += ch; continue
    }
    if (inString && !inTripleQuote && ch === stringChar && objectsPart[i - 1] !== '\\') {
      inString = false; current += ch; continue
    }
    if (inString) { current += ch; continue }

    if (ch === ',') {
      if (current.trim()) values.push(current.trim())
      current = ''
      continue
    }

    current += ch
  }

  if (current.trim()) values.push(current.trim())
  return values.length > 1 ? values : [predicateObjects]
}

/** Find the end of the predicate in a "predicate object" string.
 *  Handles `a` (rdf:type shorthand), `<iri>`, and `prefix:name`.
 */
function findPredicateEnd(text: string): number {
  const trimmed = text.trimStart()
  const offset = text.length - trimmed.length

  // `a` shorthand for rdf:type
  if (trimmed.startsWith('a ') || trimmed.startsWith('a\t')) {
    return offset + 1
  }

  // Full IRI: <...>
  if (trimmed.startsWith('<')) {
    const end = trimmed.indexOf('>')
    return end >= 0 ? offset + end + 1 : text.length
  }

  // Prefixed name: prefix:localName
  const match = trimmed.match(/^[\w]*:[\w-]*/)
  if (match) {
    return offset + match[0].length
  }

  // Fallback: first space
  const spaceIdx = trimmed.indexOf(' ')
  return spaceIdx >= 0 ? offset + spaceIdx : text.length
}

// ============================================================================
// Patcher
// ============================================================================

/**
 * Reconstruct a TTL string by replacing/removing/adding subject blocks.
 *
 * @param parsed - The original parsed TTL structure
 * @param patches - Map of subjectIri → new text (or null to remove the block)
 * @param newBlocks - Additional blocks to append (for new subjects)
 */
export function patchTTL(
  parsed: ParsedTTL,
  patches: Map<string, string | null>,
  newBlocks?: string[],
): string {
  let result = parsed.prefixBlock

  for (const block of parsed.subjectBlocks) {
    const patch = patches.get(block.subjectIri)
    if (patch === null) {
      // Block removed — skip it
      continue
    } else if (patch !== undefined) {
      // Block replaced
      result += patch
    } else {
      // Block unchanged — keep original text
      result += block.originalText
    }
  }

  result += parsed.trailingText

  // Append new subject blocks
  if (newBlocks?.length) {
    // Ensure there's a blank line before new blocks
    if (!result.endsWith('\n\n')) {
      result += result.endsWith('\n') ? '\n' : '\n\n'
    }
    result += newBlocks.join('\n') + '\n'
  }

  return result
}

// ============================================================================
// Quad diff utilities
// ============================================================================

/** Canonical string key for a quad (for set comparison) */
export function quadKey(q: Quad): string {
  const obj = q.object
  if (obj.termType === 'Literal') {
    return `${q.subject.value}|${q.predicate.value}|L|${obj.value}|${(obj as any).language || ''}|${(obj as any).datatype?.value || ''}`
  }
  return `${q.subject.value}|${q.predicate.value}|I|${obj.value}`
}

/** Compute added and removed quads between two stores */
export function computeQuadDiff(
  originalStore: Store,
  currentStore: Store,
): { added: Quad[]; removed: Quad[] } {
  const origQuads = originalStore.getQuads(null, null, null, null) as Quad[]
  const currQuads = currentStore.getQuads(null, null, null, null) as Quad[]

  const origKeys = new Set(origQuads.map(quadKey))
  const currKeys = new Set(currQuads.map(quadKey))

  const added = currQuads.filter(q => !origKeys.has(quadKey(q)))
  const removed = origQuads.filter(q => !currKeys.has(quadKey(q)))

  return { added, removed }
}

/** Get the set of subject IRIs affected by a diff */
export function getModifiedSubjects(
  added: Quad[],
  removed: Quad[],
): Set<string> {
  const subjects = new Set<string>()
  for (const q of added) subjects.add(q.subject.value)
  for (const q of removed) subjects.add(q.subject.value)
  return subjects
}
