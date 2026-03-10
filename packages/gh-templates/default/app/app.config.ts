export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'slate',
      neutral: 'slate'
    }
  },
  site: {
    name: 'My Vocabularies',
    logo: null as string | null,
    icon: 'i-heroicons-book-open',
    tagline: 'Vocabulary Publishing Platform',
    footerText: 'Published with prez-lite',
    footerLinks: [
      { label: 'About', href: '/about' }
    ],
    editor: {
      defaultMode: 'inline' as 'inline' | 'full'
    },
    promotion: {
      enabled: true
    }
  }
})
