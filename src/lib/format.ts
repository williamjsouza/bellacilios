export function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

export function formatDate(d: Date | string | null): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function formatDateTime(d: Date | string | null): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

export function formatTime(d: Date | string | null): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function ageFromBirth(birth: Date | string | null): number | null {
  if (!birth) return null
  const d = typeof birth === 'string' ? new Date(birth) : birth
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export function isBirthday(birth: Date | string | null): boolean {
  if (!birth) return false
  const d = typeof birth === 'string' ? new Date(birth) : birth
  const today = new Date()
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth()
}

export function upcomingBirthday(birth: Date | string | null, withinDays = 7): boolean {
  if (!birth) return false
  const d = typeof birth === 'string' ? new Date(birth) : birth
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextBday = new Date(today.getFullYear(), d.getMonth(), d.getDate())
  if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1)
  const diff = Math.round((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 && diff <= withinDays
}

export function getBirthdayThisMonth(birth: Date | string | null): boolean {
  if (!birth) return false
  const d = typeof birth === 'string' ? new Date(birth) : birth
  return d.getMonth() === new Date().getMonth()
}

export function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
