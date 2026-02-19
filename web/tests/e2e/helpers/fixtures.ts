/**
 * Test data constants for E2E tests.
 * Values match the actual export data in web/public/export/.
 */

export const VOCABS = {
  alterationForm: {
    slug: 'alteration-form',
    iri: 'https://linked.data.gov.au/def/alteration-form',
    label: 'Alteration form',
    conceptCount: 24,
  },
  anzic: {
    slug: 'ANZIC2006-industry-classifications',
    iri: 'http://linked.data.gov.au/def/anzsic-2006',
    label: 'Australian and New Zealand Standard Industrial Classification',
    conceptCount: 294,
  },
  brands: {
    slug: 'brands',
    iri: 'http://example.com/def/brand',
    label: 'Brand',
    conceptCount: 11,
  },
} as const

/** A concept with known data from the alteration-form vocab */
export const CONCEPT = {
  iri: 'https://linked.data.gov.au/def/alteration-form/zoned',
  label: 'zoned',
  definition: 'Alteration that can be divided spatially',
  altLabels: ['aureole', 'selvage'],
  broaderLabel: 'non-pervasive',
  childLabels: ['zoned-central', 'zoned-inner', 'zoned-outer'],
} as const

/** A searchable concept (verified via Orama search in E2E debug) */
export const SEARCH_CONCEPT = {
  /** "fault" returns 4 results in Orama, "zoned" returns 3 */
  query: 'fault',
} as const

/** Mock GitHub API response helpers */
export const GITHUB = {
  user: {
    login: 'test-user',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    name: 'Test User',
  },
  token: 'mock-gh-token-for-e2e',
} as const
