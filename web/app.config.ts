export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'slate',
      neutral: 'slate'
    }
  },
  site: {
    name: 'Prez Lite',
    logo: null as string | null,
    icon: 'i-heroicons-book-open',
    tagline: 'Vocabulary Publishing Platform',
    footerText: 'An open source vocabulary publishing system',
    footerLinks: [
      { label: 'GitHub', href: 'https://github.com/hjohns/prez-lite' },
      { label: 'Documentation', href: '/about' }
    ]
  }
})
