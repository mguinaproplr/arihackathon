// Skim — small client-side helpers used across multiple components.

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// "Build a Foo module in ARI that does X." → "does X."
// Safe even when the module name contains regex metacharacters.
export function stripInspirationPrefix(inspiration: string, moduleName: string): string {
  if (!moduleName) return inspiration
  const pattern = new RegExp(`^\\s*Build a ${escapeRegExp(moduleName)} module in ARI that\\s+`, 'i')
  const cleaned = inspiration.replace(pattern, '')
  return cleaned === inspiration ? inspiration : cleaned
}

// Returns the first validation error message or null. Matches the server
// Zod rules so client-side errors stay in sync with the server.
export function validateHttpUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return 'URL is required'
  try {
    const parsed = new URL(trimmed)
    if (!/^https?:$/i.test(parsed.protocol)) return 'URL must start with http:// or https://'
  } catch {
    return 'That doesn’t look like a valid URL'
  }
  return null
}
