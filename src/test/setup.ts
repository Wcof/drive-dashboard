// Vitest setup：happy-dom 环境下提供 localStorage
// happy-dom 已内置 localStorage，这里只做兜底确认
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] || null,
  } as Storage
}

