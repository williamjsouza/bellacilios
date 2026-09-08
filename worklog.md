# Worklog — Bella Lash ERP

Este arquivo é compartilhado entre todos os agentes. Cada agente deve:
1. Ler este arquivo antes de começar.
2. Acrescentar uma nova seção (começando com `---`) ao final após concluir sua tarefa.

---
Task ID: 1
Agent: main (Arquiteto)
Task: Fundação do sistema — schema Prisma completo, NextAuth, RBAC, layout principal, seed com dados demo, dashboard, CRM (clientes + ficha + timeline + fotos + lash mapping editor).

Work Log:
- Definido schema Prisma com ~35 modelos (User, Professional, Client, ClientPhoto, ClientDocument, ServiceCategory, Service, ServiceProfessional, ServicePrice, ServiceProductConsumption, PostCareConfig, Appointment, Procedure, ProcedureConsumption, LashMapping, ProductCategory, Supplier, Product, StockMovement, Quote, QuoteItem, Sale, SaleItem, Payment, AccountReceivable, AccountPayable, CashRegister, CashMovement, Commission, MessageTemplate, WhatsappMessage, Notification, AuditLog, Setting).
- `bun run db:push` executado com sucesso.
- Tema visual criado em globals.css (rosé-gold + deep-plum para identidade beleza/estética).
- NextAuth (Credentials) + hash scrypt em `src/lib/auth-hash.ts` e `src/lib/auth.ts`.
- RBAC em `src/lib/session.ts` com matrix de permissões por módulo×role.
- Seed em `src/lib/seed-data.ts`: admin/gestor/recep/lash/fin users, 4 profissionais, 6 categorias, 16 serviços, 12 produtos, 1 fornecedor, 6 clientes demo, agendamentos de hoje/próximos, 4 procedimentos finalizados (gerando manutenções), lash mapping default, contas a pagar.
- Página `/` com SessionProvider, auto-seed, login screen com branding, AppShell.
- Sidebar (com grupos principal/operacao/gestao + RBAC), Topbar (busca global + notificações dinâmicas), PendingAlertsModal (mostra pendências ao login).
- APIs criadas: /api/seed, /api/auth/[...nextauth], /api/clients (GET, POST), /api/clients/[id] (GET, PUT, DELETE), /api/clients/[id]/timeline, /api/clients/[id]/photos, /api/professionals, /api/services, /api/appointments, /api/appointments/[id], /api/procedures, /api/procedures/[id], /api/lash-mappings, /api/dashboard, /api/search, /api/notifications, /api/notifications/[id]/read, /api/alerts/pending.
- Módulo Dashboard com KPIs, alertas, gráfico de faturamento 7 dias, top profissionais, agenda de hoje, manutenções pendentes, aniversariantes, resumo financeiro, top serviços.
- Módulo Clientes: listagem com busca/filtro, formulário completo (pessoal/estética/cílios), detalhe com timeline, fotos (upload base64), mapping editor visual, WhatsApp quick actions.

Stage Summary:
- Base sólida: auth + RBAC + DB + layout + dashboard + CRM totalmente funcionais.
- Contas demo: admin@bella.com/admin123, gestor@bella.com/gestor123, lash@bella.com/lash123, fin@bella.com/fin123, recep@bella.com/recep123.
- Próximos módulos a construir: Agenda, Cílios, Atendimento (pelo main agent); Estoque, Financeiro, Orçamentos, WhatsApp, Relatórios, Configurações (subagentes paralelos).

---

## Task ID: 8 — Módulo Financeiro

**Agent:** finance-agent
**Task:** Construir o módulo Financeiro completo (frontend + backend APIs) do Bella Lash ERP — Caixa, Contas a Receber, Contas a Pagar, Comissões e Resumo.

