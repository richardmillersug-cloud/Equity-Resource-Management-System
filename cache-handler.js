// Simple cache handler to prevent chunk loading issues
export default class CacheHandler {
  constructor(options) {
    this.options = options;
  }

  async get(key) {
    return null;
  }

  async set(key, data, { revalidate } = {}) {
    // No-op in development
  }

  async revalidateTag(tag) {
    // No-op in development
  }
}
