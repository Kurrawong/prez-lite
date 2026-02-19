import type { InjectionKey, Ref } from 'vue'

const FLUID_KEY = Symbol('fluid-layout') as InjectionKey<Ref<boolean>>

/**
 * Called by the layout to provide the fluid toggle.
 * Returns the reactive ref so the layout can bind to it.
 */
export function provideFluidLayout(): Ref<boolean> {
  const fluid = ref(false)
  provide(FLUID_KEY, fluid)
  return fluid
}

/**
 * Called by pages to control the layout width.
 * Returns the reactive ref — set `.value = true` for full-width.
 */
export function useFluidLayout(): Ref<boolean> {
  const fluid = inject(FLUID_KEY)
  if (!fluid) {
    console.warn('[useFluidLayout] No fluid layout provider found. Using local fallback.')
    return ref(false)
  }
  return fluid
}