### Backend (APIs criadas)
- `src/app/api/finance/cash/route.ts` — GET (caixa aberto + movimentos + totais por método + saldo) e POST (abrir caixa com `openingAmount` OU adicionar movimento com `cashId`+`type`+`amount`+`method`+`description`). Bloqueia abrir dois caixas simultâneos.
- `src/app/api/finance/cash/[id]/close/route.ts` — POST fecha o caixa: recebe `countedAmounts {dinheiro, pix, cartao}`, calcula esperado vs contado, `difference`, seta `status='fechado'`, `closedAt=now`, `closingAmount`, `notes`.
- `src/app/api/finance/receivable/route.ts` — GET lista com `?status=aberta|paga|vencida` (marca vencida automaticamente quando `dueDate < today`), inclui `client` e `sale`, retorna `totalOpen`. POST cria com `description, amount, dueDate, clientId?`.
- `src/app/api/finance/receivable/[id]/route.ts` — PUT marca como paga (`paidAt=now`, `status='paga'`, `method`). DELETE.
- `src/app/api/finance/payable/route.ts` — GET lista com `?status=`, inclui `supplier`, marca vencida, retorna `totalOpen`. POST cria com `description, amount, dueDate, category, supplierId?, costCenter?`.
- `src/app/api/finance/payable/[id]/route.ts` — PUT marca paga, DELETE.
- `src/app/api/finance/commissions/route.ts` — GET lista com `?status=aberta|paga` e range `?from=&to=`, inclui `professional`, `procedure` (com service+client) e `sale`. Retorna `totalToPay`. POST marca como paga em lote via `ids[]` (updateMany filtrando `status='aberta'`).
- `src/app/api/finance/summary/route.ts` — GET resumo mensal: `receitas` (payments + receivables paid no mês), `despesas` (payables paid + commissions paid no mês), `lucro`, array `days[]` (7 dias com entradas/saídas), `expensesByCategory[]` (payables pagos no mês agrupados por categoria).
- `src/app/api/suppliers/route.ts` — GET lista fornecedores (suporte ao dropdown do formulário de contas a pagar).

Todas as rotas fazem `await getSessionUser()` primeiro e usam `try/catch` com `errorResponse(e)`. Audit log gravado em operações de escrita.

### Frontend (`src/components/modules/financeiro.tsx`)
Componente único exportado por default, com 5 abas (Tabs do shadcn/ui):

1. **Caixa** — Estado "caixa fechado" com card central e botão "Abrir caixa" (dialog com `openingAmount`). Quando aberto: header com data/operador da abertura, 4 cards (abertura/entradas/saídas/saldo), totais por método (dinheiro, pix, cartao, credito, debito...), tabela de movimentos (scroll `max-h-96`), botões Suprimento/Sangria/Movimento avulso (dialog com tipo+valor+método+descrição) e Fechar caixa (dialog com conferência: esperado por método, contado por método, diferença colorida verde/vermelho).
2. **Contas a Receber** — Filtro por status, total a receber no topo, tabela (cliente, descrição, vencimento, valor, status badge, pago em, ações). Botões "Nova conta" (dialog com cliente opcional) e "Receber" (dialog escolher método). Delete com confirmação.
3. **Contas a Pagar** — Filtro por status, total a pagar, tabela (descrição, categoria badge, fornecedor, vencimento, valor, status, ações). Botões "Nova despesa" (dialog com select de categoria: aluguel/energia/internet/produtos/salarios/comissões/marketing/impostos/equipamentos/manutenção/outros, fornecedor opcional, centro de custo) e "Pagar".
4. **Comissões** — Filtro aberta/paga, agrupamento por profissional (card por profissional com subtotal), tabela por profissional com checkbox multi-seleção (toggle individual + toggle all), botão "Pagar selecionadas (N)" com total selecionado, batch mark paid.
5. **Resumo** — 3 cards (Receitas/Despesas/Lucro do mês), gráfico de barras Recharts dos últimos 7 dias (entradas vs saídas), gráfico de pizza Recharts das despesas por categoria do mês.

### Convenções seguidas
- Cores: sem indigo/azul — usa `emerald-600` (positivo), `red-600` (negativo), `amber` (aberta), `primary` (rosé/plum do tema). Status badges coloridos via classes Tailwind.
- Imports via alias `@/`. Componentes exclusivamente do `@/components/ui/`. `useToast` para feedback. `useFetch`/`apiPost` de `@/lib/use-fetch`. `formatCurrency`/`formatDate`/`formatDateTime`/`formatTime` de `@/lib/format`.
- Loading skeletons (`Skeleton` + `SkeletonTable` helper). Responsivo: tabelas com `overflow-x-auto`, grids `grid-cols-1 md:grid-cols-*`, abas com `flex-wrap`.
- Métodos de pagamento: dinheiro, pix, credito, debito, transferencia, boleto, outro.

