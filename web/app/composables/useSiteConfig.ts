export function useSiteConfig() {
  const appConfig = useAppConfig()
  return computed(() => ({
    name: 'Prez Lite',
    logo: null as string | null,
    icon: 'i-heroicons-book-open',
    tagline: 'Vocabulary Publishing Platform',
    footerText: 'An open source vocabulary publishing system',
    footerLinks: [] as Array<{ label: string; href: string }>,
    siteHeaderBreadcrumbs: false,
    ...appConfig.site
  }))
}
