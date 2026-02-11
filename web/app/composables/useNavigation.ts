export function useNavigation() {
  const { data: navPages } = useAsyncData('navigation', async () => {
    const pages = await queryCollection('pages').all()
    return pages
      .filter(p => p.navigation === true)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  })

  const navLinks = computed(() =>
    (navPages.value ?? []).map(page => ({
      label: page.navTitle || page.title,
      to: page.path === '/index' ? '/' : page.path
    }))
  )

  return { navLinks }
}
