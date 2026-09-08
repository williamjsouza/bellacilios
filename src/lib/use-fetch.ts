'use client'

import { useEffect, useState } from 'react'

export function useFetch<T = any>(url: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(!!url)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    if (!url) { setData(null); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Erro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
     
  }, [url, ...deps])

  return { data, loading, error, reload, setData }
}

export async function apiPost(url: string, body: any, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
  return j
}
