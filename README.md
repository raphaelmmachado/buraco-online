<div align="center">
  <h1>🃏 Buraco Online</h1>
  <p><strong>Um jogo de cartas. Jogue com bots ou com amigos. Hospede você mesmo.</strong></p>
</div>

---

## ✨ Destaques e Funcionalidades

- **Modos 2v2:** Jogue partidas em duplas sincronizadas com baixa latência via WebSockets.
- **Bots Inteligentes:** Não tem amigos online? Jogue com e contra Bots autônomos que contam com lógica heurística avançada para tomada de decisões estratégicas (compra do lixo, criação de canastras limpas/sujas, uso tático de curingas e batida no tempo certo).
- **Coringas Mágicos (Modo Especial):** Uma variação caótica e inovadora que introduz poderes especiais aleatórios nas partidas!

---

## 🚀 Guia Rápido: Como Jogar e Hostear no seu PC

Se você deseja rodar o jogo no seu computador de forma rápida e prática, seja para testar contra os **Bots** ou jogar com amigos conectados na mesma rede (LAN/Wi-Fi):

### 1. Pré-requisitos

- Ter o **[Node.js](https://nodejs.org/)** (v18+) ou **[Bun](https://bun.sh/)** instalado no sistema.

### 2. Passo a Passo

Abra o terminal na pasta do projeto e execute os comandos de acordo com seu ambiente:

**Com Bun:**

```bash
# 1. Instalar as dependências
bun install

# 2. Compilar e rodar o Servidor Integrado (Modo Host na porta 3000)
bun run host
```

**Com Node.js (npm):**

```bash
# 1. Instalar as dependências
npm install

# 2. Compilar e rodar o Servidor Integrado (Modo Host na porta 3000)
npm run host
```

**Pronto!** 🚀 Abra **`http://localhost:3000`** no seu navegador.

> _Nota:_ O comando `host` (`bun run host` ou `npm run host`) compila o frontend e faz com que o servidor Backend exiba tanto a interface web quanto conecte na lógica de jogo e multiplayer na mesma porta (3000).

---

## 🌐 Como Hospedar para Amigos à Distância (Multiplayer Online)

Quer chamar seus amigos para jogar da casa deles com link direto?

### 🌟 Opção 1: Modo Túnel (Rápido, Gratuito e Zero Configuração)

Usando ferramentas de túnel seguras, você expõe a porta `3000` da sua máquina e ganha um link HTTPS compartilhável:

1. Deixe o jogo rodando no terminal do seu computador com o comando:
   ```bash
   bun run host
   ```
2. Abra outro terminal e crie o túnel em segundos via **Cloudflare Tunnels** ou **Ngrok**:
   - **Via Ngrok** (Se tiver instalado):
     ```bash
     ngrok http 3000
     ```
   - **Via Cloudflare** (Sem conta necessária):
     ```bash
     npx cloudflared tunnel --url http://localhost:3000
     ```

3. O terminal gerará um link HTTPS seguro (exemplo: `https://seu-jogo.ngrok-free.app` ou `https://seu-jogo.trycloudflare.com`). **Envie esse link aos seus amigos**! O frontend tem detecção de URL inteligente e sincronizará automaticamente.

---

### ☁️ Opção 2: Hospedagem 24/7 na Nuvem (Render / Docker)

Se quiser que o servidor fique online noite e dia na internet em plataformas gratuitas como o **[Render.com](https://render.com/)**:

#### Método Recomendado: Serviço Único (All-in-One no Render)

1. Crie um novo **Web Service** no console do Render conectando o seu GitHub.
2. Configure as opções de Build e Run:
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     bun install && bun run build && cd server && bun install
     ```
   - **Start Command:**
     ```bash
     cd server && bun run server:dist
     ```
3. O Render configurará automaticamente uma variável de porta (`PORT`). Quando terminar, basta abrir a URL HTTPS contínua gerada pelo Render para jogar de qualquer lugar!

#### Método Separado: Frontend Estático + Backend Remota

Caso você queira publicar o frontend no **Vercel / Netlify** e rodar apenas a API Backend separadamente (ex: Render ou VPS):

- Suba a pasta `server/` na nuvem executando `bun run index.ts`.
- No site Estático do Frontend (Vercel / Netlify / Render Static Site), adicione a **Variável de Ambiente** na configuração de build:
  ```env
  VITE_SERVER_URL=https://sua-api-backend-na-nuvem.com
  ```
  _(Confira os modelos nos arquivos `.env.example`)._

---

## 💻 Contribuição:

Se você quer estudar o código:

1. **Instale os pacotes principais:**

   ```bash
   bun install && cd server && bun install && cd ..
   ```

2. **Inicie os servidores de Desenvolvimento:**
   Abra dois terminais independentes na pasta raiz do repositório:

   ```bash
   # Terminal 1: Sobe o Servidor Socket.io / Backend de Desenvolvimento
   bun run dev:server

   # Terminal 2: Sobe a Interface Gráfica com Hot-Reload (Vite)
   bun run dev
   ```

3. Abra `http://localhost:5173` para testar.

---

## 📁 Estrutura da Arquitetura do Projeto

A base de código é distribuída de forma modular para fácil manutenção e escalabilidade:

```text
├── common/              # Código compartilhado de Regras, Scoring e Tipos TypeScript (Front <-> Back)
├── server/              # Backend autoritativo, Máquina de Estado, Lógicas de IA dos Bots e Rotas
│   ├── controllers/     # Controladores das Salas e Lógicas de Partida Socket.io
│   ├── state.ts         # Central de Estado em Memória da Aplicação
│   ├── server_dist.ts   # Servidor integrado que serve Frontend Produção + Socket (bun run host)
│   └── index.ts         # Servidor de Desenvolvimento da API Socket
└── src/                 # Frontend - Vite React Typescript Tailwind Zustand
    ├── components/      # UI Modular (Mesa, Cartas, Lixo, Animações, Sons, Modais de Sala)
    ├── store/           # Estado local de UI e interceptor dos pacotes WS via Zustand
    └── hooks/           # Hooks React como Áudios Dinâmicos (useGameAudio)
```
