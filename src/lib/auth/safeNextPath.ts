// N'accepte qu'un chemin interne (« /dashboard », « /projects?x=1 »).
// Sans ce filtre, `next=@evil.com` ou `next=//evil.com` redirigeait vers un
// site externe juste après une connexion réussie (phishing).
export function safeNextPath(next: string | null, origin: string, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback
  }
  try {
    const target = new URL(next, origin)
    if (target.origin !== origin) return fallback
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return fallback
  }
}
