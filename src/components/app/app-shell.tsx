'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import Sidebar from './sidebar'
import Topbar from './topbar'
import { useAppStore } from '@/lib/store'
import PendingAlertsModal from './pending-alerts-modal'

// Lazy load modules to reduce initial bundle / memory pressure
const DashboardModule = lazy(() => import('@/components/modules/dashboard'))
const ClientsModule = lazy(() => import('@/components/modules/clients'))
const AgendaModule = lazy(() => import('@/components/modules/agenda'))
const LashModule = lazy(() => import('@/components/modules/lash'))
const AtendimentoModule = lazy(() => import('@/components/modules/atendimento'))
const EstoqueModule = lazy(() => import('@/components/modules/estoque'))
const FinanceiroModule = lazy(() => import('@/components/modules/financeiro'))
const OrcamentosModule = lazy(() => import('@/components/modules/orcamentos'))
const WhatsappModule = lazy(() => import('@/components/modules/whatsapp'))
const RelatoriosModule = lazy(() => import('@/components/modules/relatorios'))
const ConfiguracoesModule = lazy(() => import('@/components/modules/configuracoes'))
const ServicosModule = lazy(() => import('@/components/modules/servicos'))
const ColaboradoresModule = lazy(() => import('@/components/modules/colaboradores'))
const UsuariosModule = lazy(() => import('@/components/modules/usuarios'))
const ComissoesModule = lazy(() => import('@/components/modules/comissoes'))

function ModSkeleton() {
  return <div className="p-6"><div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" /><div className="h-64 bg-muted rounded animate-pulse" /></div>
}

export default function AppShell({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { activeModule } = useAppStore()
  const [showPending, setShowPending] = useState(false)

  useEffect(() => {
    const key = `pending-shown-${user?.email}`
    if (!user) return
    const shown = sessionStorage.getItem(key)
    if (!shown) {
      const t = setTimeout(() => { setShowPending(true); sessionStorage.setItem(key, '1') }, 1500)
      return () => clearTimeout(t)
    }
  }, [user])

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} user={user} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <Suspense fallback={<ModSkeleton />}>
            {activeModule === 'dashboard' && <DashboardModule />}
            {activeModule === 'clients' && <ClientsModule />}
            {activeModule === 'agenda' && <AgendaModule />}
            {activeModule === 'lash' && <LashModule />}
            {activeModule === 'atendimento' && <AtendimentoModule />}
            {activeModule === 'estoque' && <EstoqueModule />}
            {activeModule === 'financeiro' && <FinanceiroModule />}
            {activeModule === 'orcamentos' && <OrcamentosModule />}
            {activeModule === 'whatsapp' && <WhatsappModule />}
            {activeModule === 'relatorios' && <RelatoriosModule />}
            {activeModule === 'configuracoes' && <ConfiguracoesModule />}
            {activeModule === 'servicos' && <ServicosModule />}
            {activeModule === 'colaboradores' && <ColaboradoresModule />}
            {activeModule === 'usuarios' && <UsuariosModule />}
            {activeModule === 'comissoes' && <ComissoesModule />}
          </Suspense>
        </main>
      </div>
      <PendingAlertsModal open={showPending} onOpenChange={setShowPending} />
    </div>
  )
}
