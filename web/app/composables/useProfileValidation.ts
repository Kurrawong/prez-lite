/**
 * Profile Validation Composable
 *
 * Validates prez:ObjectProfile TTL content using the existing SHACL profile parser.
 * Provides real-time validation feedback for the profile helper.
 */

import { parseProfilesContent, type ParsedProfile, type ProfileConfig } from '~/utils/shacl-profile-parser'

export interface ValidationMessage {
  level: 'error' | 'warning' | 'info'
  message: string
  detail?: string
}

export interface ValidationResult {
  valid: boolean
  messages: ValidationMessage[]
  profile: ParsedProfile | null
  parseError: string | null
}

export function useProfileValidation() {
  // Validation state
  const result = ref<ValidationResult>({
    valid: false,
    messages: [],
    profile: null,
    parseError: null,
  })

  const isValidating = ref(false)

  /**
   * Validate TTL content
   */
  function validate(ttlContent: string): ValidationResult {
    const messages: ValidationMessage[] = []
    let profile: ParsedProfile | null = null
    let parseError: string | null = null

    // Skip if empty
    if (!ttlContent.trim()) {
      return {
        valid: false,
        messages: [{ level: 'info', message: 'No content to validate' }],
        profile: null,
        parseError: null,
      }
    }

    // Try to parse the TTL
    let config: ProfileConfig | null = null
    try {
      config = parseProfilesContent(ttlContent)
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e)
      messages.push({
        level: 'error',
        message: 'Turtle parse error',
        detail: parseError,
      })
      return {
        valid: false,
        messages,
        profile: null,
        parseError,
      }
    }

    // Check if we found any profiles
    const profiles = Object.values(config.profiles)
    if (profiles.length === 0) {
      messages.push({
        level: 'warning',
        message: 'No prof:Profile found',
        detail: 'Content must include a resource with type prof:Profile',
      })
    } else if (profiles.length > 1) {
      messages.push({
        level: 'info',
        message: `Found ${profiles.length} profiles`,
        detail: 'Only the first profile will be validated in detail',
      })
    }

    // Get the first profile for detailed validation
    profile = profiles[0] ?? null

    if (profile) {
      // Check required properties
      if (!profile.targetClass) {
        messages.push({
          level: 'warning',
          message: 'Missing target class',
          detail: 'Add sh:targetClass to specify which RDF class this profile applies to',
        })
      }

      if (!profile.identifier) {
        messages.push({
          level: 'warning',
          message: 'Missing identifier',
          detail: 'Add dcterms:identifier for a machine-readable ID',
        })
      }

      if (!profile.title) {
        messages.push({
          level: 'info',
          message: 'Missing title',
          detail: 'Consider adding dcterms:title for human-readable label',
        })
      }

      // Check source predicates
      if (profile.labelSources.length === 0) {
        messages.push({
          level: 'warning',
          message: 'No label sources defined',
          detail: 'Add prez:labelSource to specify predicates for labels (e.g., skos:prefLabel)',
        })
      }

      if (profile.descriptionSources.length === 0 && profile.generate.description) {
        messages.push({
          level: 'warning',
          message: 'No description sources defined',
          detail: 'Add prez:descriptionSource or disable prez:generateDescription',
        })
      }

      if (profile.provenanceSources.length === 0 && profile.generate.provenance) {
        messages.push({
          level: 'warning',
          message: 'No provenance sources defined',
          detail: 'Add prez:provenanceSource or disable prez:generateProvenance',
        })
      }

      // Check generation flags
      const anyGenerate = Object.values(profile.generate).some(v => v)
      if (!anyGenerate) {
        messages.push({
          level: 'info',
          message: 'No generation flags enabled',
          detail: 'Enable at least one prez:generate* flag to produce annotations',
        })
      }

      // Check output formats
      if (profile.formats.length === 0) {
        messages.push({
          level: 'info',
          message: 'No output formats specified',
          detail: 'Add altr-ext:hasResourceFormat to define supported formats',
        })
      }

      // Check link template consistency
      if (profile.generate.link && !profile.linkTemplate) {
        messages.push({
          level: 'info',
          message: 'Missing link template',
          detail: 'Add prez:linkTemplate if using generateLink',
        })
      }

      if (profile.generate.members && !profile.membersTemplate) {
        messages.push({
          level: 'info',
          message: 'Missing members template',
          detail: 'Add prez:membersTemplate if using generateMembers',
        })
      }

      // Success message if no issues
      if (messages.length === 0) {
        messages.push({
          level: 'info',
          message: 'Profile is valid',
          detail: `Target: ${profile.targetClass}`,
        })
      }
    }

    const hasErrors = messages.some(m => m.level === 'error')
    const hasWarnings = messages.some(m => m.level === 'warning')

    return {
      valid: !hasErrors && !hasWarnings,
      messages,
      profile,
      parseError,
    }
  }

  /**
   * Validate with debounce (for use with reactive content)
   */
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function validateDebounced(ttlContent: string, delay = 300) {
    isValidating.value = true

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      result.value = validate(ttlContent)
      isValidating.value = false
    }, delay)
  }

  /**
   * Clear validation result
   */
  function clear() {
    result.value = {
      valid: false,
      messages: [],
      profile: null,
      parseError: null,
    }
  }

  return {
    result,
    isValidating,
    validate,
    validateDebounced,
    clear,
  }
}
