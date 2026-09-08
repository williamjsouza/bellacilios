import { ModuleKey } from '@/lib/store'
import {
  LayoutDashboard, Users, CalendarDays, Eye, Stethoscope,
  Package, Wallet, FileText, MessageCircle, BarChart3, Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavModule {
  key: ModuleKey
  label: string
  icon: LucideIcon
  roles: string[] // quem pode ver no menu
  group: 'principal' | 'operacao' | 'gestao'
}

export const NAV_MODULES: NavModule[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','gestor','recepcionista','profissional','financeiro'], group: 'principal' },
  { key: 'agenda', label: 'Agenda', icon: CalendarDays, roles: ['admin','gestor','recepcionista','profissional','financeiro'], group: 'principal' },
  { key: 'clients', label: 'Clientes (CRM)', icon: Users, roles: ['admin','gestor','recepcionista','profissional','financeiro'], group: 'principal' },
  { key: 'lash', label: 'Cílios / Lash', icon: Eye, roles: ['admin','gestor','recepcionista','profissional'], group: 'operacao' },
  { key: 'atendimento', label: 'Atendimento', icon: Stethoscope, roles: ['admin','gestor','recepcionista','profissional'], group: 'operacao' },
  { key: 'estoque', label: 'Estoque', icon: Package, roles: ['admin','gestor','recepcionista','profissional','financeiro'], group: 'operacao' },
  { key: 'colaboradores', label: 'Equipe / Profissionais', icon: Users, roles: ['admin','gestor'], group: 'gestao' },
  { key: 'comissoes', label: 'Comissões', icon: Wallet, roles: ['admin','gestor','financeiro'], group: 'gestao' },
  { key: 'orcamentos', label: 'Orçamentos', icon: FileText, roles: ['admin','gestor','recepcionista','profissional','financeiro'], group: 'gestao' },
  { key: 'servicos', label: 'Serviços & Preços', icon: FileText, roles: ['admin','gestor','financeiro'], group: 'gestao' },
  { key: 'financeiro', label: 'Financeiro', icon: Wallet, roles: ['admin','gestor','financeiro'], group: 'gestao' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, roles: ['admin','gestor','recepcionista','profissional'], group: 'gestao' },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3, roles: ['admin','gestor','financeiro'], group: 'gestao' },
  { key: 'usuarios', label: 'Usuários do Sistema', icon: Settings, roles: ['admin'], group: 'gestao' },
  { key: 'configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'], group: 'gestao' },
]

export const GROUP_LABELS: Record<string, string> = {
  principal: 'Principal',
  operacao: 'Operação',
  gestao: 'Gestão',
}
