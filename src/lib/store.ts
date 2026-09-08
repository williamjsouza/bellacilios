import { create } from 'zustand'

export type ModuleKey =
  | 'dashboard' | 'clients' | 'agenda' | 'lash' | 'atendimento'
  | 'estoque' | 'financeiro' | 'orcamentos' | 'whatsapp'
  | 'relatorios' | 'configuracoes' | 'servicos' | 'colaboradores'
  | 'usuarios' | 'comissoes'

interface AppState {
  activeModule: ModuleKey
  clientId: string | null   // cliente selecionado (ficha)
  procedureId: string | null
  appointmentId: string | null
  page: string // sub-página dentro do módulo
  setModule: (m: ModuleKey) => void
  openClient: (id: string) => void
  openAtendimento: (appointmentId: string) => void
  setPage: (p: string) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: 'dashboard',
  clientId: null,
  procedureId: null,
  appointmentId: null,
  page: 'list',
  setModule: (m) => set({ activeModule: m, page: 'list', clientId: null, procedureId: null, appointmentId: null }),
  openClient: (id) => set({ activeModule: 'clients', page: 'detail', clientId: id }),
  openAtendimento: (id) => set({ activeModule: 'atendimento', page: 'form', appointmentId: id }),
  setPage: (p) => set({ page: p }),
  reset: () => set({ activeModule: 'dashboard', page: 'list', clientId: null, procedureId: null, appointmentId: null }),
}))
