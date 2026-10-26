/**
 * Minimal replace-on-write snapshot store: the settings tab keeps one stable
 * state reference, swaps it on every update, and notifies subscribers. The
 * renderer binds it as the tab's `useMarkitdownSettings` hook.
 */

/** One snapshot cell with subscribe/notify semantics. */
export interface SnapshotStore<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
  update(recipe: (draft: T) => void): void
}

/**
 * Create a store seeded with `initial`; `update` mutates a shallow copy so the
 * previous snapshot reference stays intact.
 */
export function createSnapshotStore<T extends object>(initial: T): SnapshotStore<T> {
  let snapshot = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    update(recipe) {
      const draft: T = Array.isArray(snapshot)
        ? ([...snapshot] as T)
        : ({ ...snapshot })
      recipe(draft)
      snapshot = draft
      for (const listener of listeners) listener()
    },
  }
}
