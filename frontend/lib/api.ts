export function authHeaders() {
  // Prefer cookie-based auth when AUTH_COOKIE enabled on backend.
  // JWT header fallback kept for current localStorage flow.
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const normalizeBaseUrl = (raw?: string | null) => {
  if (!raw) return ""
  const trimmed = raw.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "")
  }
  return `http://${trimmed.replace(/\/+$/, "")}`
}

function resolveInput(input: RequestInfo | URL): RequestInfo | URL {
  let base = normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL)
  if (!base && typeof window !== "undefined") {
    const protocol = window.location.protocol || "http:"
    const host = window.location.hostname
    const portFromEnv = normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "")
    if (portFromEnv) {
      base = portFromEnv
    } else {
      const explicitPort = process.env.NEXT_PUBLIC_BACKEND_PORT || (window.location.port === "3000" ? "8080" : window.location.port)
      const portSegment = explicitPort ? `:${explicitPort}` : ""
      base = `${protocol}//${host}${portSegment}`.replace(/\/+$/, "")
    }
  }
  if (typeof input === "string" && base && input.startsWith("/api/")) {
    return `${base}${input}`
  }
  return input
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const defaultHeaders: Record<string, string> = { Accept: 'application/json' }
  const headers = { ...defaultHeaders, ...(init.headers as any || {}), ...authHeaders() }
  const resolved = resolveInput(input)
  return fetch(resolved, { ...init, headers, credentials: 'include' })
}

export async function apiFetchJson<T = any>(input: RequestInfo | URL, init: RequestInit = {}, opts: { retries?: number; backoffMs?: number } = {}) {
  const { retries = 2, backoffMs = 300 } = opts
  let lastErr: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await apiFetch(input, { ...init, credentials: 'include' })
      const text = await res.text()
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      const isJson = ct.includes('application/json') || ct.includes('text/json')
      let data: T | null = null
      if (isJson) {
        if (text && text.trim().length > 0) {
          try { data = JSON.parse(text) as T } catch { data = null }
        }
      }
      return { ok: res.ok, status: res.status, data, errorText: isJson ? undefined : text }
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, backoffMs * (attempt + 1)))
        continue
      }
      throw err
    }
  }
  throw lastErr
}

export async function apiPostJson<T = any>(input: RequestInfo | URL, body: any, opts: { retries?: number; backoffMs?: number } = {}) {
  const { retries = 2, backoffMs = 300 } = opts
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  }
  // merge auth headers
  init.headers = { ...(init.headers as any), ...authHeaders() }
  let lastErr: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await apiFetch(input, { ...init, credentials: 'include' })
      const text = await res.text()
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      const isJson = ct.includes('application/json') || ct.includes('text/json')
      let data: T | null = null
      if (isJson && text && text.trim().length > 0) {
        try { data = JSON.parse(text) as T } catch { data = null }
      }
      return { ok: res.ok, status: res.status, data, errorText: isJson ? undefined : text }
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, backoffMs * (attempt + 1)))
        continue
      }
      throw err
    }
  }
  throw lastErr
}

export async function logFrontendError(message: string, stack?: string, metadata: Record<string, string> = {}) {
  try {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || ''
    const url = base ? `${base}/api/logs/error` : '/api/logs/error'
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, stack, metadata }),
    })
  } catch (e) {
    // swallow to avoid error loops
    console.warn('Failed to log frontend error', e)
  }
}