### Lint & dev server
- `bun run lint`: arquivos do Task 8 limpos (0 erros). Os 2 erros restantes são em `estoque.tsx` e `lash-mapping-editor.tsx` (pré-existentes, fora do escopo).
- Dev server compila os novos módulos sem erros.

### Notas para próximos agentes
- O schema Prisma não foi alterado (modelos já existiam). Sem necessidade de `db:push`.
- Para pagar comissões em lote, o frontend envia `ids[]` e o backend faz `updateMany` filtrando `status='aberta'` para segurança.
- O resumo mensal considera receitas = payments (vendas) + receivables pagos no mês; despesas = payables pagos + commissions pagos no mês.
- O caixa computa o saldo por método somando entradas (entrada/suprimento) e subtraindo saídas (saida/sangria); o valor de abertura entra como dinheiro.

---
Task ID: 7
Agent: Estoque Module (subagent)
Task: Construção completa do módulo Estoque — APIs backend (produtos, fornecedores, movimentações, categorias) + frontend com 4 abas (Produtos, Movimentações, Fornecedores, Categorias), dialogs de formulário, tabela com filtros, badges de estoque baixo, KPIs, transações de movimento de estoque.

Work Log:
- APIs criadas:
  - `src/app/api/products/route.ts` — GET (listagem com `?q=` busca por nome/código/marca/barcode e `?categoryId=` filtro, `?active=1` opcional; inclui category & supplier) + POST (create/update com `id`).
  - `src/app/api/products/[id]/route.ts` — GET (detalhe) + DELETE (protege exclusão quando há movimentações vinculadas, retornando erro 400 explicativo).
  - `src/app/api/products/categories/route.ts` — GET (lista com `_count` de produtos) + POST (create/update com `id`).
  - `src/app/api/suppliers/route.ts` — GET (lista com `_count` de produtos + `?q=` busca) + POST (create/update com `id`).
  - `src/app/api/stock/movements/route.ts` — GET (lista recente 100, `?productId=` filtro, `?limit=` ajustável até 500; inclui product+category) + POST (cria movimentação). Lógica de cálculo:
    - `entrada`/`suprimento`: soma ao estoque; se informados, atualiza `lot`, `expiryDate`, `cost` do produto.
    - `saida`/`perda`/`vencimento`/`consumo`: subtrai do estoque.
    - `ajuste`: define estoque final = `quantity`.
    - Tudo em `db.$transaction` para atomicidade; registra `createdBy` via `getSessionUser()`; cria AuditLog.
  - Todas chamam `await getSessionUser()` primeiro e usam try/catch com `errorResponse(e)`.
- Frontend `src/components/modules/estoque.tsx` (~1100 linhas, default export):
  - **Tab Produtos**: 4 KPIs (total, estoque baixo, valor em estoque, fornecedores), busca + filtro por categoria, tabela com colunas (produto, categoria, fornecedor, estoque com badge "baixo" quando `stock <= minStock`, estoque mínimo, custo, preço, lote, validade com alerta amber quando vence em <30 dias, ações). Linhas com fundo amber claro quando estoque baixo. Botões: "Novo produto", editar, "Movimentar" e excluir (com confirmação AlertDialog). Skeletons no loading, EmptyState quando vazio.
  - **Tab Movimentações**: lista cronológica (mais recente primeiro), filtro por produto, badge colorido por tipo (entrada=verde, saída=rosé, ajuste=amber, perda/vencimento=destructivo), ícone TrendingUp/Down/Settings2, quantidade com sinal +/- ou "=" para ajuste, motivo, usuário e data/hora. Tabela com overflow-x-auto no mobile.
  - **Tab Fornecedores**: grid de cards com companyName, tradeName, badges CNPJ/CPF/contador de produtos, contato/telefone/whatsapp/email/endereço com ícones, observações. Botão Novo + editar.
  - **Tab Categorias**: grid de cards com ícone Layers, nome e contador de produtos. Diálogo simples para criar/editar.
