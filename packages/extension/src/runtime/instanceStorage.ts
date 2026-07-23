const PREFIX = "yindex.pkg.inst."

export const instanceStorage = {
  async get(key: string): Promise<unknown> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const full = PREFIX + key
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(full, (result) => {
          const err = chrome.runtime.lastError
          if (err) reject(new Error(err.message))
          else resolve(result[full])
        })
      })
    }
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as unknown) : undefined
  },
  async set(key: string, value: unknown): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const full = PREFIX + key
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [full]: value }, () => {
          const err = chrome.runtime.lastError
          if (err) reject(new Error(err.message))
          else resolve()
        })
      })
    }
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  },
  async remove(key: string): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const full = PREFIX + key
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(full, () => {
          const err = chrome.runtime.lastError
          if (err) reject(new Error(err.message))
          else resolve()
        })
      })
    }
    localStorage.removeItem(PREFIX + key)
  },
}
