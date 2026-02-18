export function useNavigation() {
  const { data: navigation } = useAsyncData('navigation', () =>
    queryCollectionNavigation('pages', ['navTitle', 'order', 'icon', 'description', 'redirect']),
  )

  // Transform Nuxt Content navigation tree into UNavigationMenu items
  const navLinks = computed(() => {
    if (!navigation.value) return []
    return buildMenuItems(navigation.value)
  })

  return { navLinks }
}

interface NavNode {
  title: string
  path: string
  navTitle?: string
  order?: number
  icon?: string
  description?: string
  redirect?: string
  children?: NavNode[]
}

function buildMenuItems(nodes: NavNode[]): any[] {
  return nodes
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .map((node) => {
      const item: Record<string, any> = {
        label: node.navTitle || node.title,
      }

      if (node.children?.length) {
        // Parent with children → dropdown
        item.children = node.children
          .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
          .map(child => ({
            label: child.navTitle || child.title,
            description: child.description,
            to: child.redirect || child.path,
            icon: child.icon,
          }))
      } else {
        // Leaf item → direct link
        item.to = node.path === '/index' ? '/' : node.path
      }

      return item
    })
}