- Componentes auxiliares reutilizáveis no mesmo arquivo: `Field` (label + children), `KpiCard`, `EmptyState`. Sub-componentes internos `ProductFormInner`, `MovementFormInner`, `SupplierFormInner` usando `useState` initializer (sem useEffect — passam no lint `react-hooks/set-state-in-effect`).
- Dialogs: `ProductFormDialog` (todos os campos: name*, code, barcode, categoryId, supplierId, brand, unit, lot, expiryDate, cost, price, stock, minStock, active com Switch), `MovementFormDialog` (productId*, type*, quantity*, reason; em entradas mostra campos extras lot/expiryDate/cost e preview "Estoque atual → Após"), `SupplierFormDialog` (companyName*, tradeName, cnpj, cpf, phone, whatsapp, email, address, contact, observations).
- Feedback: `useToast` para sucesso/erro em todas as operações. Loading states com Skeleton e Loader2 spinner. Cores apenas via variáveis Tailwind (primary/rosé-gold/plum), sem indigo/azul. Responsivo (grid colapsa em mobile, tabelas com `overflow-x-auto scroll-thin`).
- Lint: `bun run lint` — 0 erros no arquivo `estoque.tsx` e nas APIs criadas. (Erros remanescentes são pré-existentes em `lash-mapping-editor.tsx` da Task 1 e warning em `use-fetch.ts`.)
- Dev server: compila sem erros, APIs respondendo 200 nas rotas novas.

Stage Summary:
- Módulo Estoque totalmente funcional e persistente: criar/editar/excluir produtos, registrar movimentações de entrada/saída/ajuste/perda/vencimento (com transação que atualiza estoque e registra quem fez), gerenciar fornecedores e categorias.
- Pronto para integração com futuros módulos: `ServiceProductConsumption` (ficha técnica) e `ProcedureConsumption` poderão criar movimentações tipo `consumo` reaproveitando a API `/api/stock/movements`.
- Próximos módulos sugeridos: Financeiro (Task 8), Orçamentos (Task 9), Relatórios (Task 10), WhatsApp (Task 11), Configurações (Task 12).

---
Task ID: 4-6, 9-11
Agent: main (Arquiteto)
Task: Módulos Agenda, Cílios, Atendimento (construídos pelo main) + Orçamentos, WhatsApp, Relatórios, Configurações (construídos pelo main) + APIs correspondentes. Subagentes construíram Estoque (Task 7) e Financeiro (Task 8).

Work Log:
- Agenda: view Dia/Semana, filtro por profissional, formulário de agendamento com detecção de conflito de horário, mudança de status (confirmar/cancelar), ações rápidas (atender, WhatsApp, ver ficha).
- Cílios (Lash): tab Manutenções (alertas de manutenção vencida com ações WhatsApp/Agendar/Adiar), tab Procedimentos (histórico com técnica/curvatura/mapping), tab Técnicas (CRUD de técnicas e efeitos via settings).
- Atendimento: fluxo de 6 passos (Ficha → Procedimento → Consumo → Fotos → Pagamento → Finalizar) com apply de mapping padrão, ficha técnica automática, cálculo de próxima manutenção, baixa de estoque ao finalizar, geração de comissão.
- Orçamentos: listagem com filtros, formulário com itens (serviços + personalizados), desconto/acréscimo, envio por WhatsApp, conversão em venda.
- WhatsApp: central de mensagens, templates editáveis, fila/status, envio com renderização de variáveis {{nome}}, {{empresa}}, etc.
- Relatórios: KPIs (receita, despesas, lucro, ticket médio, taxas de retorno/cancelamento/faltas/ocupação), gráficos (procedimentos mais realizados, faturamento por profissional), filtro por período.
- Configurações: dados da empresa, integração WhatsApp (provider agnóstico), técnicas de cílios, automações (toggles), auditoria (LGPD).
- Auth refatorada: removido next-auth (causava OOM no ambiente), implementada auth simples com cookie httpOnly + token base64 (userId:role:uuid). APIs /api/auth/login, /logout, /me.
- AppShell refatorado para lazy load de módulos (reduz memória inicial).
- Módulos lazy-loaded via React.lazy + Suspense.

Stage Summary:
- TODOS os 11 módulos funcionais e conectados ao banco: Dashboard, Agenda, Clientes (CRM), Cílios, Atendimento, Estoque, Financeiro, Orçamentos, WhatsApp, Relatórios, Configurações.
- Verificado com Agent Browser: login funciona, dashboard carrega com KPIs reais, navegação entre módulos funcional, ficha de cliente com tabs, agenda com view dia/semana, etc.
- Lint: 0 errors, 0 warnings.
- Servidor dev estável após aquecer rotas.
- Contas demo: admin@bella.com/admin123 (e outras 4).
