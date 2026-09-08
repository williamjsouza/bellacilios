'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, Sparkles, Heart, Stethoscope } from 'lucide-react'

export default function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<any> }) {
  const [email, setEmail] = useState('admin@bella.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onLogin(email, password)
    } catch (err: any) {
      setError(err.message || 'Email ou senha inválidos. Verifique e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[oklch(0.55_0.18_350)] via-[oklch(0.5_0.16_320)] to-[oklch(0.35_0.12_300)] p-12 flex-col justify-between text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 40%)' }} />
        <div className="relative z-10 flex flex-col items-start gap-4">
          <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-2xl border border-white/30 max-w-xs sm:max-w-sm transition-transform hover:scale-[1.02]">
            <img
              src="/img/logo.png"
              alt="Studio Jéssica Novais - Lash Designer"
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Studio Jéssica Novais</h1>
            <p className="text-white/80 text-sm font-medium">ERP de Estética & Beleza</p>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Gestão completa para<br />o seu studio de beleza
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            Agenda inteligente, ficha de cílios especializada, CRM, financeiro, estoque e WhatsApp — tudo integrado.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { icon: Eye, label: 'Cílios' },
              { icon: Heart, label: 'CRM' },
              { icon: Stethoscope, label: 'Atendimento' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-white/10 backdrop-blur p-4 flex flex-col items-center gap-2">
                <f.icon className="w-6 h-6" />
                <span className="text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-white/70 text-xs">© 2026 Studio Jéssica Novais ERP · Sistema de Gestão para Clínicas de Estética</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md shadow-xl border-border/60">
          <CardHeader className="space-y-1">
            <div className="lg:hidden flex flex-col items-center gap-2 mb-3">
              <div className="bg-white p-3 rounded-xl shadow-md border border-border flex items-center justify-center max-w-[200px]">
                <img
                  src="/img/logo.png"
                  alt="Studio Jéssica Novais"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <span className="font-bold text-sm text-foreground">Studio Jéssica Novais</span>
            </div>
            <CardTitle className="text-2xl text-center">Bem-vinda de volta</CardTitle>
            <CardDescription className="text-center">Acesse o painel de gestão do seu studio</CardDescription>
            <div className="flex justify-center pt-6 pb-2">
              <img
                src="/img/logo.png"
                alt="Studio Jéssica Novais"
                className="h-16 w-auto object-contain"
              />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
