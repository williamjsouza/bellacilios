# Bella Cílios ERP

O **Bella Cílios ERP** é um sistema completo de gestão, agendamento e controle de procedimentos para clínicas de estética e lash designers, desenvolvido com uma arquitetura moderna, responsiva e de alta performance.

---

## 🚀 Tecnologias e Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização e UI:** [Tailwind CSS v4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) (Radix UI)
- **Banco de Dados:** SQLite via [Prisma ORM](https://www.prisma.io/)
- **Autenticação:** [NextAuth.js](https://next-auth.js.org/)
- **Gerenciador de Processos:** [PM2](https://pm2.keymetrics.io/)
- **Servidor Web / Proxy Reverso:** [OpenLiteSpeed](https://openlitespeed.org/) no [aaPanel](https://www.aapanel.com/)

---

## 📁 Estrutura do Projeto

```text
├── db/                   # Diretório onde fica armazenado o banco SQLite (custom.db)
├── prisma/               # Esquema do banco de dados (schema.prisma) e migrações
├── public/               # Ativos estáticos (imagens, ícones)
├── src/
│   ├── app/              # Rotas do Next.js App Router (páginas e API)
│   ├── components/       # Componentes de interface (UI e Shadcn)
│   └── lib/              # Funções utilitárias e conexão com o banco (Prisma)
├── .htaccess             # Regras de reescrita / Reverse Proxy para OpenLiteSpeed
├── ecosystem.config.js   # Configuração do processo PM2 para produção
├── deploy.sh             # Script automatizado de atualização e deploy
└── package.json          # Dependências e scripts do projeto
```

---

## 💻 Desenvolvimento Local

Certifique-se de ter o **Node.js 20+** instalado em sua máquina.

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/williamjsouza/bellacilios.git
   cd bellacilios
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure o arquivo `.env`:**
   Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Prepare o banco de dados (Prisma):**
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:3000`

---

## 🌐 Implantação em Produção (aaPanel + OpenLiteSpeed)

Esta aplicação é executada diretamente com **Node.js** gerenciado pelo **PM2**, com o **OpenLiteSpeed** atuando como proxy reverso para entregar alta velocidade e suporte HTTP/2 / HTTP/3.

### 1. Pré-requisitos no aaPanel

1. No **App Store** do aaPanel, verifique se estão instalados:
   - **OpenLiteSpeed** (como servidor web principal do painel).
   - **Node.js Version Manager** (ou instale o Node.js v20+ LTS no servidor).
   - **PM2 Manager** (instalado pelo App Store ou via terminal com `npm install -g pm2`).

---

### 2. Criar o Site no aaPanel

1. No menu lateral do aaPanel, clique em **Website** -> **Add site**.
2. **Domain:** Preencha com o domínio ou subdomínio da clínica (ex: `app.bellacilios.com.br`).
3. **Root Directory:** O padrão será `/www/wwwroot/app.bellacilios.com.br` (ou configure para a pasta desejada).
4. Em **PHP Version**, pode selecionar *Pure / No PHP*.
5. Clique em **Submit**.

---

### 3. Clonar o Projeto e Configurar o `.env`

Acesse o servidor via SSH ou use o Terminal do aaPanel:

```bash
cd /www/wwwroot/app.bellacilios.com.br
git clone https://github.com/williamjsouza/bellacilios.git .
```

Crie o arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
nano .env
```

Defina as variáveis essenciais:
```env
DATABASE_URL="file:../db/custom.db"
PORT=3000
NODE_ENV=production
NEXTAUTH_SECRET="gerar_chave_aleatoria_longa"
```
*(Você pode gerar um segredo forte com o comando: `openssl rand -base64 32`)*

---

### 4. Instalar, Construir e Iniciar no PM2

No diretório do projeto, execute:

```bash
# 1. Instalar dependências
npm install --production=false

# 2. Gerar cliente do Prisma e criar tabelas no SQLite
npx prisma generate
npx prisma db push --accept-data-loss

# 3. Gerar o build de produção do Next.js
npm run build

# 4. Iniciar o processo com o PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

> [!IMPORTANT]
> **Atenção ao SQLite:** O arquivo `ecosystem.config.js` está configurado com `instances: 1` (modo *fork*). Como o SQLite é um banco baseado em arquivo local, manter apenas 1 instância do Node.js é essencial para evitar concorrência e travas no banco de dados.

---

### 5. Configurar o Proxy Reverso no OpenLiteSpeed

Para que as requisições do seu domínio cheguem até o Next.js na porta **3000**:

#### Opção A (Recomendada - Via Interface do aaPanel):
1. Vá em **Website** -> clique no nome do seu site -> **Reverse Proxy** -> **Add Reverse Proxy**.
2. **Proxy Name:** `nextjs`
3. **Target URL:** `http://127.0.0.1:3000`
4. **Sent Domain:** `$host`
5. Clique em **Submit**.

#### Opção B (Via `.htaccess`):
O projeto já inclui o arquivo `.htaccess` configurado para direcionar o tráfego para a porta 3000 mantendo o suporte a renovação SSL e WebSockets.

---

### 6. Configurar Certificado SSL (HTTPS)

1. No aaPanel, vá em **Website** -> clique no seu site -> **SSL**.
2. Selecione a aba **Let's Encrypt**.
3. Marque os seus domínios e clique em **Apply**.
4. Ative a opção **Force HTTPS** para redirecionar todo o tráfego automaticamente para HTTPS.

---

### 7. Atualizações e Novos Deploys

Sempre que houver atualizações na branch `main`, basta rodar o script `deploy.sh` na pasta do site:

```bash
bash deploy.sh
```

Esse script realiza de forma automática:
- `git pull origin main`
- Instalação de eventuais novas dependências
- Atualização do schema do banco SQLite via Prisma
- Build de produção (`npm run build`)
- Recarregamento sem downtime no PM2 (`pm2 reload ecosystem.config.js`)

---

## 🔐 Recomendações de Segurança

1. **Arquivo do Banco de Dados:** O arquivo `db/custom.db` é ignorado no Git e nunca deve ser exposto publicamente. Assegure que as permissões da pasta `db/` estejam adequadas para o usuário do processo Node.
2. **Criação de Usuário Inicial:** Utilize a página `/setup` para criar o usuário administrador inicial em ambiente de produção. Após a criação do primeiro admin, a página de setup é bloqueada automaticamente.
