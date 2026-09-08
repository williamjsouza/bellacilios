# Bella Cílios ERP

O **Bella Cílios ERP** é um sistema de gestão e agendamento construído com tecnologias web modernas, oferecendo uma interface limpa, rápida e responsiva. O projeto foi estruturado para ser facilmente implantado utilizando contêineres Docker, sendo compatível e recomendado o uso do **EasyPanel**.

## 🚀 Tecnologias e Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização e UI:** [Tailwind CSS v4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) (Radix UI)
- **Banco de Dados:** SQLite via [Prisma ORM](https://www.prisma.io/)
- **Autenticação:** [NextAuth.js](https://next-auth.js.org/)
- **Deploy:** Docker (Next.js Standalone build) compatível com EasyPanel

## 📁 Estrutura do Projeto

O projeto segue as convenções do Next.js (App Router):

- `/src` - Código fonte principal (Páginas, Componentes, lib, hooks)
  - `/src/app` - Rotas, layouts e páginas da aplicação.
  - `/src/components` - Componentes reutilizáveis de UI (inclui Shadcn UI).
  - `/src/lib` - Utilitários, configuração do Prisma e funções auxiliares.
- `/prisma` - Esquemas do banco de dados (`schema.prisma`) e migrações.
- `/public` - Ativos estáticos e imagens.
- `/db` - Diretório criado dentro do contêiner para hospedar o banco SQLite (`custom.db`), que precisa estar num volume persistente.

## 💻 Como Rodar Localmente

Certifique-se de ter o **Node.js 20+** instalado (ou Bun).

1. Clone o repositório:
   ```bash
   git clone https://github.com/williamjsouza/bellacilios.git
   cd bellacilios
   ```

2. Instale as dependências:
   ```bash
   npm install
   # ou bun install
   ```

3. Crie um arquivo `.env` na raiz do projeto (use `.env.example` como base):
   ```env
   DATABASE_URL="file:./prisma/dev.db"
   NEXTAUTH_SECRET="seu-segredo-super-seguro"
   ```

4. Prepare o banco de dados (Prisma):
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

6. Acesse `http://localhost:3000`

---

## 🚢 Regras e Instruções de Implantação (EasyPanel)

O sistema foi preparado com um `Dockerfile` otimizado para o Next.js (modo *standalone*), criando uma imagem leve e executando migrações do Prisma automaticamente na inicialização (`docker-entrypoint.sh`).

Para implantar no **EasyPanel**, siga as configurações abaixo:

### 1. Criar a Aplicação
No seu EasyPanel, adicione um novo **App** do tipo **App (Generic)**.

### 2. Configurar o Source (Fonte)
- **Source:** Selecione `Github` e escolha este repositório (`williamjsouza/bellacilios`).
- **Build Method:** `Dockerfile`
- *(Opcional)* Se desejar, ative o Auto-Deploy na branch `main`.

### 3. Configurar Portas (Ports)
- A aplicação escuta internamente na porta **3000**.
- Configure o **Container Port** para `3000`.

### 4. Configurar Variáveis de Ambiente (Environment)
Na aba *Environment*, adicione as variáveis mínimas:

```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
DATABASE_URL=file:/app/db/custom.db
NEXTAUTH_SECRET=gere_um_segredo_forte_aqui
```
*(Você pode usar `openssl rand -base64 32` para gerar um bom NEXTAUTH_SECRET).*

### 5. Configurar Volumes (Persistência do Banco de Dados)
Como o projeto usa SQLite, é **crucial** mapear um volume persistente, caso contrário o banco de dados será deletado em cada novo deploy.

Na aba **Volumes**:
- **Type:** Volume
- **Mount Path:** `/app/db`

> **Nota importante sobre o `DATABASE_URL`:** O `Dockerfile` já prepara e garante que a pasta do banco existe em `/app/db`. O `docker-entrypoint.sh` se encarrega de rodar `npx prisma db push` no momento de subida do contêiner, garantindo que a estrutura do SQLite estará atualizada no volume montado antes do servidor Node começar a receber tráfego.

### 6. Implantar
Após salvar as configurações, clique em **Deploy**. O EasyPanel irá clonar o projeto, executar o *multi-stage build* do Docker e iniciar a aplicação perfeitamente conectada ao domínio escolhido.

---

## 🔐 Observações Finais de Segurança
- Certifique-se de que a rota de Seed (caso possua uma rota pública de inserção inicial de usuários) esteja devidamente protegida, ou use os scripts locais antes de ir para produção.
- Jamais adicione o arquivo de banco (`.db`) ou tokens/chaves privadas ao repositório. O `.gitignore` já está configurado corretamente.
